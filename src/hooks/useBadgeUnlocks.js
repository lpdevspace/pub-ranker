/**
 * useBadgeUnlocks.js
 *
 * Phase 2 — real-time badge persistence hook.
 *
 * Provides two things:
 *   1. earnedBadges  — Map<userId, { id, earnedAt }[]> loaded from Firestore
 *                      for all group members. Used by AchievementsPage to show
 *                      "Earned [date]" on each BadgeCard and to sort the
 *                      Recently Unlocked spotlight by actual unlock date.
 *
 *   2. toastQueue    — Array of recent unlock events (last 60 s) for any
 *                      member, consumed by the BadgeToast component to show
 *                      "🍺 Luke just earned First Pint!" toasts.
 *
 * Both update in real time via onSnapshot listeners that are cleaned up on
 * unmount or whenever groupId changes.
 */

import { useState, useEffect, useRef } from 'react';

export default function useBadgeUnlocks(db, groupId) {
    // Map<userId, Array<{ id: string, earnedAt: Timestamp }>>
    const [earnedBadges, setEarnedBadges] = useState({});
    // Array<{ id, userId, displayName, badgeId, badgeName, badgeEmoji, unlockedAt }>
    const [toastQueue, setToastQueue]     = useState([]);
    const seenUnlockIds = useRef(new Set());

    // ── Listener 1: all userBadges docs in the group ──────────────────────────
    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db
            .collection('groups').doc(groupId)
            .collection('userBadges')
            .onSnapshot(
                snap => {
                    const map = {};
                    snap.forEach(doc => {
                        map[doc.id] = doc.data().earnedBadges || [];
                    });
                    setEarnedBadges(map);
                },
                err => console.warn('useBadgeUnlocks/userBadges:', err)
            );
        return unsub;
    }, [db, groupId]);

    // ── Listener 2: recentUnlocks — last 60 seconds of activity ──────────────
    useEffect(() => {
        if (!db || !groupId) return;

        // Only listen to documents created in the last 60 seconds so we don't
        // toast on historical unlocks when the page first mounts.
        const cutoff = new Date(Date.now() - 60_000);

        const unsub = db
            .collection('groups').doc(groupId)
            .collection('recentUnlocks')
            .orderBy('unlockedAt', 'desc')
            .limit(20)
            .onSnapshot(
                snap => {
                    snap.docChanges().forEach(change => {
                        if (change.type !== 'added') return;
                        const data = change.doc.data();
                        const docId = change.doc.id;

                        // Ignore events already shown or older than 60 s
                        if (seenUnlockIds.current.has(docId)) return;
                        const ts = data.unlockedAt?.toDate?.();
                        if (ts && ts < cutoff) return;

                        seenUnlockIds.current.add(docId);
                        setToastQueue(q => [
                            ...q,
                            { _id: docId, ...data },
                        ]);
                    });
                },
                err => console.warn('useBadgeUnlocks/recentUnlocks:', err)
            );
        return unsub;
    }, [db, groupId]);

    return { earnedBadges, toastQueue, setToastQueue };
}
