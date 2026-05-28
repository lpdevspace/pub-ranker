import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { firebase } from '../firebase';

/**
 * useGroupData
 * Manages real-time Firestore listeners for a given group with pagination
 * on the scores and pubs collections (the two that grow unboundedly).
 *
 * Pagination strategy:
 *   - pubs:   real-time listener, ordered by createdAt desc, limited to PAGE_SIZE.
 *             loadMorePubs() advances the cursor for the next page.
 *   - scores: real-time listener on the full collection (scores are small
 *             documents — one per rating field per user per pub). For very
 *             large groups (500+ score docs) the loadMoreScores() helper
 *             advances the cursor to fetch the next batch.
 *   - criteria, groupData, users: small collections, kept as full snapshots.
 *
 * Returns:
 *   { groupRef, groupData, pubs, criteria, rawScores, users,
 *     loadMorePubs, hasMorePubs, pubsLoading,
 *     loadMoreScores, hasMoreScores, scoresLoading }
 */

const PUBS_PAGE_SIZE   = 50;   // pubs per page
const SCORES_PAGE_SIZE = 200;  // score docs per page

export default function useGroupData({ db, groupId }) {
    const [groupData, setGroupData]   = useState(null);
    const [pubs, setPubs]             = useState([]);
    const [criteria, setCriteria]     = useState([]);
    const [rawScores, setRawScores]   = useState([]);
    const [users, setUsers]           = useState([]);

    // Pagination state
    const [pubsLoading, setPubsLoading]       = useState(true);
    const [hasMorePubs, setHasMorePubs]       = useState(false);
    const [scoresLoading, setScoresLoading]   = useState(true);
    const [hasMoreScores, setHasMoreScores]   = useState(false);

    // Cursors stored in refs so they don't trigger re-renders
    const lastPubDocRef   = useRef(null);
    const lastScoreDocRef = useRef(null);

    // Unsubscribe refs for paginated listeners so we can clean them up
    const pubsUnsubRef   = useRef(null);
    const scoresUnsubRef = useRef(null);

    // Stable serialised key for the members list — prevents the users
    // useEffect from re-firing every time Firestore re-emits the group doc
    // with a new array reference (which would otherwise cause an infinite
    // subscribe/unsubscribe loop and keep users stuck at []).
    const membersKey = useMemo(() => {
        if (!groupData) return '';
        const ids = [...new Set([
            groupData.ownerUid,
            ...(groupData.managers || []),
            ...(groupData.members  || []),
        ].filter(Boolean))].sort();
        return ids.join(',');
    }, [groupData]);

    const groupRef = useMemo(
        () => db.collection('groups').doc(groupId),
        [db, groupId]
    );

    // ── Group metadata (small doc, full real-time) ────────────────────────────────
    useEffect(() => {
        const unsub = groupRef.onSnapshot(doc => {
            if (doc.exists) setGroupData({ id: doc.id, ...doc.data() });
        });
        return () => unsub();
    }, [groupRef]);

    // ── Pubs — paginated real-time listener ───────────────────────────────────────
    const subscribeToPubs = useCallback((startAfterDoc = null) => {
        // Tear down any existing listener before creating a new one
        if (pubsUnsubRef.current) {
            pubsUnsubRef.current();
            pubsUnsubRef.current = null;
        }

        setPubsLoading(true);

        const handleSnap = (snap, append) => {
            const docs = snap.docs;
            const hasMore = docs.length > PUBS_PAGE_SIZE;
            const pageDocs = hasMore ? docs.slice(0, PUBS_PAGE_SIZE) : docs;

            if (pageDocs.length > 0) {
                lastPubDocRef.current = pageDocs[pageDocs.length - 1];
            }

            const newPubs = pageDocs.map(d => ({ id: d.id, ...d.data() }));
            setPubs(prev => append ? [...prev, ...newPubs] : newPubs);
            setHasMorePubs(hasMore);
            setPubsLoading(false);
        };

        // Try ordered query first; fall back to unordered if the index is
        // missing or any pubs lack the createdAt field.
        let query = groupRef
            .collection('pubs')
            .orderBy('createdAt', 'desc')
            .limit(PUBS_PAGE_SIZE + 1);

        if (startAfterDoc) query = query.startAfter(startAfterDoc);

        pubsUnsubRef.current = query.onSnapshot(
            snap => handleSnap(snap, !!startAfterDoc),
            err => {
                console.warn('useGroupData: pubs orderBy(createdAt) failed, falling back to unordered', err.message);
                // Fallback: fetch all pubs without ordering so nothing is missed
                const fallbackQuery = groupRef
                    .collection('pubs')
                    .limit(PUBS_PAGE_SIZE + 1);
                pubsUnsubRef.current = fallbackQuery.onSnapshot(
                    snap => handleSnap(snap, false),
                    fallbackErr => {
                        console.error('useGroupData: pubs fallback also failed', fallbackErr);
                        setPubsLoading(false);
                    }
                );
            }
        );
    }, [groupRef]);

    // Initial pubs subscription
    useEffect(() => {
        subscribeToPubs();
        return () => {
            if (pubsUnsubRef.current) pubsUnsubRef.current();
        };
    }, [subscribeToPubs]);

    const loadMorePubs = useCallback(() => {
        if (!hasMorePubs || pubsLoading) return;
        subscribeToPubs(lastPubDocRef.current);
    }, [hasMorePubs, pubsLoading, subscribeToPubs]);

    // ── Criteria (non-archived, small collection, full real-time) ─────────────────
    useEffect(() => {
        const unsub = groupRef
            .collection('criteria')
            .where('archived', '==', false)
            .onSnapshot(snap =>
                setCriteria(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            );
        return () => unsub();
    }, [groupRef]);

    // ── Scores — paginated real-time listener ──────────────────────────────────────
    const subscribeToScores = useCallback((startAfterDoc = null) => {
        if (scoresUnsubRef.current) {
            scoresUnsubRef.current();
            scoresUnsubRef.current = null;
        }

        setScoresLoading(true);

        let query = groupRef
            .collection('scores')
            .orderBy('updatedAt', 'desc')
            .limit(SCORES_PAGE_SIZE + 1);

        if (startAfterDoc) {
            query = query.startAfter(startAfterDoc);
        }

        scoresUnsubRef.current = query.onSnapshot(snap => {
            const docs = snap.docs;
            const hasMore = docs.length > SCORES_PAGE_SIZE;
            const pageDocs = hasMore ? docs.slice(0, SCORES_PAGE_SIZE) : docs;

            if (pageDocs.length > 0) {
                lastScoreDocRef.current = pageDocs[pageDocs.length - 1];
            }

            const newScores = pageDocs.map(d => ({ id: d.id, ...d.data() }));
            setRawScores(prev => startAfterDoc ? [...prev, ...newScores] : newScores);
            setHasMoreScores(hasMore);
            setScoresLoading(false);
        });
    }, [groupRef]);

    useEffect(() => {
        subscribeToScores();
        return () => {
            if (scoresUnsubRef.current) scoresUnsubRef.current();
        };
    }, [subscribeToScores]);

    const loadMoreScores = useCallback(() => {
        if (!hasMoreScores || scoresLoading) return;
        subscribeToScores(lastScoreDocRef.current);
    }, [hasMoreScores, scoresLoading, subscribeToScores]);

    // ── Users — stable listener keyed on the sorted members list ─────────────────
    // membersKey is a stable string that only changes when the actual set of
    // member UIDs changes (not on every Firestore re-emit of the group doc).
    // This prevents the infinite subscribe/unsubscribe loop that was clearing
    // the users array on every snapshot.
    useEffect(() => {
        if (!membersKey) return;

        const ids = membersKey.split(',').filter(Boolean).slice(0, 30);
        if (!ids.length) return;

        const unsub = db
            .collection('users')
            .where(firebase.firestore.FieldPath.documentId(), 'in', ids)
            .onSnapshot(
                snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))),
                err  => console.error('useGroupData: users listener error', err)
            );
        return () => unsub();
    }, [db, membersKey]);

    return {
        groupRef,
        groupData,
        pubs,
        criteria,
        rawScores,
        users,
        // Pagination helpers
        loadMorePubs,
        hasMorePubs,
        pubsLoading,
        loadMoreScores,
        hasMoreScores,
        scoresLoading,
    };
}
