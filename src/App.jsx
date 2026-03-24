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
    const [showAuth, setShowAuth] = useState(false);
    const [featureFlags, setFeatureFlags] = useState({}); // <-- ADD THIS LINE

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

    useEffect(() => {
        let profileUnsubscribe = null;

        const authUnsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (profileUnsubscribe) { profileUnsubscribe(); profileUnsubscribe = null; }

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
                        } catch (e) { console.error(e); } 
                        finally { setAuthLoading(false); }
                    }
                }, (error) => {
                    console.error("Error listening to user profile:", error);
                    setAuthLoading(false);
                });
            } else {
                setUser(null);
                setUserProfile(null);
                setAuthLoading(false);
                setShowAuth(false); 
            }
        });

        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = db.collection('global').doc('settings').onSnapshot((doc) => {
            if (doc.exists) {
                setGlobalAnnouncement(doc.data().announcement || "");
                setIsMaintenanceMode(doc.data().maintenanceMode || false);
                setFeatureFlags(doc.data().featureFlags || {}); // <-- ADD THIS LINE
            } else {
                setGlobalAnnouncement("");
                setIsMaintenanceMode(false);
            }
        });
        return () => unsubscribe();
    }, []);

    let currentScreen;
    if (authLoading) currentScreen = <LoadingScreen text="Loading Authentication..." />;
    else if (!user) currentScreen = showAuth ? <AuthScreen auth={auth} onBack={() => setShowAuth(false)} /> : <PublicLandingPage db={db} onLoginClick={() => setShowAuth(true)} />;
    else if (!userProfile) currentScreen = <LoadingScreen text="Loading User Profile..." />;
    else if (isMaintenanceMode && !userProfile?.isSuperAdmin) currentScreen = (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border-t-8 border-yellow-500">
                <span className="text-6xl mb-4 block">🚧</span>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Under Maintenance</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Pub Ranker is currently undergoing scheduled maintenance. We'll be back shortly!</p>
                <button onClick={() => auth.signOut()} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">Log Out</button>
            </div>
        </div>
    );
    else if (userProfile.isBanned) currentScreen = (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border-t-8 border-red-600">
                <span className="text-6xl mb-4 block">🛑</span>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Account Suspended</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Your access has been revoked.</p>
                <button onClick={() => auth.signOut()} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition">Log Out</button>
            </div>
        </div>
    );
    else if (!userProfile.activeGroupId || !userProfile.groups.includes(userProfile.activeGroupId)) currentScreen = <div className="container mx-auto p-4 max-w-7xl"><GroupPortal user={user} userProfile={userProfile} auth={auth} db={db} /></div>;
    else currentScreen = <div className="container mx-auto p-4 max-w-7xl"><MainApp user={user} userProfile={userProfile} groupId={userProfile.activeGroupId} auth={auth} db={db} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} featureFlags={featureFlags}/></div>;

    return (
        <>
            {isMaintenanceMode && userProfile?.isSuperAdmin && <div className="bg-red-600 text-white font-bold text-center p-3 shadow-md z-[60] relative animate-pulse">🚧 MAINTENANCE MODE IS ACTIVE 🚧</div>}
            {globalAnnouncement && <div className="bg-yellow-500 text-yellow-900 font-bold text-center p-3 shadow-md z-50 relative">📢 {globalAnnouncement}</div>}
            {currentScreen}
        </>
    );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function PublicLandingPage({ db, onLoginClick }) {
    const [publicGroups, setPublicGroups] = useState([]);
    const [searchCity, setSearchCity] = useState(""); // FEATURE 2: CITY FILTER
    const [previewGroup, setPreviewGroup] = useState(null); // FEATURE 1: PREVIEW
    const [previewPubs, setPreviewPubs] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        db.collection('groups').where('isPublic', '==', true).limit(50).get()
          .then(async snap => {
              const groupsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              const enrichedGroups = await Promise.all(groupsData.map(async (g) => {
                  try {
                      const topDocs = await db.collection('pubs').where('groupId', '==', g.id).get().catch(()=>({size:0}));
                      return { ...g, pubCount: topDocs.size };
                  } catch (e) { return { ...g, pubCount: 0 }; }
              }));
              setPublicGroups(enrichedGroups);
          })
          .catch(e => console.error("Error fetching public groups", e));
    }, [db]);

    const filteredGroups = publicGroups.filter(g => 
        !searchCity || (g.city && g.city.toLowerCase().includes(searchCity.toLowerCase()))
    );

    // FEATURE 1: GUEST PREVIEW LOGIC
    const handlePreview = async (group) => {
        setPreviewGroup(group);
        setLoadingPreview(true);
        try {
            const snap = await db.collection('pubs').where('groupId', '==', group.id).get();
            const fetchedPubs = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
            // Sort by average score (assuming it's calculated or stored, otherwise just newest)
            fetchedPubs.sort((a,b) => (b.avgScore || 0) - (a.avgScore || 0));
            setPreviewPubs(fetchedPubs.slice(0, 5)); // Top 5
        } catch(e) { console.error(e); }
        setLoadingPreview(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white animate-fadeIn relative">
            <header className="p-6 max-w-7xl mx-auto flex justify-between items-center relative z-10">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pub Ranker</h1>
                <button onClick={onLoginClick} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition shadow-md">Sign In</button>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center relative z-10">
                <span className="text-6xl md:text-8xl mb-6 block drop-shadow-lg">🍻</span>
                <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-gray-900 dark:text-white">Stop arguing.<br/><span className="text-blue-600 dark:text-blue-400">Start ranking.</span></h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">The ultimate platform for you and your mates to rank, review, and map out the best pubs in your city.</p>
                <button onClick={onLoginClick} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-black text-xl hover:scale-105 transition transform shadow-xl hover:shadow-blue-500/25">
                    Create Your Free Group
                </button>
            </main>

            <section className="max-w-7xl mx-auto px-6 py-16">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 gap-4">
                    <h3 className="text-2xl font-bold">🌍 Explore Public City Leaderboards</h3>
                    {/* FEATURE 2: SEARCH */}
                    <input type="text" placeholder="Search by City..." value={searchCity} onChange={(e) => setSearchCity(e.target.value)} className="px-4 py-2 border dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64 shadow-sm" />
                </div>

                {filteredGroups.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No public groups found. Be the first to put your city on the map!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGroups.map(group => (
                            <div key={group.id} onClick={() => handlePreview(group)} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl transition transform hover:-translate-y-1 relative overflow-hidden cursor-pointer group/card">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-4xl">{group.coverPhoto ? <img src={group.coverPhoto} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt="Cover" /> : '🍻'}</div>
                                    <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider group-hover/card:bg-blue-600 group-hover/card:text-white transition">Preview Top 5</span>
                                </div>
                                <h4 className="text-xl font-black mb-1 truncate">{group.groupName}</h4>
                                <p className="text-blue-600 dark:text-blue-400 text-sm mb-4 font-bold tracking-wider uppercase">📍 {group.city || "Global"}</p>
                                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-gray-400">Members</span><span className="text-lg font-black">👥 {group.members?.length || 1}</span></div>
                                    <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-gray-400">Pubs Ranked</span><span className="text-lg font-black">🍺 {group.pubCount}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* FEATURE 1: PREVIEW MODAL */}
            {previewGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full relative border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setPreviewGroup(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                        <h3 className="text-2xl font-black mb-1">{previewGroup.groupName}'s Top Pubs</h3>
                        <p className="text-gray-500 text-sm mb-6">📍 {previewGroup.city}</p>
                        
                        {loadingPreview ? <p className="text-center text-gray-500 my-8">Loading rankings...</p> : (
                            <div className="space-y-3">
                                {previewPubs.length === 0 ? <p className="text-gray-500 italic text-center">No pubs rated yet.</p> : previewPubs.map((pub, index) => (
                                    <div key={pub.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">{index + 1}</div>
                                        {pub.photoURL && <img src={pub.photoURL} alt={pub.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold truncate dark:text-white">{pub.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{pub.location}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">Want to see the full scores or challenge their rankings?</p>
                            <button onClick={() => { setPreviewGroup(null); onLoginClick(); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-700 transition">Sign Up to Join Group</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AuthScreen({ auth, onBack }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState("");

    const handleAuthAction = async () => {
        setError("");
        try {
            if (isSignUp) await auth.createUserWithEmailAndPassword(email, password);
            else await auth.signInWithEmailAndPassword(email, password);
        } catch (e) { setError(e.message); }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        const provider = new firebase.auth.GoogleAuthProvider();
        try { await auth.signInWithPopup(provider); } 
        catch (e) { setError(e.message); }
    };

    // FEATURE 3: APPLE SIGN IN
    const handleAppleSignIn = async () => {
        setError("");
        const provider = new firebase.auth.OAuthProvider('apple.com');
        try { await auth.signInWithPopup(provider); } 
        catch (e) { setError(e.message); }
    };

    const handleFacebookSignIn = async () => {
        setError("");
        const provider = new firebase.auth.FacebookAuthProvider();
        try { await auth.signInWithPopup(provider); } 
        catch (e) { setError(e.message); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full relative">
                <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition font-bold">← Back</button>
                <h2 className="text-3xl font-black mb-8 text-center text-gray-800 dark:text-white mt-6">Welcome to Pub Ranker</h2>

                <div className="space-y-4 mb-6">
                    <button onClick={handleGoogleSignIn} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2 shadow-sm">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" /> Sign in with Google
                    </button>
                    {/* APPLE BUTTON */}
                    <button onClick={handleAppleSignIn} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition flex items-center justify-center gap-2 shadow-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.43.987 3.96.948 1.567-.04 2.613-1.5 3.616-2.978 1.155-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.55 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z"/></svg> Sign in with Apple
                    </button>
                    <button onClick={handleFacebookSignIn} className="w-full bg-[#1877F2] text-white py-3 rounded-xl font-bold hover:bg-[#166FE5] transition flex items-center justify-center gap-2 shadow-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Sign in with Facebook
                    </button>
                </div>

                <div className="relative flex items-center py-2 mb-6">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold tracking-wider">Or continue with email</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                <div className="space-y-3">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    
                    <button onClick={handleAuthAction} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-md">
                        {isSignUp ? 'Sign Up' : 'Log In'}
                    </button>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 text-center font-bold">{error}</p>}

                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 dark:text-blue-400 hover:underline ml-1 font-bold">
                        {isSignUp ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}

// ... Keep your existing GroupPortal code here exactly as it is ...
function GroupPortal({ user, userProfile, auth, db }) {
    const [myGroups, setMyGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [joinCode, setJoinCode] = useState("");
    const [createGroupName, setCreateGroupName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

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
                pendingMembers: [], 
                requireApproval: false, 
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // --- NEW: FETCH AND INJECT GLOBAL DEFAULT CRITERIA ---
            try {
                const defaultsSnap = await db.collection('global').doc('defaults').get();
                if (defaultsSnap.exists && defaultsSnap.data().criteria) {
                    const criteriaList = defaultsSnap.data().criteria;
                    const batch = db.batch(); // Use a batch to write them all at once instantly!
                    
                    criteriaList.forEach((crit, index) => {
                        const critRef = newGroupRef.collection('criteria').doc();
                        batch.set(critRef, {
                            name: crit.name,
                            type: crit.type,
                            weight: crit.weight || 1,
                            archived: false,
                            order: index,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    
                    await batch.commit();
                }
            } catch (defaultsError) {
                console.error("Error attaching default criteria:", defaultsError);
                // We don't fail group creation if this fails, we just log it.
            }

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

            if (groupData.members?.includes(userProfile.uid)) {
                setError("You are already a member of this group!");
                await userRef.update({ activeGroupId: code.trim() });
                return;
            }

            if (groupData.pendingMembers?.includes(userProfile.uid)) {
                setMessage("⏳ Your join request is still pending approval by an admin.");
                return;
            }

            if (groupData.requireApproval) {
                await groupRef.update({
                    pendingMembers: firebase.firestore.FieldValue.arrayUnion(userProfile.uid)
                });
                setMessage("🔒 Request sent! An admin must approve you before you can enter.");
                setJoinCode("");
            } else {
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-100 dark:border-gray-700">
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pub Ranker</h2>
                    <button onClick={handleLogout} className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition">Log Out</button>
                </div>

                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">Welcome, <span className="font-bold text-gray-900 dark:text-white">{userProfile.displayName}</span>!</p>
                
                {error && <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg font-bold mb-6">{error}</div>}
                {message && <div className="bg-blue-50 text-blue-700 border border-blue-200 p-3 rounded-lg font-bold mb-6">{message}</div>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Your Groups</h3>
                        {loadingGroups ? (
                            <LoadingScreen text="Loading groups..." />
                        ) : myGroups.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 italic">You haven't joined any groups yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {myGroups.map((group) => (
                                    <button key={group.id} onClick={() => handleSelectGroup(group.id)} className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition group flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{group.groupName}</span>
                                        <span className="text-gray-400 group-hover:text-blue-500">→</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-8 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-600">
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Join a Group</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Enter an invite code from a friend.</p>
                            <form onSubmit={handleJoinGroup} className="flex gap-2">
                                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. 8xJ9pL..." className="flex-1 px-4 py-2 border dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Join</button>
                            </form>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600"></div>

                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Create a Group</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Start a fresh leaderboard with your mates.</p>
                            <form onSubmit={handleCreateGroup} className="flex gap-2">
                                <input type="text" value={createGroupName} onChange={(e) => setCreateGroupName(e.target.value)} placeholder="e.g. The Friday Pint Club" className="flex-1 px-4 py-2 border dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                <button type="submit" disabled={isCreating} className="bg-gray-800 dark:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-900 transition disabled:opacity-50">
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