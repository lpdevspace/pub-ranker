import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase'; // Need this for Firestore server timestamps

export default function SuperAdminPage({ db, userProfile }) {
    const [stats, setStats] = useState({ users: 0, groups: 0, pubs: 0 });
    const [groupsList, setGroupsList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Announcement State
    const [announcement, setAnnouncement] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);

    // Modal States
    const [modalType, setModalType] = useState(null); // 'view', 'edit', 'delete', or null
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [editGroupName, setEditGroupName] = useState("");

    const fetchGlobalData = async () => {
        try {
            const usersSnap = await db.collection('users').get();
            const groupsSnap = await db.collection('groups').get();
            const pubsSnap = await db.collection('pubs').get();

            setStats({
                users: usersSnap.size,
                groups: groupsSnap.size,
                pubs: pubsSnap.size
            });

            const groupsData = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            groupsData.sort((a, b) => (a.groupName || "").localeCompare(b.groupName || ""));
            setGroupsList(groupsData);

            // Fetch current announcement
            const annDoc = await db.collection('global').doc('settings').get();
            if (annDoc.exists) {
                setAnnouncement(annDoc.data().announcement || "");
            }
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

    // --- ANNOUNCEMENT LOGIC ---
    const handlePublishAnnouncement = async () => {
        setIsPublishing(true);
        try {
            await db.collection('global').doc('settings').set({ 
                announcement: announcement.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            alert("Announcement published globally!");
        } catch (error) {
            console.error("Error publishing:", error);
            alert("Failed to publish.");
        }
        setIsPublishing(false);
    };

    const handleClearAnnouncement = async () => {
        setAnnouncement("");
        setIsPublishing(true);
        try {
            await db.collection('global').doc('settings').set({ announcement: "" }, { merge: true });
        } catch (error) {
            console.error("Error clearing:", error);
        }
        setIsPublishing(false);
    };

    // --- GROUP ACTIONS LOGIC ---
    const openModal = (type, group) => {
        setSelectedGroup(group);
        setModalType(type);
        if (type === 'edit') setEditGroupName(group.groupName);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedGroup(null);
    };

    const handleUpdateGroup = async () => {
        if (!editGroupName.trim()) return;
        try {
            await db.collection('groups').doc(selectedGroup.id).update({ groupName: editGroupName.trim() });
            setGroupsList(groupsList.map(g => g.id === selectedGroup.id ? { ...g, groupName: editGroupName.trim() } : g));
            closeModal();
        } catch (error) {
            console.error("Error updating group:", error);
            alert("Failed to update group.");
        }
    };

    const handleDeleteGroup = async () => {
        const confirmDelete = window.confirm(`Are you absolutely sure you want to delete ${selectedGroup.groupName}? This cannot be undone.`);
        if (!confirmDelete) return;

        try {
            await db.collection('groups').doc(selectedGroup.id).delete();
            setGroupsList(groupsList.filter(g => g.id !== selectedGroup.id));
            setStats(prev => ({ ...prev, groups: prev.groups - 1 }));
            closeModal();
        } catch (error) {
            console.error("Error deleting group:", error);
            alert("Failed to delete group.");
        }
    };

    if (!userProfile?.isSuperAdmin) return <div className="p-8 text-center text-red-500 font-bold text-xl">🛑 Access Denied.</div>;
    if (loading) return <div className="p-8 text-center animate-pulse dark:text-gray-300">Fetching global metrics...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Platform Overview</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, Super Admin. Oversee the entire Pub Ranker database here.</p>
            </div>

            {/* --- NEW: GLOBAL ANNOUNCEMENT PUBLISHER --- */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500 transition-colors duration-300">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Global Announcement Broadcast</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">This message will appear at the top of the screen for every user in every group.</p>
                <textarea
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="Type an announcement (e.g., 'Pub Ranker will be down for maintenance at 2 AM')..."
                    className="w-full p-3 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 dark:text-white mb-3 resize-none h-24"
                />
                <div className="flex gap-3">
                    <button onClick={handlePublishAnnouncement} disabled={isPublishing || !announcement.trim()} className="bg-yellow-500 text-white px-4 py-2 rounded font-semibold hover:bg-yellow-600 transition disabled:opacity-50">
                        {isPublishing ? "Publishing..." : "Publish to All Users"}
                    </button>
                    <button onClick={handleClearAnnouncement} disabled={isPublishing || !announcement} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50">
                        Clear Banner
                    </button>
                </div>
            </div>

            {/* Global Stat Cards */}
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
                    <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Total Pubs Added</h3>
                    <p className="text-4xl font-black mt-1">{stats.pubs}</p>
                </div>
            </div>

            {/* Groups Directory */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors duration-300">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Active Groups Directory</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Group Name</th>
                                <th className="p-4 font-semibold text-center">Members</th>
                                <th className="p-4 font-semibold">Owner ID</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            {groupsList.map(group => (
                                <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-800 dark:text-gray-200">
                                    <td className="p-4 font-bold">{group.groupName}</td>
                                    <td className="p-4 text-center">
                                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 py-1 px-3 rounded-full font-semibold">
                                            {group.members ? group.members.length : 0}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={group.ownerUid}>
                                        {group.ownerUid}
                                    </td>
                                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => openModal('view', group)} className="text-blue-500 hover:text-blue-700 font-semibold" title="View Members">👁️ View</button>
                                        <button onClick={() => openModal('edit', group)} className="text-yellow-500 hover:text-yellow-700 font-semibold" title="Edit Group">✏️ Edit</button>
                                        <button onClick={() => openModal('delete', group)} className="text-red-500 hover:text-red-700 font-semibold" title="Delete Group">🗑️ Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- ACTION MODALS --- */}
            {modalType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-70 transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">✕</button>
                        
                        {/* VIEW MEMBERS MODAL */}
                        {modalType === 'view' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 dark:text-white">Members: {selectedGroup.groupName}</h3>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {selectedGroup.members?.map(uid => (
                                        <div key={uid} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm font-mono text-gray-600 dark:text-gray-300 border dark:border-gray-600 flex justify-between">
                                            <span>{uid}</span>
                                            {uid === selectedGroup.ownerUid && <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">OWNER</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* EDIT GROUP MODAL */}
                        {modalType === 'edit' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 dark:text-white">Edit Group Name</h3>
                                <input 
                                    type="text" 
                                    value={editGroupName} 
                                    onChange={(e) => setEditGroupName(e.target.value)}
                                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white mb-4"
                                />
                                <button onClick={handleUpdateGroup} className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition">Save Changes</button>
                            </div>
                        )}

                        {/* DELETE GROUP MODAL */}
                        {modalType === 'delete' && (
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-red-600 mb-2">Delete Group?</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to permanently delete <strong>{selectedGroup.groupName}</strong>? This will wipe the group document from the database.</p>
                                <div className="flex gap-3">
                                    <button onClick={handleDeleteGroup} className="flex-1 bg-red-600 text-white py-2 rounded font-semibold hover:bg-red-700 transition">Yes, Delete</button>
                                    <button onClick={closeModal} className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white py-2 rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}