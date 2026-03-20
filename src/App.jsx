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
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

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

    // --- GLOBAL SETTINGS LOGIC ---
     useEffect(() => {
     const unsubscribe = db.collection('global').doc('settings').onSnapshot((doc) => {
         if (doc.exists) {
             setGlobalAnnouncement(doc.data().announcement || "");
             setIsMaintenanceMode(doc.data().maintenanceMode || false);
         } else {
             setGlobalAnnouncement("");
             setIsMaintenanceMode(false);
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
    } else if (isMaintenanceMode && !userProfile?.isSuperAdmin) {
     // --- THE MAINTENANCE SCREEN ---
     currentScreen = (
         <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-center">
             <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border-t-8 border-yellow-500">
                 <span className="text-6xl mb-4 block">🚧</span>
                 <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Under Maintenance</h1>
                 <p className="text-gray-600 dark:text-gray-400 mb-6">Pub Ranker is currently undergoing scheduled maintenance to add awesome new features. We'll be back shortly!</p>
                 <button onClick={() => auth.signOut()} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">Log Out</button>
             </div>
         </div>
     );
 } else if (userProfile.isBanned) {
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
            {/* 🚧 NEW: MAINTENANCE MODE REMINDER FOR ADMINS */}
            {isMaintenanceMode && userProfile?.isSuperAdmin && (
                <div className="bg-red-600 text-white font-bold text-center p-3 shadow-md z-[60] relative animate-pulse">
                    🚧 MAINTENANCE MODE IS ACTIVE 🚧 — All normal users are currently locked out!
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
    
    // State for joining and creating
    const [joinCode, setJoinCode] = useState("");
    const [createGroupName, setCreateGroupName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    
    // Messages
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const userRef = useMemo(() => db.collection("users").doc(user.uid), [user.uid, db]);

    // Fetch User's Existing Groups
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

    // Select an Active Group
    const handleSelectGroup = async (groupId) => {
        try { await userRef.update({ activeGroupId: groupId }); } 
        catch (e) { setError("Could not select group."); }
    };

    // Logout
    const handleLogout = async () => {
        try { await auth.signOut(); } 
        catch (error) { console.error("Error signing out", error); }
    };

    // --- CREATE A NEW GROUP ---
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!createGroupName.trim()) return;
        setIsCreating(true);
        setError("");
        setMessage("");

        try {
            const newGroupRef = db.collection("groups").doc();
            await newGroupRef.set({
                groupName: createGroupName.trim(),
                ownerUid: user.uid,
                managers: [],
                members: [user.uid],
                pendingMembers: [], // Setup for privacy feature
                requireApproval: false, // Default to public
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            await userRef.update({
                groups: firebase.firestore.FieldValue.arrayUnion(newGroupRef.id),
                activeGroupId: newGroupRef.id
            });
        } catch (err) {
            console.error("Error creating group:", err);
            setError("Failed to create group.");
            setIsCreating(false);
        }
    };

    // --- SECURE: JOIN AN EXISTING GROUP ---
    const handleJoinGroup = async (e, codeFromUrl = null) => {
        if (e) e.preventDefault();
        
        const code = codeFromUrl || joinCode;
        if (!code || !code.trim()) return;

        setError("");
        setMessage("");

        try {
            const groupRef = db.collection("groups").doc(code.trim());
            const groupDoc = await groupRef.get();

            if (!groupDoc.exists) {
                setError("Group not found! Please check the code and try again.");
                return;
            }

            const groupData = groupDoc.data();

            // 1. Check if already in group
            if (groupData.members?.includes(userProfile.uid)) {
                setError("You are already a member of this group!");
                await userRef.update({ activeGroupId: code.trim() });
                return;
            }

            // 2. Check if already waiting for approval
            if (groupData.pendingMembers?.includes(userProfile.uid)) {
                setMessage("⏳ Your join request is still pending approval by an admin.");
                return;
            }

            // 3. THE SECURITY RULE: Does this group require approval?
            if (groupData.requireApproval) {
                await groupRef.update({
                    pendingMembers: firebase.firestore.FieldValue.arrayUnion(userProfile.uid)
                });
                setMessage("🔒 Request sent! An admin must approve you before you can enter.");
                setJoinCode("");
            } else {
                // 4. Public Group: Instant Join
                await groupRef.update({
                    members: firebase.firestore.FieldValue.arrayUnion(userProfile.uid)
                });
                await userRef.update({
                    groups: firebase.firestore.FieldValue.arrayUnion(code.trim()),
                    activeGroupId: code.trim()
                });
                setMessage("🎉 Successfully joined the group!");
                setJoinCode("");
            }
        } catch (err) {
            console.error("Error joining group:", err);
            setError("Failed to join group. Please try again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl w-full">
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-gray-800">Pub Ranker</h2>
                    <button onClick={handleLogout} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition">Log Out</button>
                </div>

                <p className="text-lg text-gray-600 mb-6">Welcome, <span className="font-bold text-gray-900">{userProfile.displayName}</span>!</p>
                
                {/* System Messages */}
                {error && <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg font-bold mb-6">{error}</div>}
                {message && <div className="bg-blue-50 text-blue-700 border border-blue-200 p-3 rounded-lg font-bold mb-6">{message}</div>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* LEFT COLUMN: Existing Groups */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Your Groups</h3>
                        {loadingGroups ? (
                            <LoadingScreen text="Loading groups..." />
                        ) : myGroups.length === 0 ? (
                            <p className="text-gray-500 italic">You haven't joined any groups yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {myGroups.map((group) => (
                                    <button key={group.id} onClick={() => handleSelectGroup(group.id)} className="w-full text-left p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition group flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-800 group-hover:text-blue-600">{group.groupName}</span>
                                        <span className="text-gray-400 group-hover:text-blue-500">→</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Join / Create */}
                    <div className="space-y-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                        
                        {/* Join Group */}
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-800">Join a Group</h3>
                            <p className="text-sm text-gray-500">Enter an invite code from a friend.</p>
                            <form onSubmit={handleJoinGroup} className="flex gap-2">
                                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. 8xJ9pL..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Join</button>
                            </form>
                        </div>

                        <div className="border-t border-gray-200"></div>

                        {/* Create Group */}
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-800">Create a Group</h3>
                            <p className="text-sm text-gray-500">Start a fresh leaderboard with your mates.</p>
                            <form onSubmit={handleCreateGroup} className="flex gap-2">
                                <input type="text" value={createGroupName} onChange={(e) => setCreateGroupName(e.target.value)} placeholder="e.g. The Friday Pint Club" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                <button type="submit" disabled={isCreating} className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-900 transition disabled:opacity-50">
                                    {isCreating ? "..." : "Create"}
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}