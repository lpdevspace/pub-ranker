import { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { firebase } from './firebase';
import MainApp from './MainApp';
import LoadingScreen from './components/LoadingScreen';
import PublicLandingPage from './pages/PublicLandingPage';
import AuthScreen from './pages/AuthScreen';
import GroupPortal from './pages/GroupPortal';
import VenuePortalPage from './pages/VenuePortalPage';

export default function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [globalAnnouncement, setGlobalAnnouncement] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [featureFlags, setFeatureFlags] = useState({});

    // Track whether getRedirectResult() has finished so we never mark auth as
    // resolved while a social-login redirect might still be in flight.
    const redirectChecked = useRef(false);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    useEffect(() => {
        let profileUnsubscribe = null;

        // 1. Check for an in-flight social redirect FIRST, before hooking up the
        //    auth state listener. This prevents the brief signed-out flash that
        //    happens when onAuthStateChanged fires (user=null) before Firebase
        //    has had a chance to process the returning redirect credential.
        auth.getRedirectResult()
            .catch((e) => {
                if (e.code && e.code !== 'auth/no-auth-event') {
                    console.error('Redirect sign-in error:', e);
                }
            })
            .finally(() => {
                redirectChecked.current = true;
            });

        const authUnsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (profileUnsubscribe) { profileUnsubscribe(); profileUnsubscribe = null; }

            if (currentUser) {
                setUser(currentUser);
                setShowAuth(false);
                const userRef = db.collection('users').doc(currentUser.uid);
                profileUnsubscribe = userRef.onSnapshot(async (doc) => {
                    if (doc.exists) {
                        setUserProfile(doc.data());
                        setAuthLoading(false);
                    } else {
                        const newProfile = {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName || currentUser.email.split('@')[0],
                            groups: [],
                            activeGroupId: null,
                            hasCompletedOnboarding: false,
                        };
                        try {
                            await userRef.set(newProfile);
                            setUserProfile(newProfile);
                        } catch (e) {
                            console.error(e);
                        } finally {
                            setAuthLoading(false);
                        }
                    }
                }, (err) => {
                    console.error('Error listening to user profile:', err);
                    setAuthLoading(false);
                });
            } else {
                // Only mark auth as fully resolved once we know there is no
                // pending redirect. If redirectChecked is still false the
                // redirect result promise is still in flight — keep showing the
                // loading screen so we don't flash the landing page.
                if (redirectChecked.current) {
                    setUser(null);
                    setUserProfile(null);
                    setAuthLoading(false);
                    setShowAuth(false);
                } else {
                    // Poll until the redirect check resolves, then update state.
                    const waitForRedirect = setInterval(() => {
                        if (redirectChecked.current) {
                            clearInterval(waitForRedirect);
                            setUser(null);
                            setUserProfile(null);
                            setAuthLoading(false);
                            setShowAuth(false);
                        }
                    }, 50);
                }
            }
        });

        return () => { authUnsubscribe(); if (profileUnsubscribe) profileUnsubscribe(); };
    }, []);

    useEffect(() => {
        const unsub = db.collection('global').doc('settings').onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                setGlobalAnnouncement(data.announcement || '');
                setIsMaintenanceMode(data.maintenanceMode || false);
                setFeatureFlags(data.featureFlags || {});
            } else {
                setGlobalAnnouncement('');
                setIsMaintenanceMode(false);
            }
        });
        return () => unsub();
    }, []);

    const isVenueOwner = userProfile?.isVenueOwner === true;
    const isBusinessDomain = window.location.hostname.startsWith('business');
    const showVenuePortal = isBusinessDomain && isVenueOwner;

    let currentScreen;

    if (authLoading) {
        currentScreen = <LoadingScreen text="Loading..." />;

    } else if (!user) {
        currentScreen = showAuth
            ? <AuthScreen auth={auth} onBack={() => setShowAuth(false)} />
            : <PublicLandingPage db={db} onLoginClick={() => setShowAuth(true)} />;

    } else if (!userProfile) {
        currentScreen = <LoadingScreen text="Loading User Profile..." />;

    } else if (isMaintenanceMode && !userProfile?.isSuperAdmin) {
        currentScreen = (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                    <span className="text-6xl mb-4 block">🚧</span>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Under Maintenance</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Pub Ranker is currently undergoing scheduled maintenance. We'll be back shortly!
                    </p>
                    <button
                        onClick={() => auth.signOut()}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        );

    } else if (userProfile.isBanned) {
        currentScreen = (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                    <span className="text-6xl mb-4 block">🛑</span>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Account Banned</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Your account has been suspended. Please contact support if you believe this is a mistake.
                    </p>
                    <button
                        onClick={() => auth.signOut()}
                        className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        );

    } else if (showVenuePortal) {
        currentScreen = (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-fadeIn">
                <div className="p-4 flex justify-end">
                    <button
                        onClick={() => auth.signOut()}
                        className="text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition"
                    >
                        Log Out
                    </button>
                </div>
                <VenuePortalPage db={db} user={user} />
            </div>
        );

    } else if (!userProfile.activeGroupId || !userProfile.groups?.includes(userProfile.activeGroupId)) {
        currentScreen = (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
                <GroupPortal user={user} userProfile={userProfile} auth={auth} db={db} />
            </div>
        );

    } else {
        currentScreen = (
            <MainApp
                user={user}
                userProfile={userProfile}
                groupId={userProfile.activeGroupId}
                auth={auth}
                db={db}
                isDarkMode={isDarkMode}
                toggleDarkMode={() => setIsDarkMode(prev => !prev)}
                featureFlags={featureFlags}
            />
        );
    }

    return (
        <>
            {isMaintenanceMode && userProfile?.isSuperAdmin && (
                <div className="bg-red-600 text-white font-bold text-center p-3 shadow-md z-[60] relative animate-pulse">
                    🚧 MAINTENANCE MODE IS ACTIVE 🚧
                </div>
            )}
            {globalAnnouncement && (
                <div className="bg-yellow-500 text-yellow-900 font-bold text-center p-3 shadow-md z-50 relative">
                    📢 {globalAnnouncement}
                </div>
            )}
            {currentScreen}
        </>
    );
}
