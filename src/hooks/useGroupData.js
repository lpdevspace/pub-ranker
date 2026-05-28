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

        // Pubs are written with createdAt — ordering by this field matches all
        // existing docs. addedAt was the old (incorrect) field name.
        let query = groupRef
            .collection('pubs')
            .orderBy('createdAt', 'desc')
            .limit(PUBS_PAGE_SIZE + 1);

        if (startAfterDoc) {
            query = query.startAfter(startAfterDoc);
        }

        pubsUnsubRef.current = query.onSnapshot(snap => {
            const docs = snap.docs;
            const hasMore = docs.length > PUBS_PAGE_SIZE;
            const pageDocs = hasMore ? docs.slice(0, PUBS_PAGE_SIZE) : docs;

            if (pageDocs.length > 0) {
                lastPubDocRef.current = pageDocs[pageDocs.length - 1];
            }

            const newPubs = pageDocs.map(d => ({ id: d.id, ...d.data() }));

            // If we're paginating (startAfterDoc set) append; otherwise replace
            setPubs(prev => startAfterDoc ? [...prev, ...newPubs] : newPubs);
            setHasMorePubs(hasMore);
            setPubsLoading(false);
        }, err => {
            // If the createdAt index hasn't propagated yet, fall back to unordered
            console.warn('useGroupData: pubs orderBy(createdAt) failed, falling back to unordered', err.message);
            groupRef.collection('pubs').limit(PUBS_PAGE_SIZE + 1).onSnapshot(snap => {
                const docs = snap.docs;
                const hasMore = docs.length > PUBS_PAGE_SIZE;
                const pageDocs = hasMore ? docs.slice(0, PUBS_PAGE_SIZE) : docs;
                const newPubs = pageDocs.map(d => ({ id: d.id, ...d.data() }));
                setPubs(newPubs);
                setHasMorePubs(hasMore);
                setPubsLoading(false);
            });
        });
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

    // ── Members (capped at 30 by Firestore 'in' limit) ────────────────────────────
    useEffect(() => {
        const memberIds = groupData?.members;
        if (!memberIds?.length) return;
        const ids = memberIds.slice(0, 30);
        const unsub = db
            .collection('users')
            .where(firebase.firestore.FieldPath.documentId(), 'in', ids)
            .onSnapshot(snap =>
                setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
            );
        return () => unsub();
    }, [db, groupData?.members]);

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
