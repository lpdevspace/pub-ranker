import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { firebase } from '../firebase';
import {
    SAMPLE_GROUP,
    SAMPLE_PUBS,
    SAMPLE_CRITERIA,
    SAMPLE_RAW_SCORES,
    SAMPLE_USERS
} from '../data/sampleTavernData';

const PUBS_PAGE_SIZE   = 50;
const SCORES_PAGE_SIZE = 200;

export default function useGroupData({ db, groupId }) {
    const isDemo = groupId === 'demo-group';

    const [groupData, setGroupData]   = useState(isDemo ? SAMPLE_GROUP : null);
    const [pubs, setPubs]             = useState(isDemo ? SAMPLE_PUBS : []);
    const [criteria, setCriteria]     = useState(isDemo ? SAMPLE_CRITERIA : []);
    const [rawScores, setRawScores]   = useState(isDemo ? SAMPLE_RAW_SCORES : []);
    const [users, setUsers]           = useState(isDemo ? SAMPLE_USERS : []);

    const [pubsLoading, setPubsLoading]       = useState(!isDemo);
    const [hasMorePubs, setHasMorePubs]       = useState(false);
    const [scoresLoading, setScoresLoading]   = useState(!isDemo);
    const [hasMoreScores, setHasMoreScores]   = useState(false);

    const lastPubDocRef   = useRef(null);
    const lastScoreDocRef = useRef(null);
    const pubsUnsubRef    = useRef(null);
    const scoresUnsubRef  = useRef(null);

    // Initialize or reset if demo
    useEffect(() => {
        if (groupId === 'demo-group' && (!groupData || groupData.id !== 'demo-group')) {
            setGroupData(SAMPLE_GROUP);
            setPubs(SAMPLE_PUBS);
            setCriteria(SAMPLE_CRITERIA);
            setRawScores(SAMPLE_RAW_SCORES);
            setUsers(SAMPLE_USERS);
            setPubsLoading(false);
            setScoresLoading(false);
        }
    }, [groupId]);

    // Stable serialised key — only changes when the actual set of member UIDs
    // changes, preventing an infinite users-listener re-subscription loop.
    const membersKey = useMemo(() => {
        if (!groupData || isDemo) return '';
        const ids = [...new Set([
            groupData.ownerUid,
            ...(groupData.managers || []),
            ...(groupData.members  || []),
        ].filter(Boolean))].sort();
        return ids.join(',');
    }, [groupData, isDemo]);

    const groupRef = useMemo(() => {
        if (!db || !groupId || isDemo) return null;
        return db.collection('groups').doc(groupId);
    }, [db, groupId, isDemo]);

    // ── Group metadata ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!groupRef) return;
        const unsub = groupRef.onSnapshot(doc => {
            if (doc.exists) setGroupData({ id: doc.id, ...doc.data() });
        });
        return () => unsub();
    }, [groupRef]);

    // ── Pubs — paginated real-time listener ───────────────────────────────────────
    const subscribeToPubs = useCallback((startAfterDoc = null) => {
        if (!groupRef) return;
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
        if (groupRef) {
            subscribeToPubs();
        }
        return () => { if (pubsUnsubRef.current) pubsUnsubRef.current(); };
    }, [subscribeToPubs, groupRef]);

    const loadMorePubs = useCallback(() => {
        if (!hasMorePubs || pubsLoading || !groupRef) return;
        subscribeToPubs(lastPubDocRef.current);
    }, [hasMorePubs, pubsLoading, subscribeToPubs, groupRef]);

    // ── Criteria ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!groupRef) return;
        const unsub = groupRef
            .collection('criteria')
            .where('archived', '==', false)
            .onSnapshot(snap =>
                setCriteria(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            );
        return () => unsub();
    }, [groupRef]);

    // ── Scores — fetch ALL docs unordered ─────────────────────────────────────────
    const subscribeToScores = useCallback((startAfterDoc = null) => {
        if (!groupRef) return;
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
        if (groupRef) {
            subscribeToScores();
        }
        return () => { if (scoresUnsubRef.current) scoresUnsubRef.current(); };
    }, [subscribeToScores, groupRef]);

    const loadMoreScores = useCallback(() => {
        if (!hasMoreScores || scoresLoading || !groupRef) return;
        subscribeToScores(lastScoreDocRef.current);
    }, [hasMoreScores, scoresLoading, subscribeToScores, groupRef]);

    // ── Users — stable listener keyed on sorted member UIDs ───────────────────────
    useEffect(() => {
        if (!membersKey || !db || isDemo) return;
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
    }, [db, membersKey, isDemo]);

    // ── Sample Fallback & Seed Logic ──────────────────────────────────────────
    const [isSeeding, setIsSeeding] = useState(false);

    const isShowingSampleFallback = !isDemo && !pubsLoading && pubs.length === 0;
    const effectivePubs = isShowingSampleFallback ? SAMPLE_PUBS : pubs;
    const effectiveCriteria = (criteria.length > 0) ? criteria : (isShowingSampleFallback || isDemo ? SAMPLE_CRITERIA : criteria);
    const effectiveScores = (rawScores.length > 0) ? rawScores : (isShowingSampleFallback || isDemo ? SAMPLE_RAW_SCORES : rawScores);
    const effectiveUsers = (users.length > 0) ? users : (isShowingSampleFallback || isDemo ? SAMPLE_USERS : users);

    const seedRealData = useCallback(async (userObj) => {
        if (!db || !groupId || !groupRef) return;
        setIsSeeding(true);
        try {
            const { seedGroupWithRealPubs } = await import('../utils/seedRealPubs');
            await seedGroupWithRealPubs({ db, groupId, groupRef, user: userObj });
        } catch (err) {
            console.error('Failed to seed real pubs to Firestore:', err);
            throw err;
        } finally {
            setIsSeeding(false);
        }
    }, [db, groupId, groupRef]);

    return {
        groupRef,
        groupData,
        pubs: effectivePubs,
        rawPubs: pubs,
        criteria: effectiveCriteria,
        rawScores: effectiveScores,
        users: effectiveUsers,
        isShowingSampleFallback,
        seedRealData,
        isSeeding,
        loadMorePubs,
        hasMorePubs,
        pubsLoading,
        loadMoreScores,
        hasMoreScores,
        scoresLoading,
    };
}
