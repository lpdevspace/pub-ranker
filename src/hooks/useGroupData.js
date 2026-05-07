import { useState, useEffect, useMemo } from 'react';
import { firebase } from '../firebase';

/**
 * useGroupData
 * Manages all real-time Firestore listeners for a given group.
 * Centralises subscription logic that was previously scattered across MainApp.
 *
 * Returns: { groupRef, groupData, pubs, criteria, rawScores, users }
 */
export default function useGroupData({ db, groupId }) {
    const [groupData, setGroupData] = useState(null);
    const [pubs, setPubs] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [rawScores, setRawScores] = useState([]);
    const [users, setUsers] = useState([]);

    const groupRef = useMemo(
        () => db.collection('groups').doc(groupId),
        [db, groupId]
    );

    // Group metadata
    useEffect(() => {
        const unsub = groupRef.onSnapshot(doc => {
            if (doc.exists) setGroupData({ id: doc.id, ...doc.data() });
        });
        return () => unsub();
    }, [groupRef]);

    // Pubs
    useEffect(() => {
        const unsub = groupRef.collection('pubs').onSnapshot(snap => {
            setPubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [groupRef]);

    // Criteria (non-archived only)
    useEffect(() => {
        const unsub = groupRef
            .collection('criteria')
            .where('archived', '==', false)
            .onSnapshot(snap =>
                setCriteria(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            );
        return () => unsub();
    }, [groupRef]);

    // Scores — raw array, aggregated in useScoreCalculations
    useEffect(() => {
        const unsub = groupRef.collection('scores').onSnapshot(snap => {
            setRawScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [groupRef]);

    // Members — derived from groupData.members once it loads
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

    return { groupRef, groupData, pubs, criteria, rawScores, users };
}
