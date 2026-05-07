import { useState, useEffect, useMemo } from 'react';
import { firebase } from '../firebase';
import LoadingScreen from '../components/LoadingScreen';

export default function GroupPortal({ user, userProfile, auth, db }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' | 'create' | 'join'
    const [newGroupName, setNewGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!user || !db) return;
        const unsubscribe = db.collection('groups')
            .where('members', 'array-contains', user.uid)
            .onSnapshot(snap => {
                setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user, db]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setSubmitting(true); setError('');
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            await db.collection('groups').add({
                name: newGroupName.trim(),
                code,
                members: [user.uid],
                admins: [user.uid],
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setSuccess(`Group "${newGroupName.trim()}" created!`);
            setNewGroupName('');
            setView('list');
        } catch (err) {
            setError('Failed to create group.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setSubmitting(true); setError('');
        try {
            const snap = await db.collection('groups').where('code', '==', joinCode.trim().toUpperCase()).get();
            if (snap.empty) { setError('No group found with that code.'); setSubmitting(false); return; }
            const groupDoc = snap.docs[0];
            if (groupDoc.data().members?.includes(user.uid)) {
                setError('You are already in this group.');
                setSubmitting(false); return;
            }
            await groupDoc.ref.update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });
            setSuccess(`Joined "${groupDoc.data().name}"!`);
            setJoinCode('');
            setView('list');
        } catch (err) {
            setError('Failed to join group.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white">Your Groups</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your pub crawl groups</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setView('join')} className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 font-bold text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">Join</button>
                    <button onClick={() => setView('create')} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition shadow">+ Create</button>
                </div>
            </div>

            {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 p-4 rounded-xl font-semibold">{success}</div>}
            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 p-4 rounded-xl font-semibold">{error}</div>}

            {view === 'create' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Create New Group</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name e.g. Wolves Pub Crawl" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setView('list')} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                            <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50">{submitting ? 'Creating...' : 'Create Group'}</button>
                        </div>
                    </form>
                </div>
            )}

            {view === 'join' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Join a Group</h3>
                    <form onSubmit={handleJoin} className="space-y-4">
                        <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter invite code e.g. AB12CD" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white uppercase tracking-widest font-bold" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setView('list')} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                            <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50">{submitting ? 'Joining...' : 'Join Group'}</button>
                        </div>
                    </form>
                </div>
            )}

            {groups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                    <span className="text-6xl block mb-4">🍻</span>
                    <h3 className="text-xl font-bold text-gray-700 dark:text-white mb-2">No groups yet</h3>
                    <p className="text-gray-400 mb-6">Create or join a group to start ranking pubs together.</p>
                    <button onClick={() => setView('create')} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl transition shadow">Create Your First Group</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map(group => (
                        <div key={group.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{group.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{group.members?.length || 1} member{(group.members?.length || 1) !== 1 ? 's' : ''} • Code: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{group.code}</span></p>
                            </div>
                            <div className="text-2xl">🍺</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
