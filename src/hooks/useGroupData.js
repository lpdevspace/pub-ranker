import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { firebase } from '../firebase';

const PUBS_PAGE_SIZE   = 50;
const SCORES_PAGE_SIZE = 200;

export default function useGroupData({ db, groupId }) {
    const [groupData, setGroupData]   = useState(null);
    const [pubs, setPubs]             = useState([]);
    const [criteria, setCriteria]     = useState([]);
    const [rawScores, setRawScores]   = useState([]);
    const [users, setUsers]           = useState([]);

    const [pubsLoading, setPubsLoading]       = useState(true);
    const [hasMorePubs, setHasMorePubs]       = useState(false);
    const [scoresLoading, setScoresLoading]   = useState(true);
    const [hasMoreScores, setHasMoreScores]   = useState(false);

    const lastPubDocRef   = useRef(null);
    const lastScoreDocRef = useRef(null);
    const pubsUnsubRef    = useRef(null);
    const scoresUnsubRef  = useRef(null);

    // Stable serialised key — only changes when the actual set of member UIDs
    // changes, preventing an infinite users-listener re-subscription loop.
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

    // ── Group metadata ────────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = groupRef.onSnapshot(doc => {
            if (doc.exists) setGroupData({ id: doc.id, ...doc.data() });
        });
        return () => unsub();
    }, [groupRef]);

    // ── Pubs — paginated real-time listener ───────────────────────────────────────
    const subscribeToPubs = useCallback((startAfterDoc = null) => {
        if (pubsUnsubRef.current) {
            pubsUnsubRef.current();
            pubsUnsubRef.current = null;
        }
        setPubsLoading(true);

        const handleSnap = (snap, append) => {
            const docs = snap.docs;
            const hasMore = docs.length > PUBS_PAGE_SIZE;
            const pageDocs = hasMore ? docs.slice(0, PUBS_PAGE_SIZE) : docs;
            if (pageDocs.length > 0) lastPubDocRef.current = pageDocs[pageDocs.length - 1];
            const newPubs = pageDocs.map(d => ({ id: d.id, ...d.data() }));
            setPubs(prev => append ? [...prev, ...newPubs] : newPubs);
            setHasMorePubs(hasMore);
            setPubsLoading(false);
        };

        let query = groupRef
            .collection('pubs')
            .orderBy('createdAt', 'desc')
            .limit(PUBS_PAGE_SIZE + 1);
        if (startAfterDoc) query = query.startAfter(startAfterDoc);

        pubsUnsubRef.current = query.onSnapshot(
            snap => handleSnap(snap, !!startAfterDoc),
            err => {
                console.warn('useGroupData: pubs orderBy(createdAt) failed, falling back to unordered', err.message);
                const fallbackQuery = groupRef.collection('pubs').limit(PUBS_PAGE_SIZE + 1);
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

    useEffect(() => {
        subscribeToPubs();
        return () => { if (pubsUnsubRef.current) pubsUnsubRef.current(); };
    }, [subscribeToPubs]);

    const loadMorePubs = useCallback(() => {
        if (!hasMorePubs || pubsLoading) return;
        subscribeToPubs(lastPubDocRef.current);
    }, [hasMorePubs, pubsLoading, subscribeToPubs]);

    // ── Criteria ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = groupRef
            .collection('criteria')
            .where('archived', '==', false)
            .onSnapshot(snap =>
                setCriteria(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            );
        return () => unsub();
    }, [groupRef]);

    // ── Scores — fetch ALL docs unordered ─────────────────────────────────────────
    // Existing score documents were written with 'timestamp'/'lastEditedAt' but
    // never 'updatedAt'. Using orderBy('updatedAt') silently excluded every
    // legacy document, causing blank ratings everywhere. We now fetch all score
    // docs without ordering; RateView writes 'updatedAt' going forward so a
    // future ordered query will work once all docs have the field.
    const subscribeToScores = useCallback((startAfterDoc = null) => {
        if (scoresUnsubRef.current) {
            scoresUnsubRef.current();
            scoresUnsubRef.current = null;
        }
        setScoresLoading(true);

        let query = groupRef
            .collection('scores')
            .limit(SCORES_PAGE_SIZE + 1);

        if (startAfterDoc) query = query.startAfter(startAfterDoc);

        scoresUnsubRef.current = query.onSnapshot(
            snap => {
                const docs = snap.docs;
                const hasMore = docs.length > SCORES_PAGE_SIZE;
                const pageDocs = hasMore ? docs.slice(0, SCORES_PAGE_SIZE) : docs;
                if (pageDocs.length > 0) lastScoreDocRef.current = pageDocs[pageDocs.length - 1];
                const newScores = pageDocs.map(d => ({ id: d.id, ...d.data() }));
                setRawScores(prev => startAfterDoc ? [...prev, ...newScores] : newScores);
                setHasMoreScores(hasMore);
                setScoresLoading(false);
            },
            err => {
                console.error('useGroupData: scores listener error', err);
                setScoresLoading(false);
            }
        );
    }, [groupRef]);

    useEffect(() => {
        subscribeToScores();
        return () => { if (scoresUnsubRef.current) scoresUnsubRef.current(); };
    }, [subscribeToScores]);

    const loadMoreScores = useCallback(() => {
        if (!hasMoreScores || scoresLoading) return;
        subscribeToScores(lastScoreDocRef.current);
    }, [hasMoreScores, scoresLoading, subscribeToScores]);

    // ── Users — stable listener keyed on sorted member UIDs ───────────────────────
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
        groupRef, groupData, pubs, criteria, rawScores, users,
        loadMorePubs, hasMorePubs, pubsLoading,
        loadMoreScores, hasMoreScores, scoresLoading,
    };
}
