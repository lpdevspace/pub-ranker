import { useState, useEffect, useMemo } from 'react';
import { auth, db, firebase } from './firebase';
import MainApp from './MainApp';

export function LoadingScreen({ text = "" }) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="loader"></div>
            <p className="ml-4 text-gray-600">{text} Loading...</p>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [globalAnnouncement, setGlobalAnnouncement] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    // --- DARK MODE LOGIC ---
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    // --- AUTH LOGIC ---
    useEffect(() => {
        let profileUnsubscribe = null;

        const authUnsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }

            if (currentUser) {
                setUser(currentUser);
                const userRef = db.collection('users').doc(currentUser.uid);

                profileUnsubscribe = userRef.onSnapshot(async (doc) => {
                    if (doc.exists) {
                        setUserProfile(doc.data());
                        setAuthLoading(false);
                    } else {
                        const newUserProfile = {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName || currentUser.email.split('@')[0],
                            groups: [],
                            activeGroupId: null
                        };

                        try {
                            await userRef.set(newUserProfile);
                            setUserProfile(newUserProfile);
                        } catch (e) {
                            console.error("Error creating user profile:", e);
                        } finally {
                            setAuthLoading(false);
                        }
                    }
                }, (error) => {
                    console.error("Error listening to user profile:", error);
                    setAuthLoading(false);
                });
            } else {
                setUser(null);
                setUserProfile(null);
                setAuthLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, []);

    // --- GLOBAL ANNOUNCEMENT LOGIC ---
    useEffect(() => {
        const unsubscribe = db.collection('global').doc('settings').onSnapshot((doc) => {
            if (doc.exists && doc.data().announcement) {
                setGlobalAnnouncement(doc.data().announcement);
            } else {
                setGlobalAnnouncement("");
            }
        });
        return () => unsubscribe();
    }, []);

// --- DETERMINE WHICH PAGE TO SHOW ---
    let currentScreen;
    
    if (authLoading) {
        currentScreen = <LoadingScreen text="Loading Authentication..." />;
    } else if (!user) {
        currentScreen = <AuthScreen auth={auth} />;
    } else if (!userProfile) {
        currentScreen = <LoadingScreen text="Loading User Profile..." />;
    } else if (userProfile.isBanned) {
        // --- THE BAN SCREEN ---
        currentScreen = (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border-t-8 border-red-600">
                    <span className="text-6xl mb-4 block">🛑</span>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Account Suspended</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Your access to Pub Ranker has been revoked by the platform administrator due to a violation of guidelines.</p>
                    <button onClick={() => auth.signOut()} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition">Log Out</button>
                </div>
            </div>
        );
    } else if (!userProfile.activeGroupId || !userProfile.groups.includes(userProfile.activeGroupId)) {
        currentScreen = (
            <div className="container mx-auto p-4 max-w-7xl">
                <GroupPortal user={user} userProfile={userProfile} auth={auth} db={db} />
            </div>
        );
    } else {
        currentScreen = (
            <div className="container mx-auto p-4 max-w-7xl">
                <MainApp user={user} userProfile={userProfile} groupId={userProfile.activeGroupId} auth={auth} db={db} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
            </div>
        );
    }

    // --- THE MASTER RENDER BLOCK ---
    // This ensures the banner is always at the top, no matter what screen is loaded!
    return (
        <>
            {globalAnnouncement && (
                <div className="bg-yellow-500 text-yellow-900 font-bold text-center p-3 shadow-md z-50 relative">
                    📢 {globalAnnouncement}
                </div>
            )}
            {currentScreen}
        </>
    );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function AuthScreen({ auth }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState("");

    const handleAuthAction = async () => {
        setError("");
        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
        } catch (e) {
            setError(e.message);
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
        } catch (e) {
            setError(e.message);
            console.error("Google Sign-In Error:", e);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full z-10">
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Welcome to Pub Ranker</h2>

                <div className="space-y-4">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    
                    <button onClick={handleAuthAction} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300">
                        {isSignUp ? 'Sign Up' : 'Log In'}
                    </button>
                    
                    <button onClick={handleGoogleSignIn} className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition duration-300 flex items-center justify-center">
                        Sign in with Google
                    </button>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

                <p className="text-center text-sm text-gray-600 mt-6">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 hover:underline ml-1 font-semibold">
                        {isSignUp ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}

function GroupPortal({ user, userProfile, auth, db }) {
    const [myGroups, setMyGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [error, setError] = useState("");

    const userRef = useMemo(() => db.collection("users").doc(user.uid), [user.uid, db]);

    useEffect(() => {
        if (!userProfile.groups || userProfile.groups.length === 0) {
            setLoadingGroups(false);
            setMyGroups([]);
            return;
        }

        setLoadingGroups(true);
        const unsub = db.collection("groups")
            .where(firebase.firestore.FieldPath.documentId(), "in", userProfile.groups)
            .onSnapshot(
                (snapshot) => {
                    const groupsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    setMyGroups(groupsData);
                    setLoadingGroups(false);
                },
                (err) => {
                    console.error("Error fetching group names", err);
                    setError("Could not load your groups.");
                    setLoadingGroups(false);
                }
            );

        return () => unsub();
    }, [userProfile.groups, db]);

    const handleSelectGroup = async (groupId) => {
        try { await userRef.update({ activeGroupId: groupId }); } 
        catch (e) { setError("Could not select group."); }
    };

    const handleLogout = async () => {
        try { await auth.signOut(); } 
        catch (error) { console.error("Error signing out", error); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">Pub Ranker Groups</h2>
                    <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition">Log Out</button>
                </div>

                <p className="text-lg text-gray-600 mb-6">Welcome, <span className="font-semibold">{userProfile.displayName}</span>! Choose a group to get started.</p>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-semibold text-gray-700">Your Groups</h3>
                        {loadingGroups ? (
                            <LoadingScreen text="Loading groups..." />
                        ) : myGroups.length === 0 ? (
                            <p className="text-gray-500">You haven't joined any groups yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {myGroups.map((group) => (
                                    <div key={group.id} className="flex gap-2 w-full">
                                        <button onClick={() => handleSelectGroup(group.id)} className="flex-1 text-left p-4 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
                                            <span className="text-xl font-semibold">{group.groupName}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}