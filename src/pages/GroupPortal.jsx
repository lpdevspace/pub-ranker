import { useState, useEffect, useMemo } from 'react';
import { firebase } from '../firebase';
import LoadingScreen from '../components/LoadingScreen';

export default function GroupPortal({ user, userProfile, auth, db }) {
    const [myGroups, setMyGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [createGroupName, setCreateGroupName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [publicGroups, setPublicGroups] = useState([]);
    const [searchCity, setSearchCity] = useState('');

    const userRef = useMemo(() => db.collection('users').doc(user.uid), [user.uid, db]);

    // Load user's own groups
    useEffect(() => {
        if (!userProfile.groups || userProfile.groups.length === 0) {
            setLoadingGroups(false);
            setMyGroups([]);
            return;
        }
        setLoadingGroups(true);
        const unsub = db
            .collection('groups')
            .where(firebase.firestore.FieldPath.documentId(), 'in', userProfile.groups)
            .onSnapshot(
                snap => {
                    setMyGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoadingGroups(false);
                },
                err => {
                    console.error('Error fetching group names', err);
                    setError('Could not load your groups.');
                    setLoadingGroups(false);
                }
            );
        return () => unsub();
    }, [userProfile.groups, db]);

    // Load public groups for discovery
    useEffect(() => {
        db.collection('groups')
            .where('isPublic', '==', true)
            .limit(20)
            .get()
            .then(snap => setPublicGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))))
            .catch(e => console.error('Error fetching public groups', e));
    }, [db]);

    const filteredPublicGroups = publicGroups.filter(g =>
        !searchCity || (g.city && g.city.toLowerCase().includes(searchCity.toLowerCase()))
    );

    const handleSelectGroup = async (groupId) => {
        try { await userRef.update({ activeGroupId: groupId }); }
        catch (e) { setError('Could not select group.'); }
    };

    const handleLogout = async () => {
        try { await auth.signOut(); }
        catch (e) { console.error('Error signing out', e); }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!createGroupName.trim()) return;
        setIsCreating(true);
        setError('');
        setMessage('');
        try {
            const newGroupRef = db.collection('groups').doc();
            await newGroupRef.set({
                groupName: createGroupName.trim(),
                ownerUid: user.uid,
                managers: [],
                members: [user.uid],
                pendingMembers: [],
                requireApproval: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            // Attach default criteria if configured
            try {
                const defaultsSnap = await db.collection('global').doc('defaults').get();
                if (defaultsSnap.exists && defaultsSnap.data().criteria) {
                    const batch = db.batch();
                    defaultsSnap.data().criteria.forEach((crit, index) => {
                        batch.set(newGroupRef.collection('criteria').doc(), {
                            name: crit.name,
                            type: crit.type,
                            weight: crit.weight || 1,
                            archived: false,
                            order: index,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    });
                    await batch.commit();
                }
            } catch (defaultsError) {
                console.error('Error attaching default criteria:', defaultsError);
            }
            await userRef.update({
                groups: firebase.firestore.FieldValue.arrayUnion(newGroupRef.id),
                activeGroupId: newGroupRef.id,
            });
        } catch (err) {
            console.error('Error creating group:', err);
            setError('Failed to create group.');
            setIsCreating(false);
        }
    };

    const handleJoinGroup = async (e, directGroupId = null) => {
        if (e) e.preventDefault();
        setError('');
        setMessage('');

        // Direct join from public listing
        if (directGroupId) {
            try {
                const groupRef = db.collection('groups').doc(directGroupId);
                const groupDoc = await groupRef.get();
                if (!groupDoc.exists) { setError('Group not found.'); return; }
                const groupData = groupDoc.data();
                if (groupData.members?.includes(userProfile.uid)) {
                    await userRef.update({ activeGroupId: directGroupId });
                    return;
                }
                if (groupData.pendingMembers?.includes(userProfile.uid)) {
                    setMessage('⏳ Your join request is still pending approval.');
                    return;
                }
                if (groupData.requireApproval) {
                    await groupRef.update({ pendingMembers: firebase.firestore.FieldValue.arrayUnion(userProfile.uid) });
                    setMessage('🔒 Request sent! An admin must approve you.');
                } else {
                    await groupRef.update({ members: firebase.firestore.FieldValue.arrayUnion(userProfile.uid) });
                    await userRef.update({
                        groups: firebase.firestore.FieldValue.arrayUnion(directGroupId),
                        activeGroupId: directGroupId,
                    });
                    setMessage('🎉 Successfully joined the group!');
                }
            } catch (err) {
                console.error('Error joining group:', err);
                setError('Failed to join group.');
            }
            return;
        }

        // Private invite code join
        const code = joinCode.trim();
        if (!code) return;
        try {
            const snap = await db.collection('groups').where('inviteCode', '==', code).limit(1).get();
            if (snap.empty) { setError('Invalid invite code. Please check and try again.'); return; }
            const groupDoc = snap.docs[0];
            const groupRef = groupDoc.ref;
            const groupData = groupDoc.data();
            const groupId = groupDoc.id;
            if (groupData.members?.includes(userProfile.uid)) {
                setError('You are already a member of this group!');
                await userRef.update({ activeGroupId: groupId });
                return;
            }
            if (groupData.pendingMembers?.includes(userProfile.uid)) {
                setMessage('⏳ Your join request is still pending approval.');
                return;
            }
            if (groupData.requireApproval) {
                await groupRef.update({ pendingMembers: firebase.firestore.FieldValue.arrayUnion(userProfile.uid) });
                setMessage('🔒 Request sent! An admin must approve you before you can enter.');
            } else {
                await groupRef.update({ members: firebase.firestore.FieldValue.arrayUnion(userProfile.uid) });
                await userRef.update({
                    groups: firebase.firestore.FieldValue.arrayUnion(groupId),
                    activeGroupId: groupId,
                });
                setMessage('🎉 Successfully joined the group!');
            }
            setJoinCode('');
        } catch (err) {
            console.error('Error joining group:', err);
            setError('Failed to join group. Please try again.');
        }
    };

    return (
        <div className="min-h-screen py-10 px-4 transition-colors animate-fadeIn">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header bar */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            Pub Ranker
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                            Welcome back, <span className="font-bold text-gray-900 dark:text-white">{userProfile.displayName}</span>!
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 px-6 py-3 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm w-full md:w-auto"
                    >
                        Log Out
                    </button>
                </div>

                {error && <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl font-bold shadow-sm">{error}</div>}
                {message && <div className="bg-blue-50 text-blue-700 border border-blue-200 p-4 rounded-xl font-bold shadow-sm">{message}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: your groups + join/create */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Your Groups */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                                Your Groups
                            </h3>
                            {loadingGroups ? (
                                <LoadingScreen text="Loading groups..." />
                            ) : myGroups.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 italic text-center py-6">
                                    You haven't joined any groups yet.
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {myGroups.map(group => (
                                        <button
                                            key={group.id}
                                            onClick={() => handleSelectGroup(group.id)}
                                            className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm hover:shadow-md transition group flex justify-between items-center"
                                        >
                                            <span className="text-lg font-bold text-gray-800 dark:text-white">{group.groupName}</span>
                                            <span className="text-gray-400">→</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Join / Create */}
                        <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700">
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Join via Code</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a private invite code from a friend.</p>
                                </div>
                                <form onSubmit={handleJoinGroup} className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                        placeholder="e.g. PINT-2024"
                                        className="px-4 py-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                                    />
                                    <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm w-full">
                                        Join Group
                                    </button>
                                </form>
                            </div>
                            <div className="border-t border-gray-100 dark:border-gray-700" />
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Create a Group</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Start a fresh leaderboard with your mates.</p>
                                </div>
                                <form onSubmit={handleCreateGroup} className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={createGroupName}
                                        onChange={e => setCreateGroupName(e.target.value)}
                                        placeholder="e.g. The Friday Pint Club"
                                        className="px-4 py-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold hover:opacity-80 transition disabled:opacity-50 shadow-sm w-full"
                                    >
                                        {isCreating ? 'Creating...' : 'Create Group'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Right: explore public groups */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700 flex flex-col h-full">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white">🌍 Explore Public Groups</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Find local communities and compete on their leaderboards.
                                </p>
                            </div>
                            <input
                                type="text"
                                placeholder="Search City..."
                                value={searchCity}
                                onChange={e => setSearchCity(e.target.value)}
                                className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 shadow-inner dark:text-white"
                            />
                        </div>

                        {filteredPublicGroups.length === 0 ? (
                            <div className="text-center my-auto py-12">
                                <span className="text-6xl mb-4 block opacity-50">🍺</span>
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No public groups found.</p>
                                <p className="text-sm text-gray-400 mt-2">Create your own group on the left and set it to Public!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
                                {filteredPublicGroups.map(group => {
                                    const isMember = group.members?.includes(userProfile.uid);
                                    const isPending = group.pendingMembers?.includes(userProfile.uid);
                                    return (
                                        <div
                                            key={group.id}
                                            className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-600 transition-colors flex flex-col h-full"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="text-3xl">
                                                    {group.coverPhoto
                                                        ? <img src={group.coverPhoto} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="Cover" />
                                                        : '🍻'}
                                                </div>
                                                {group.requireApproval
                                                    ? <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Private</span>
                                                    : <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Open</span>}
                                            </div>
                                            <h4 className="text-xl font-black text-gray-900 dark:text-white truncate">{group.groupName}</h4>
                                            <p className="text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wider uppercase mt-1 mb-4">
                                                📍 {group.city || 'Global'}
                                            </p>
                                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-6">
                                                <span>👥 {group.members?.length || 1} Members</span>
                                                <span>🍺 {group.pubCount || 0} Pubs</span>
                                            </div>
                                            <div className="mt-auto">
                                                {isMember ? (
                                                    <button
                                                        onClick={() => handleSelectGroup(group.id)}
                                                        className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-80 transition shadow-sm"
                                                    >
                                                        Enter Dashboard
                                                    </button>
                                                ) : isPending ? (
                                                    <button disabled className="w-full py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-xl font-bold cursor-not-allowed">
                                                        ⏳ Request Pending
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleJoinGroup(null, group.id)}
                                                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md"
                                                    >
                                                        {group.requireApproval ? 'Request to Join' : 'Join Instantly'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
