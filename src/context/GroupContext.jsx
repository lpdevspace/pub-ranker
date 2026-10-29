import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { SAMPLE_GROUP } from '../data/sampleTavernData';

export const GroupContext = createContext(null);

export function GroupProvider({ children }) {
    const { user, userProfile, updateUserProfile } = useAuth();
    const groupId = userProfile?.activeGroupId || null;
    const isDemo = groupId === 'demo-group';

    const [groupData, setGroupData] = useState(isDemo ? SAMPLE_GROUP : null);
    const [groupLoading, setGroupLoading] = useState(Boolean(groupId) && !isDemo);

    const groupRef = useMemo(() => {
        if (!groupId || isDemo) return null;
        return db.collection('groups').doc(groupId);
    }, [groupId, isDemo]);

    // ── Listen to active group document ───────────────────────────────────────
    useEffect(() => {
        if (isDemo) {
            setGroupData(SAMPLE_GROUP);
            setGroupLoading(false);
            return;
        }

        if (!groupRef) {
            setGroupData(null);
            setGroupLoading(false);
            return;
        }

        setGroupLoading(true);
        const unsubscribe = groupRef.onSnapshot(
            (doc) => {
                if (doc.exists) {
                    setGroupData({ id: doc.id, ...doc.data() });
                } else {
                    setGroupData(null);
                }
                setGroupLoading(false);
            },
            (err) => {
                console.error('Group data listener error:', err);
                setGroupLoading(false);
            }
        );

        return () => unsubscribe();
    }, [groupRef, isDemo]);

    // ── Inject group brand color dynamically ──────────────────────────────────
    useEffect(() => {
        if (groupData?.brandColor) {
            document.documentElement.style.setProperty('--theme-color', groupData.brandColor);
        } else {
            document.documentElement.style.removeProperty('--theme-color');
        }
    }, [groupData?.brandColor]);

    const canManageGroup = useMemo(() => {
        if (isDemo) return true;
        if (!user?.uid || !groupData) return false;
        return groupData.ownerUid === user.uid || (Array.isArray(groupData.managers) && groupData.managers.includes(user.uid));
    }, [user?.uid, groupData, isDemo]);

    const switchGroup = useCallback(async (newGroupId = null) => {
        if (!user?.uid) return;
        try {
            await updateUserProfile({ activeGroupId: newGroupId });
        } catch (e) {
            console.error('Error switching group:', e);
            throw e;
        }
    }, [user?.uid, updateUserProfile]);

    const value = useMemo(() => ({
        groupId,
        groupRef,
        groupData,
        groupLoading,
        canManageGroup,
        switchGroup,
        groupName: groupData?.groupName || groupData?.name || 'Pub Ranker',
    }), [groupId, groupRef, groupData, groupLoading, canManageGroup, switchGroup]);

    return (
        <GroupContext.Provider value={value}>
            {children}
        </GroupContext.Provider>
    );
}

export function useGroup() {
    const ctx = useContext(GroupContext);
    if (!ctx) throw new Error('useGroup must be used inside <GroupProvider>');
    return ctx;
}
