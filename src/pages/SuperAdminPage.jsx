import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

export default function SuperAdminPage({ db, userProfile }) {
    const [activeTab, setActiveTab] = useState('overview'); // overview, pubs, users, feedback
    
    // Data States
    const [stats, setStats] = useState({ users: 0, groups: 0, pubs: 0 });
    const [groupsList, setGroupsList] = useState([]);
    const [pubsList, setPubsList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Announcement State
    const [announcement, setAnnouncement] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);

    // Modal States
    const [modalType, setModalType] = useState(null); 
    const [selectedItem, setSelectedItem] = useState(null);
    const [editString, setEditString] = useState("");

    const fetchGlobalData = async () => {
        try {
            // Fetch everything
            const [usersSnap, groupsSnap, pubsSnap, feedbackSnap, annDoc] = await Promise.all([
                db.collection('users').get(),
                db.collection('groups').get(),
                db.collection('pubs').get(),
                db.collection('feedback').get(),
                db.collection('global').doc('settings').get()
            ]);

            setStats({ users: usersSnap.size, groups: groupsSnap.size, pubs: pubsSnap.size });

            // Parse Groups
            const groupsData = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            groupsData.sort((a, b) => (a.groupName || "").localeCompare(b.groupName || ""));
            setGroupsList(groupsData);

            // Parse Pubs
            const pubsData = pubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPubsList(pubsData);

            // Parse Users
            const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsersList(usersData);

            // Parse Feedback
            const feedbackData = feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            feedbackData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)); // Newest first
            setFeedbackList(feedbackData);

            // Fetch current announcement
            if (annDoc.exists) setAnnouncement(annDoc.data().announcement || "");
            
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userProfile?.isSuperAdmin) return;
        fetchGlobalData();
    }, [db, userProfile]);

    // --- 📢 ANNOUNCEMENT LOGIC ---
    const handlePublishAnnouncement = async () => {
        setIsPublishing(true);
        try {
            await db.collection('global').doc('settings').set({ 
                announcement: announcement.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            alert("Announcement published globally!");
        } catch (error) { alert("Failed to publish."); }
        setIsPublishing(false);
    };

    const handleClearAnnouncement = async () => {
        setAnnouncement("");
        setIsPublishing(true);
        try { await db.collection('global').doc('settings').set({ announcement: "" }, { merge: true }); } 
        catch (error) { console.error(error); }
        setIsPublishing(false);
    };

    // --- 🍻 PUB MODERATION ---
    const handleDeletePub = async (pubId) => {
        if (!window.confirm("Delete this pub globally? This will break ratings for users who scored it.")) return;
        try {
            await db.collection('pubs').doc(pubId).delete();
            setPubsList(pubsList.filter(p => p.id !== pubId));
            setStats(prev => ({ ...prev, pubs: prev.pubs - 1 }));
        } catch (error) { alert("Failed to delete pub."); }
    };

    // --- 🔨 USER MODERATION (BAN HAMMER) ---
    const handleToggleBan = async (user) => {
        const action = user.isBanned ? "UNBAN" : "BAN";
        if (!window.confirm(`Are you sure you want to ${action} ${user.displayName}?`)) return;
        try {
            await db.collection('users').doc(user.id).update({ isBanned: !user.isBanned });
            setUsersList(usersList.map(u => u.id === user.id ? { ...u, isBanned: !user.isBanned } : u));
        } catch (error) { alert("Failed to update user status."); }
    };

    // --- 📥 FEEDBACK INBOX ---
    const handleResolveFeedback = async (id, currentStatus) => {
        try {
            await db.collection('feedback').doc(id).update({ resolved: !currentStatus });
            setFeedbackList(feedbackList.map(f => f.id === id ? { ...f, resolved: !currentStatus } : f));
        } catch (error) { alert("Failed to update feedback."); }
    };

    const handleDeleteFeedback = async (id) => {
        if (!window.confirm("Delete this feedback?")) return;
        try {
            await db.collection('feedback').doc(id).delete();
            setFeedbackList(feedbackList.filter(f => f.id !== id));
        } catch (error) { alert("Failed to delete feedback."); }
    };

    if (!userProfile?.isSuperAdmin) return <div className="p-8 text-center text-red-500 font-bold text-xl">🛑 Access Denied.</div>;
    if (loading) return <div className="p-8 text-center animate-pulse dark:text-gray-300">Fetching global metrics...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Platform Command Center</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, Super Admin. God Mode activated.</p>
                </div>
                {/* TABS */}
                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                    {['overview', 'pubs', 'users', 'feedback'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                        >
                            {tab === 'feedback' && feedbackList.filter(f => !f.resolved).length > 0 && '🔴 '}
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* ========================================= */}
            {/* TAB 1: OVERVIEW & GROUPS                  */}
            {/* ========================================= */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Global Announcement Broadcast</h3>
                        <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Type an announcement to display to all users..." className="w-full p-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 dark:text-white mb-3 resize-none h-20" />
                        <div className="flex gap-3">
                            <button onClick={handlePublishAnnouncement} disabled={isPublishing || !announcement.trim()} className="bg-yellow-500 text-white px-4 py-2 rounded font-semibold hover:bg-yellow-600 disabled:opacity-50">Publish to All Users</button>
                            <button onClick={handleClearAnnouncement} disabled={isPublishing || !announcement} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded font-semibold hover:bg-gray-300 disabled:opacity-50">Clear Banner</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Total Users</h3>
                            <p className="text-4xl font-black mt-1">{stats.users}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Total Groups</h3>
                            <p className="text-4xl font-black mt-1">{stats.groups}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Total Pubs</h3>
                            <p className="text-4xl font-black mt-1">{stats.pubs}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-bold text-gray-800 dark:text-white">Active Groups</h3></div>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                    <tr><th className="p-3">Group Name</th><th className="p-3 text-center">Members</th><th className="p-3">Owner ID</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                    {groupsList.map(g => (
                                        <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 font-bold">{g.groupName}</td>
                                            <td className="p-3 text-center"><span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 py-1 px-2 rounded-full font-semibold text-xs">{g.members?.length || 0}</span></td>
                                            <td className="p-3 font-mono text-xs text-gray-500 truncate max-w-[150px]">{g.ownerUid}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* TAB 2: GLOBAL PUB DIRECTORY               */}
            {/* ========================================= */}
            {activeTab === 'pubs' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-bold text-gray-800 dark:text-white">Global Pub Directory</h3></div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                <tr><th className="p-3">Photo</th><th className="p-3">Pub Name</th><th className="p-3">Location</th><th className="p-3 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                {pubsList.map(pub => (
                                    <tr key={pub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-3 w-16">{pub.photoURL ? <img src={pub.photoURL} alt="pub" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center text-xl">🍺</div>}</td>
                                        <td className="p-3 font-bold">{pub.name}</td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">{pub.location || 'Unknown'}</td>
                                        <td className="p-3 text-right"><button onClick={() => handleDeletePub(pub.id)} className="text-red-500 hover:text-red-700 font-semibold text-xs bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">Delete</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* TAB 3: USER DIRECTORY & THE BAN HAMMER    */}
            {/* ========================================= */}
            {activeTab === 'users' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-bold text-gray-800 dark:text-white">User Directory</h3></div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">UID</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Ban Hammer</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                {usersList.map(u => (
                                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${u.isBanned ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''}`}>
                                        <td className="p-3 font-bold flex items-center gap-2">
                                            {u.avatarUrl && <img src={u.avatarUrl} className="w-6 h-6 rounded-full" alt="avatar"/>}
                                            {u.displayName || 'Unknown'} {u.isSuperAdmin && '👑'}
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                                        <td className="p-3 font-mono text-xs text-gray-400 max-w-[100px] truncate">{u.id}</td>
                                        <td className="p-3 text-center">
                                            {u.isBanned ? <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">BANNED</span> : <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">ACTIVE</span>}
                                        </td>
                                        <td className="p-3 text-right">
                                            {!u.isSuperAdmin && (
                                                <button onClick={() => handleToggleBan(u)} className={`font-semibold text-xs px-3 py-1 rounded text-white ${u.isBanned ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700 shadow-md transform hover:scale-105 transition-all'}`}>
                                                    {u.isBanned ? 'Restore User' : 'BAN USER'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* TAB 4: FEEDBACK & BUG REPORTS INBOX       */}
            {/* ========================================= */}
            {activeTab === 'feedback' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Feedback Inbox</h3>
                        <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-bold">{feedbackList.length} Messages</span>
                    </div>
                    
                    {feedbackList.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center text-gray-500 dark:text-gray-400">No feedback submitted yet!</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {feedbackList.map(item => (
                                <div key={item.id} className={`p-4 rounded-lg shadow-sm border-l-4 transition-colors ${item.resolved ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 opacity-70' : 'bg-white dark:bg-gray-800 border-blue-500'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${item.type === 'bug' ? 'bg-red-100 text-red-800' : item.type === 'feature' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {item.type}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                From: {item.userName} ({item.userEmail})
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleResolveFeedback(item.id, item.resolved)} className={`text-xs font-semibold px-2 py-1 rounded ${item.resolved ? 'text-gray-600 bg-gray-200 hover:bg-gray-300' : 'text-green-800 bg-green-100 hover:bg-green-200'}`}>
                                                {item.resolved ? 'Mark Unresolved' : '✔️ Resolve'}
                                            </button>
                                            <button onClick={() => handleDeleteFeedback(item.id)} className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded font-semibold">Delete</button>
                                        </div>
                                    </div>
                                    <p className="text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap">{item.message}</p>
                                    <p className="text-xs text-gray-400 mt-2">{item.createdAt ? new Date(item.createdAt.toDate()).toLocaleString() : 'Recent'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}