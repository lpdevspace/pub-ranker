import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from '../firebase';
import { SAMPLE_USERS } from '../data/sampleTavernData';

export const AuthContext = createContext(null);

const DEMO_USER = {
    uid: 'demo-user-5',
    email: 'luke@pubranker.uk',
    displayName: 'Luke Parry',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
};

const DEMO_PROFILE = {
    uid: 'demo-user-5',
    email: 'luke@pubranker.uk',
    displayName: 'Luke Parry',
    nickname: 'Tavern Master',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    groups: ['demo-group'],
    activeGroupId: 'demo-group',
    isSuperAdmin: true,
    isAdmin: true,
    isStaff: true,
    role: 'admin',
    hasCompletedOnboarding: true,
};

export function AuthProvider({ children }) {
    const isInitialDemo = typeof window !== 'undefined' && (
        localStorage.getItem('pub_ranker_demo') === 'true' ||
        window.location.search.includes('demo=true')
    );

    const [user, setUser] = useState(isInitialDemo ? DEMO_USER : null);
    const [userProfile, setUserProfile] = useState(isInitialDemo ? DEMO_PROFILE : null);
    const [authLoading, setAuthLoading] = useState(!isInitialDemo);
    const [globalSettings, setGlobalSettings] = useState({
        maintenanceMode: false,
        announcement: null,
        featureFlags: {},
    });

    // ── Global system maintenance & settings listener ────────────────────────
    useEffect(() => {
        if (!db) return;
        const unsub = db.collection('global').doc('settings').onSnapshot(
            (doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    setGlobalSettings({
                        maintenanceMode: Boolean(data.maintenanceMode),
                        announcement: data.announcement || null,
                        featureFlags: data.featureFlags || {},
                    });
                }
            },
            (err) => console.error('Global settings snapshot error:', err)
        );
        return () => unsub();
    }, []);

    // ── Firebase Auth & User Profile listener ────────────────────────────────
    useEffect(() => {
        if (isInitialDemo) {
            setAuthLoading(false);
            return;
        }

        let profileUnsubscribe = null;

        const timeout = setTimeout(() => {
            setAuthLoading(false);
        }, 8000);

        const authUnsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            clearTimeout(timeout);

            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }

            if (currentUser) {
                setUser(currentUser);
                const userRef = db.collection('users').doc(currentUser.uid);

                profileUnsubscribe = userRef.onSnapshot(
                    async (doc) => {
                        if (doc.exists) {
                            setUserProfile({ uid: doc.id, ...doc.data() });
                        } else {
                            // First sign-in profile bootstrap
                            const newProfile = {
                                uid: currentUser.uid,
                                email: currentUser.email,
                                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                                groups: [],
                                activeGroupId: null,
                                hasCompletedOnboarding: false,
                            };
                            try {
                                await userRef.set(newProfile);
                                setUserProfile(newProfile);
                            } catch (e) {
                                console.error('Error creating user profile document:', e);
                            }
                        }
                        setAuthLoading(false);
                    },
                    (err) => {
                        console.error('User profile listener error:', err);
                        setAuthLoading(false);
                    }
                );
            } else {
                setUser(null);
                setUserProfile(null);
                setAuthLoading(false);
            }
        });

        return () => {
            clearTimeout(timeout);
            authUnsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, [isInitialDemo]);

    const enableDemoMode = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('pub_ranker_demo', 'true');
        }
        setUser(DEMO_USER);
        setUserProfile(DEMO_PROFILE);
        setAuthLoading(false);
    }, []);

    const signOut = useCallback(async () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pub_ranker_demo');
        }
        setUser(null);
        setUserProfile(null);
        try {
            await auth.signOut();
        } catch (e) {
            console.error('Sign out error:', e);
        }
    }, []);

    const updateUserProfile = useCallback(async (data) => {
        if (user?.uid === 'demo-user-5') {
            setUserProfile(prev => ({ ...prev, ...data }));
            return;
        }
        if (!user?.uid) return;
        try {
            await db.collection('users').doc(user.uid).update(data);
        } catch (e) {
            console.error('Error updating user profile:', e);
            throw e;
        }
    }, [user?.uid]);

    // Role calculations
    const isSuperAdmin = userProfile?.isSuperAdmin === true;
    const isAdmin = isSuperAdmin || userProfile?.isAdmin === true;
    const isModerator = isAdmin || userProfile?.isModerator === true;
    const isStaff = isSuperAdmin || isAdmin || isModerator;
    const isVenueOwner = userProfile?.isVenueOwner === true;
    const isBanned = userProfile?.isBanned === true;

    const value = useMemo(() => ({
        user,
        userProfile,
        authLoading,
        isSuperAdmin,
        isAdmin,
        isModerator,
        isStaff,
        isVenueOwner,
        isBanned,
        globalAnnouncement: globalSettings.announcement,
        isMaintenanceMode: globalSettings.maintenanceMode,
        featureFlags: globalSettings.featureFlags,
        signOut,
        enableDemoMode,
        updateUserProfile,
        auth,
        db,
    }), [
        user,
        userProfile,
        authLoading,
        isSuperAdmin,
        isAdmin,
        isModerator,
        isStaff,
        isVenueOwner,
        isBanned,
        globalSettings,
        signOut,
        enableDemoMode,
        updateUserProfile,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
