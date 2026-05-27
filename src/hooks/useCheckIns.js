import { useState, useEffect } from 'react';

/**
 * useCheckIns
 * Reads and writes to groups/{groupId}/checkIns
 *
 * A check-in document shape:
 * {
 *   userId:    string,
 *   pubId:     string,
 *   note:      string | null,
 *   createdAt: Timestamp,
 *   groupId:   string,
 * }
 */
export default function useCheckIns({ db, groupId }) {
    const [checkIns, setCheckIns]   = useState([]);
    const [loading,  setLoading]    = useState(true);

    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db
            .collection('groups').doc(groupId)
            .collection('checkIns')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .onSnapshot(
                snap => {
                    setCheckIns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    setLoading(false);
                },
                err => { console.error('useCheckIns error:', err); setLoading(false); }
            );
        return () => unsub();
    }, [db, groupId]);

    const addCheckIn = async ({ userId, pubId, note = null }) => {
        if (!db || !groupId || !userId || !pubId) return;
        const { firebase } = await import('../firebase');
        await db
            .collection('groups').doc(groupId)
            .collection('checkIns')
            .add({
                userId,
                pubId,
                note: note?.trim() || null,
                groupId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
    };

    const deleteCheckIn = async (checkInId) => {
        if (!db || !groupId || !checkInId) return;
        await db
            .collection('groups').doc(groupId)
            .collection('checkIns')
            .doc(checkInId)
            .delete();
    };

    return { checkIns, loading, addCheckIn, deleteCheckIn };
}
