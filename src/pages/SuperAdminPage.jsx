import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

export default function SuperAdminPage({ db, userProfile, user }) {
    const [activeTab, setActiveTab] = useState('overview'); 
    
    const [stats, setStats] = useState({ users: 0, groups: 0, pubs: 0 });
    const [groupsList, setGroupsList] = useState([]);
    const [pubsList, setPubsList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [reportsList, setReportsList] = useState([]);
    
    const [managingGroup, setManagingGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState(""); 
    const [announcement, setAnnouncement] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    
    // --- UPDATED GAMIFICATION STATE (Added Crawls) ---
    const [gamification, setGamification] = useState({
        pointsPerPub: 5, pointsPerReview: 2, pointsPerAdd: 3, pointsPerCrawl: 5, badges: [] 
    });
    const [newBadge, setNewBadge] = useState({ emoji: "🍻", title: "", desc: "", metric: "rated", threshold: 1 });
    const [isSavingGamification, setIsSavingGamification] = useState(false);
    
    const [featureFlags, setFeatureFlags] = useState({ enableComments: false, enableReactions: false, disableGoogleAPI: false });
    const [mergePrimary, setMergePrimary] = useState("");
    const [mergeDuplicate, setMergeDuplicate] = useState("");
    const [isMerging, setIsMerging] = useState(false);

    const [defaultCriteria, setDefaultCriteria] = useState([]);
    const [newDefCritName, setNewDefCritName] = useState("");
    const [newDefCritType, setNewDefCritType] = useState("scale");

    const isTrueSuperAdmin = !!userProfile?.isSuperAdmin;
    const isAdmin = isTrueSuperAdmin || !!userProfile?.isAdmin;
    const isModerator = isAdmin || !!userProfile?.isModerator;

    const fetchGlobalData = async () => {
        try {
            setGlobalError(""); 
            const [usersSnap, groupsSnap, pubsSnap, feedbackSnap, annDoc, defDoc, reportsSnap, gamificationDoc] = await Promise.all([
                db.collection('users').get().catch(() => ({ docs: [], size: 0 })),
                db.collection('groups').get().catch(() => ({ docs: [], size: 0 })),
                db.collection('pubs').get().catch(() => ({ docs: [], size: 0 })),
                db.collection('feedback').get().catch(() => ({ docs: [], size: 0 })),
                db.collection('global').doc('settings').get().catch(() => ({ exists: false, data: () => ({}) })),
                db.collection('global').doc('defaults').get().catch(() => ({ exists: false, data: () => ({}) })),
                db.collection('reports').where('resolved', '==', false).get().catch(() => ({ docs: [] })),
                db.collection('global').doc('gamification').get().catch(() => ({ exists: false, data: () => ({}) }))
            ]);

            setStats({ users: usersSnap.size, groups: groupsSnap.size, pubs: pubsSnap.size });

            const groupsData = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            groupsData.sort((a, b) => (a.groupName || "").localeCompare(b.groupName || ""));
            setGroupsList(groupsData);

            const pubsData = pubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            pubsData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            setPubsList(pubsData);

            setUsersList(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setReportsList(reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const feedbackData = feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            feedbackData.sort((a, b) => {
                const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
                const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });
            setFeedbackList(feedbackData);

            if (annDoc.exists) {
                setAnnouncement(annDoc.data().announcement || "");
                setIsMaintenanceMode(annDoc.data().maintenanceMode || false);
                setFeatureFlags(annDoc.data().featureFlags || { enableComments: false, enableReactions: false, disableGoogleAPI: false });
            }

            if (gamificationDoc.exists && gamificationDoc.data()) {
                setGamification(prev => ({ ...prev, ...gamificationDoc.data() }));
            }

            if (defDoc.exists) setDefaultCriteria(defDoc.data().criteria || []);
        } catch (error) {
            console.error("STAFF FETCH ERROR:", error);
            setGlobalError(error.message || "Unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isModerator) return;
        fetchGlobalData();
    }, [db, isModerator]);

    const handleSavePointRules = async () => {
        setIsSavingGamification(true);
        try {
            await db.collection('global').doc('gamification').set({ 
                pointsPerPub: Number(gamification.pointsPerPub), 
                pointsPerReview: Number(gamification.pointsPerReview), 
                pointsPerAdd: Number(gamification.pointsPerAdd),
                pointsPerCrawl: Number(gamification.pointsPerCrawl || 5)
            }, { merge: true });
            alert("Point system updated globally!");
        } catch (e) { alert("Failed to save: " + e.message); }
        setIsSavingGamification(false);
    };

    const handleAddBadge = async (e) => {
        e.preventDefault();
        if (!newBadge.title.trim()) return;
        const updatedBadges = [...(gamification.badges || []), { ...newBadge, threshold: Number(newBadge.threshold) }];
        try {
            await db.collection('global').doc('gamification').set({ badges: updatedBadges }, { merge: true });
            setGamification({ ...gamification, badges: updatedBadges });
            setNewBadge({ emoji: "🍻", title: "", desc: "", metric: "rated", threshold: 1 });
        } catch (e) { alert("Failed to add badge: " + e.message); }
    };

    const handleDeleteBadge = async (index) => {
        const updatedBadges = gamification.badges.filter((_, i) => i !== index);
        try {
            await db.collection('global').doc('gamification').set({ badges: updatedBadges }, { merge: true });
            setGamification({ ...gamification, badges: updatedBadges });
        } catch (e) { alert("Failed to delete badge: " + e.message); }
    };
    const handleAddDefaultCriteria = async (e) => { e.preventDefault(); if (!newDefCritName.trim()) return; const newCrit = { name: newDefCritName.trim(), type: newDefCritType, weight: 1 }; const updated = [...defaultCriteria, newCrit]; setDefaultCriteria(updated); try { await db.collection('global').doc('defaults').set({ criteria: updated }, { merge: true }); setNewDefCritName(""); setNewDefCritType("scale"); } catch (error) { alert(`Failed to save: ${error.message}`); } };
    const handleTogglePubLock = async (pub) => {
        const action = pub.isLocked ? "Unlock" : "Lock & Verify";
        if (!window.confirm(`Are you sure you want to ${action} ${pub.name}?`)) return;
        try {
            await db.collection('pubs').doc(pub.id).update({ isLocked: !pub.isLocked });
            setPubsList(pubsList.map(p => p.id === pub.id ? { ...p, isLocked: !pub.isLocked } : p));
        } catch (error) {
            alert(`Failed to update pub: ${error.message}`);
        }
    };
    const handleDeleteDefaultCriteria = async (index) => { const updated = defaultCriteria.filter((_, i) => i !== index); setDefaultCriteria(updated); try { await db.collection('global').doc('defaults').set({ criteria: updated }, { merge: true }); } catch (error) { alert(`Failed to delete: ${error.message}`); } };
    const handlePublishAnnouncement = async () => { setIsPublishing(true); try { await db.collection('global').doc('settings').set({ announcement: announcement.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); alert("Announcement published globally!"); } catch (error) { alert(`Failed to publish: ${error.message}`); } setIsPublishing(false); };
    const handleClearAnnouncement = async () => { setAnnouncement(""); setIsPublishing(true); try { await db.collection('global').doc('settings').set({ announcement: "" }, { merge: true }); } catch (error) { console.error(error); } setIsPublishing(false); };
    const handleToggleMaintenance = async () => { const newState = !isMaintenanceMode; if (newState && !window.confirm("WARNING: Turning this on will instantly kick all non-admin users out of the app. Are you sure?")) return; setIsMaintenanceMode(newState); try { await db.collection('global').doc('settings').set({ maintenanceMode: newState, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); alert(`Maintenance Mode is now ${newState ? 'ON' : 'OFF'}`); } catch (error) { alert(`Failed to update maintenance mode: ${error.message}`); setIsMaintenanceMode(!newState); } };
    const handleToggleFlag = async (flagName) => { const newFlags = { ...featureFlags, [flagName]: !featureFlags[flagName] }; setFeatureFlags(newFlags); try { await db.collection('global').doc('settings').set({ featureFlags: newFlags, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch (error) { alert(`Failed to update flag: ${error.message}`); setFeatureFlags(featureFlags); } };
    const handleDeletePub = async (pubId) => { if (!window.confirm("Delete this pub globally? This will break ratings for users who scored it.")) return; try { await db.collection('pubs').doc(pubId).delete(); setPubsList(pubsList.filter(p => p.id !== pubId)); setStats(prev => ({ ...prev, pubs: prev.pubs - 1 })); } catch (error) { alert(`Failed to delete pub: ${error.message}`); } };
    const handleToggleBan = async (user) => { const action = user.isBanned ? "UNBAN" : "BAN"; if (!window.confirm(`Are you sure you want to ${action} ${user.displayName}?`)) return; try { await db.collection('users').doc(user.id).update({ isBanned: !user.isBanned }); setUsersList(usersList.map(u => u.id === user.id ? { ...u, isBanned: !user.isBanned } : u)); } catch (error) { alert(`Failed to update user status: ${error.message}`); } };
    const handleToggleAdminRole = async (user) => { const action = user.isAdmin ? "REVOKE Admin rights from" : "PROMOTE to Admin:"; if (!window.confirm(`Are you sure you want to ${action} ${user.displayName}?`)) return; try { await db.collection('users').doc(user.id).update({ isAdmin: !user.isAdmin }); setUsersList(usersList.map(u => u.id === user.id ? { ...u, isAdmin: !user.isAdmin } : u)); } catch (error) { alert(`Failed: ${error.message}`); } };
    const handleToggleModRole = async (user) => { const action = user.isModerator ? "REVOKE Moderator rights from" : "PROMOTE to Moderator:"; if (!window.confirm(`Are you sure you want to ${action} ${user.displayName}?`)) return; try { await db.collection('users').doc(user.id).update({ isModerator: !user.isModerator }); setUsersList(usersList.map(u => u.id === user.id ? { ...u, isModerator: !user.isModerator } : u)); } catch (error) { alert(`Failed: ${error.message}`); } };
    const handleExportUsersCSV = () => { const headers = ["Name,Email,UserID,Role,IsBanned\n"]; const rows = usersList.map(u => { let role = "User"; if(u.isSuperAdmin) role="SuperAdmin"; else if(u.isAdmin) role="Admin"; else if(u.isModerator) role="Moderator"; return `"${u.displayName || 'Unknown'}","${u.email || 'No Email'}","${u.id}","${role}","${!!u.isBanned}"`; }); const csvContent = headers.concat(rows).join("\n"); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `pub_ranker_users_${new Date().toISOString().split('T')[0]}.csv`; link.click(); };
    const handleCleanupOrphanedGroups = async () => { 
        const orphaned = groupsList.filter(g => !g.members || g.members.length === 0); 
        if (orphaned.length === 0) return alert("Great news! No orphaned groups (0 members) were found in the database."); 
        if (!window.confirm(`Found ${orphaned.length} orphaned groups. Proceed with Deep Clean? This will permanently delete all associated scores, criteria, comments, and the group itself to save storage space.`)) return; 
        let deletedCount = 0; 
        for (const g of orphaned) { 
            try { 
                const groupDocRef = db.collection('groups').doc(g.id);
                const critSnap = await groupDocRef.collection('criteria').get();
                for (const doc of critSnap.docs) await doc.ref.delete();
                const scoresSnap = await groupDocRef.collection('scores').get();
                for (const doc of scoresSnap.docs) {
                    const commentsSnap = await doc.ref.collection('comments').get();
                    for (const cDoc of commentsSnap.docs) await cDoc.ref.delete(); 
                    await doc.ref.delete(); 
                }
                await groupDocRef.delete(); 
                deletedCount++; 
            } catch (e) { console.error(`Failed to deep clean orphaned group ${g.id}`, e); } 
        } 
        setGroupsList(groupsList.filter(g => g.members && g.members.length > 0)); 
        setStats(prev => ({ ...prev, groups: prev.groups - deletedCount })); 
        alert(`Deep Clean complete! Successfully purged ${deletedCount} orphaned groups from the database.`); 
    };

    const handleJoinGroup = async (groupId, groupName) => {
        if (!user || !user.uid) return alert("Error: Could not verify your user ID. Try refreshing the page.");
        if (!window.confirm(`Join "${groupName}"? This will add you to their member list and drop the group into your navigation menu.`)) return;
        try {
            const myUid = user.uid; 
            await db.collection('groups').doc(groupId).update({ members: firebase.firestore.FieldValue.arrayUnion(myUid) });
            await db.collection('users').doc(myUid).update({ groups: firebase.firestore.FieldValue.arrayUnion(groupId), activeGroupId: groupId });
            setGroupsList(groupsList.map(g => g.id === groupId ? { ...g, members: [...(g.members || []), myUid] } : g));
            alert(`Success! You have joined ${groupName}.`);
        } catch (error) { alert(`Failed to join group: ${error.message}`); }
    };

    const handlePromoteToOwner = async (groupId, uid) => {
        if (!window.confirm("Are you sure you want to transfer ownership to this user?")) return;
        try {
            await db.collection('groups').doc(groupId).update({ ownerUid: uid, managers: firebase.firestore.FieldValue.arrayRemove(uid) });
            const updatedGroup = { ...managingGroup, ownerUid: uid, managers: (managingGroup.managers || []).filter(m => m !== uid) };
            setManagingGroup(updatedGroup);
            setGroupsList(groupsList.map(g => g.id === groupId ? updatedGroup : g));
        } catch (e) { alert("Failed to transfer ownership: " + e.message); }
    };

    const handleToggleManager = async (groupId, uid, isManager) => {
        try {
            if (isManager) {
                await db.collection('groups').doc(groupId).update({ managers: firebase.firestore.FieldValue.arrayRemove(uid) });
                const updatedGroup = { ...managingGroup, managers: managingGroup.managers.filter(m => m !== uid) };
                setManagingGroup(updatedGroup);
                setGroupsList(groupsList.map(g => g.id === groupId ? updatedGroup : g));
            } else {
                await db.collection('groups').doc(groupId).update({ managers: firebase.firestore.FieldValue.arrayUnion(uid) });
                const updatedGroup = { ...managingGroup, managers: [...(managingGroup.managers || []), uid] };
                setManagingGroup(updatedGroup);
                setGroupsList(groupsList.map(g => g.id === groupId ? updatedGroup : g));
            }
        } catch (e) { alert("Failed to toggle manager: " + e.message); }
    };

    const handleRemoveMember = async (groupId, uid) => {
        if (!window.confirm("Are you sure you want to remove this user from the group?")) return;
        try {
            await db.collection('groups').doc(groupId).update({ members: firebase.firestore.FieldValue.arrayRemove(uid), managers: firebase.firestore.FieldValue.arrayRemove(uid) });
            await db.collection('users').doc(uid).update({ groups: firebase.firestore.FieldValue.arrayRemove(groupId) });
            const updatedGroup = { ...managingGroup, members: managingGroup.members.filter(m => m !== uid), managers: (managingGroup.managers || []).filter(m => m !== uid) };
            setManagingGroup(updatedGroup);
            setGroupsList(groupsList.map(g => g.id === groupId ? updatedGroup : g));
        } catch (e) { alert("Failed to remove member: " + e.message); }
    };

    const handleRevokePublicStatus = async (groupId) => { if (!window.confirm("Remove this group from the public leaderboard?")) return; try { await db.collection('groups').doc(groupId).update({ isPublic: false }); setGroupsList(groupsList.map(g => g.id === groupId ? { ...g, isPublic: false } : g)); } catch (error) { alert(`Failed to revoke status: ${error.message}`); } };
    const handleDeletePhoto = async (pubId) => { if (!window.confirm("Delete this photo for violating guidelines? The pub will remain, but the image will be removed.")) return; try { await db.collection('pubs').doc(pubId).update({ photoURL: "" }); setPubsList(pubsList.map(p => p.id === pubId ? { ...p, photoURL: "" } : p)); } catch (error) { alert(`Failed to delete photo: ${error.message}`); } };
    const handleMergePubs = async () => { if (!mergePrimary || !mergeDuplicate) return alert("Please select both a Primary and a Duplicate pub."); if (mergePrimary === mergeDuplicate) return alert("You cannot merge a pub into itself."); const primaryPub = pubsList.find(p => p.id === mergePrimary); const duplicatePub = pubsList.find(p => p.id === mergeDuplicate); if (!window.confirm(`⚠️ CRITICAL ACTION: You are about to merge "${duplicatePub.name}" INTO "${primaryPub.name}".\n\nAll ratings, comments, and upvotes from the duplicate will be transferred to the primary, and the duplicate will be permanently DELETED.\n\nThis cannot be undone. Proceed?`)) return; setIsMerging(true); try { const scoresSnapshot = await db.collectionGroup('scores').where('pubId', '==', mergeDuplicate).get(); const updatePromises = scoresSnapshot.docs.map(doc => doc.ref.update({ pubId: mergePrimary })); await Promise.all(updatePromises); const primaryUpvotes = primaryPub.upvotes || []; const duplicateUpvotes = duplicatePub.upvotes || []; const combinedUpvotes = Array.from(new Set([...primaryUpvotes, ...duplicateUpvotes])); await db.collection('pubs').doc(mergePrimary).update({ upvotes: combinedUpvotes }); await db.collection('pubs').doc(mergeDuplicate).delete(); setPubsList(pubsList.filter(p => p.id !== mergeDuplicate).map(p => p.id === mergePrimary ? { ...p, upvotes: combinedUpvotes } : p)); setStats(prev => ({ ...prev, pubs: prev.pubs - 1 })); setMergePrimary(""); setMergeDuplicate(""); alert(`✅ Merge Complete! Successfully transferred ${scoresSnapshot.size} ratings/scores and deleted the duplicate.`); } catch (error) { console.error("Merge failed:", error); if (error.message.includes("index")) { alert(`Firebase needs to build a search index to find the scores.\n\nOpen your browser's Developer Console (F12). Firebase provided a direct link there. Click that link to generate the index instantly, wait 2 minutes, and try again!`); } else { alert(`Merge failed: ${error.message}`); } } finally { setIsMerging(false); } };
    const handleResolveFeedback = async (id, currentStatus) => { try { await db.collection('feedback').doc(id).update({ resolved: !currentStatus }); setFeedbackList(feedbackList.map(f => f.id === id ? { ...f, resolved: !currentStatus } : f)); } catch (error) { alert(`Failed to update feedback: ${error.message}`); } };
    const handleDeleteFeedback = async (id) => { if (!window.confirm("Delete this feedback?")) return; try { await db.collection('feedback').doc(id).delete(); setFeedbackList(feedbackList.filter(f => f.id !== id)); } catch (error) { alert(`Failed to delete feedback: ${error.message}`); } };
    
    const handleResolveReport = async (id) => {
        try { await db.collection('reports').doc(id).update({ resolved: true }); setReportsList(reportsList.filter(r => r.id !== id)); } 
        catch (error) { alert(`Failed to resolve report: ${error.message}`); }
    };
    const handleDeleteReportedContent = async (report) => {
        if (!window.confirm(`Are you absolutely sure you want to permanently delete this ${report.type}?`)) return;
        try {
            if (report.type === 'pub') {
                await db.collection('pubs').doc(report.targetId).delete();
                setPubsList(pubsList.filter(p => p.id !== report.targetId));
                alert("Pub successfully deleted globally.");
            } else if (report.type === 'review') {
                await db.collection('groups').doc(report.groupId).collection('scores').doc(report.targetId).delete();
                alert("Review successfully deleted from the group.");
            } else if (report.type === 'comment') {
                await db.collection('groups').doc(report.groupId).collection('scores').doc(report.scoreId).collection('comments').doc(report.targetId).delete();
                alert("Comment successfully deleted.");
            }
            await db.collection('reports').doc(report.id).update({ resolved: true });
            setReportsList(reportsList.filter(r => r.id !== report.id));
        } catch (error) { alert(`Failed to delete content: ${error.message}`); }
    };

    if (!isModerator) return <div className="p-8 text-center text-red-500 font-bold text-xl mt-12">🛑 Access Denied. Staff Only.</div>;
    if (loading) return <div className="p-8 text-center animate-pulse dark:text-gray-300 mt-12">Fetching secure metrics...</div>;
    
    // --- UPDATED TABS LOGIC ---
    let availableTabs = ['overview', 'moderation', 'feedback'];
    if (isAdmin) availableTabs.push('pubs', 'users', 'gamification');

    const sortedPubsForDropdown = [...pubsList].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6 animate-fadeIn relative">
            
            {managingGroup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 relative max-h-[90vh] flex flex-col">
                        <button onClick={() => setManagingGroup(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition">✕</button>
                        
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-1 pr-10 truncate">{managingGroup.groupName}</h3>
                        <p className="text-sm text-gray-500 mb-6 font-bold uppercase tracking-wider">Member Management</p>

                        <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                            {managingGroup.members?.map(uid => {
                                const u = usersList.find(usr => user.id === uid) || { id: uid, displayName: 'Unknown User', email: '' };
                                const isOwner = managingGroup.ownerUid === uid;
                                const isManager = managingGroup.managers?.includes(uid);
                                
                                return (
                                    <div key={uid} className="flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 gap-3 transition-colors hover:bg-white dark:hover:bg-gray-700">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                                {u.displayName}
                                                {isOwner ? <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Owner</span> :
                                                 isManager ? <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Manager</span> :
                                                 <span className="bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Member</span>}
                                            </p>
                                            <p className="text-xs text-gray-500">{u.email || 'No email'}</p>
                                        </div>
                                        
                                        {!isOwner ? (
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handlePromoteToOwner(managingGroup.id, uid)} className="text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 px-2 py-1.5 rounded font-bold uppercase transition">Make Owner</button>
                                                <button onClick={() => handleToggleManager(managingGroup.id, uid, isManager)} className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 px-2 py-1.5 rounded font-bold uppercase transition">
                                                    {isManager ? 'Revoke Manager' : 'Make Manager'}
                                                </button>
                                                <button onClick={() => handleRemoveMember(managingGroup.id, uid)} className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 px-2 py-1.5 rounded font-bold uppercase transition">Remove</button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">Cannot modify owner</span>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {(!managingGroup.members || managingGroup.members.length === 0) && (
                                <p className="text-gray-500 italic text-sm">No members in this group.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Staff Dashboard</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Access Level: {isTrueSuperAdmin ? '👑 Super Admin' : isAdmin ? '🛡️ Admin' : '🛠️ Moderator'}
                    </p>
                </div>
                
                <div className="flex flex-wrap bg-gray-200 dark:bg-gray-700 p-1 rounded-lg gap-1">
                    {availableTabs.map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-800 text-brand shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                        >
                            {tab === 'moderation' && (reportsList.length > 0 ? '🚨 ' : '🛡️ ')}
                            {tab === 'gamification' && '🕹️ '}
                            {tab === 'feedback' && feedbackList.filter(f => !f.resolved).length > 0 && '🔴 '}
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {isTrueSuperAdmin && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-red-600 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Maintenance Mode</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Instantly lock all non-admin users out of the app.</p>
                    </div>
                    <button onClick={handleToggleMaintenance} className={`px-6 py-2 rounded font-bold text-white transition-all ${isMaintenanceMode ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'bg-gray-400 hover:bg-gray-500'}`}>
                        {isMaintenanceMode ? "🛑 ACTIVE: App Locked" : "Enable Lockout"}
                    </button>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {isTrueSuperAdmin && (
                        <>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">🚀 App Config & Feature Flags</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                        <div><p className="font-bold text-gray-800 dark:text-gray-200">Enable Comments</p></div>
                                        <input type="checkbox" checked={featureFlags.enableComments || false} onChange={() => handleToggleFlag('enableComments')} className="w-5 h-5 cursor-pointer accent-brand" />
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                        <div><p className="font-bold text-gray-800 dark:text-gray-200">Enable Reactions</p></div>
                                        <input type="checkbox" checked={featureFlags.enableReactions || false} onChange={() => handleToggleFlag('enableReactions')} className="w-5 h-5 cursor-pointer accent-brand" />
                                    </div>
                                    
                                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
                                        <div>
                                            <p className="font-bold text-red-800 dark:text-red-300">Disable Google API</p>
                                            <p className="text-[10px] text-red-600 dark:text-red-400">Kill-switch for API billing</p>
                                        </div>
                                        <input type="checkbox" checked={featureFlags.disableGoogleAPI || false} onChange={() => handleToggleFlag('disableGoogleAPI')} className="w-5 h-5 cursor-pointer accent-red-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">⚙️ Global Default Criteria</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">These criteria will be automatically added to any brand new group when it is created.</p>
                                
                                <form onSubmit={handleAddDefaultCriteria} className="flex flex-col sm:flex-row gap-2 mb-4">
                                    <input type="text" value={newDefCritName} onChange={e => setNewDefCritName(e.target.value)} placeholder="e.g. Pint Price" className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none" />
                                    <select value={newDefCritType} onChange={e => setNewDefCritType(e.target.value)} className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white outline-none cursor-pointer">
                                        <option value="scale">Scale (1-10)</option>
                                        <option value="price">Price (£-£££)</option>
                                        <option value="yes-no">Yes/No</option>
                                        <option value="text">Written Review</option>
                                    </select>
                                    <button type="submit" className="bg-brand text-white px-6 py-2 rounded-lg font-bold hover:opacity-80 transition">Add Default</button>
                                </form>

                                <div className="space-y-2">
                                    {defaultCriteria.length === 0 ? <p className="text-sm text-gray-500 italic">No defaults set.</p> : defaultCriteria.map((crit, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                            <div>
                                                <span className="font-bold text-gray-800 dark:text-white mr-2">{crit.name}</span>
                                                <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{crit.type}</span>
                                            </div>
                                            <button onClick={() => handleDeleteDefaultCriteria(idx)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-wider">Delete</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Global Announcement Broadcast</h3>
                                <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Type an announcement to display to all users..." className="w-full p-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 dark:text-white mb-3 resize-none h-20" />
                                <div className="flex gap-3">
                                    <button onClick={handlePublishAnnouncement} disabled={isPublishing || !announcement.trim()} className="bg-yellow-500 text-white px-4 py-2 rounded font-semibold hover:bg-yellow-600 disabled:opacity-50">Publish to All Users</button>
                                    <button onClick={handleClearAnnouncement} disabled={isPublishing || !announcement} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded font-semibold hover:bg-gray-300 disabled:opacity-50">Clear Banner</button>
                                </div>
                            </div>
                        </>
                    )}

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

                    {isAdmin && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Active Groups</h3>
                                <button onClick={handleCleanupOrphanedGroups} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-1.5">
                                    🧹 Delete Orphaned Groups
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                        <tr><th className="p-3">Group Name</th><th className="p-3 text-center">Members</th><th className="p-3">Owner ID</th><th className="p-3 text-right">Admin Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                        {groupsList.map(g => (
                                            <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-3 font-bold">{g.groupName}</td>
                                                <td className="p-3 text-center"><span className={`py-1 px-2 rounded-full font-semibold text-xs ${g.members?.length === 0 ? 'bg-red-100 text-red-800' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}`}>{g.members?.length || 0}</span></td>
                                                <td className="p-3 font-mono text-xs text-gray-500 truncate max-w-[150px]">{g.ownerUid}</td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {(!g.members || !g.members.includes(user?.uid)) && (
                                                            <button onClick={() => handleJoinGroup(g.id, g.groupName)} className="text-[10px] bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded font-bold uppercase transition shadow-sm">Join</button>
                                                        )}
                                                        <button onClick={() => setManagingGroup(g)} className="text-[10px] bg-brand text-white hover:opacity-80 px-3 py-1.5 rounded font-bold uppercase transition shadow-sm">Manage Members</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- NEW GAMIFICATION TAB --- */}
            {activeTab === 'gamification' && isAdmin && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">🕹️ Gamification Engine</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Alter how leaderboards are scored and create custom unlockable awards.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Point System</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Points per Pub Rated</span>
                                    <input type="number" value={gamification.pointsPerPub} onChange={e => setGamification({...gamification, pointsPerPub: e.target.value})} className="w-20 px-3 py-1 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white text-center font-bold" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Points per Written Review</span>
                                    <input type="number" value={gamification.pointsPerReview} onChange={e => setGamification({...gamification, pointsPerReview: e.target.value})} className="w-20 px-3 py-1 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white text-center font-bold" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Points per Pub Added</span>
                                    <input type="number" value={gamification.pointsPerAdd} onChange={e => setGamification({...gamification, pointsPerAdd: e.target.value})} className="w-20 px-3 py-1 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white text-center font-bold" />
                                </div>
                                {/* --- NEW FIELD: POINTS FOR MAP CRAWLS --- */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Points per Pub Crawl Created</span>
                                    <input type="number" value={gamification.pointsPerCrawl} onChange={e => setGamification({...gamification, pointsPerCrawl: e.target.value})} className="w-20 px-3 py-1 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white text-center font-bold" />
                                </div>
                                <button onClick={handleSavePointRules} disabled={isSavingGamification} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                                    Save Point Rules
                                </button>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Custom Awards</h4>
                                
                                <form onSubmit={handleAddBadge} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-4 space-y-3">
                                    <div className="flex gap-2">
                                        <input type="text" value={newBadge.emoji} onChange={e => setNewBadge({...newBadge, emoji: e.target.value})} className="w-12 text-center px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white" placeholder="🏆" maxLength="2" required />
                                        <input type="text" value={newBadge.title} onChange={e => setNewBadge({...newBadge, title: e.target.value})} className="flex-1 px-3 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white text-sm" placeholder="Badge Title" required />
                                    </div>
                                    <input type="text" value={newBadge.desc} onChange={e => setNewBadge({...newBadge, desc: e.target.value})} className="w-full px-3 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white text-xs" placeholder="Short description..." required />
                                    
                                    <div className="flex gap-2 items-center">
                                        <span className="text-xs text-gray-500 font-bold">Unlocks when:</span>
                                        <select value={newBadge.metric} onChange={e => setNewBadge({...newBadge, metric: e.target.value})} className="flex-1 text-xs px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white">
                                            <option value="rated">Pubs Rated</option>
                                            <option value="reviews">Reviews Written</option>
                                            <option value="added">Pubs Added</option>
                                            <option value="tens">Perfect 10s Given</option>
                                            <option value="crawls">Crawls Created</option>
                                        </select>
                                        <span className="text-xs text-gray-500 font-bold">&gt;=</span>
                                        <input type="number" value={newBadge.threshold} onChange={e => setNewBadge({...newBadge, threshold: e.target.value})} className="w-16 px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white text-center text-xs font-bold" min="1" required />
                                    </div>
                                    <button type="submit" className="w-full bg-brand text-white font-bold py-1.5 rounded text-sm hover:opacity-80">Add Award</button>
                                </form>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {(!gamification.badges || gamification.badges.length === 0) ? (
                                        <p className="text-xs text-gray-500 italic text-center">No custom awards created yet.</p>
                                    ) : (
                                        gamification.badges.map((b, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{b.emoji}</span>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800 dark:text-white leading-none">{b.title}</p>
                                                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{b.metric} &gt;= {b.threshold}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteBadge(idx)} className="text-red-500 hover:text-red-700 text-lg">✕</button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'moderation' && (
                <div className="space-y-8 animate-fadeIn">
                    
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 overflow-hidden">
                        <div className="p-5 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-red-800 dark:text-red-300 flex items-center gap-2">🚨 User Reports Queue</h3>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">Pubs and reviews reported by the community for violating guidelines.</p>
                            </div>
                            <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full">{reportsList.length}</span>
                        </div>
                        <div className="overflow-x-auto max-h-96">
                            {reportsList.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 font-medium">No pending reports! The community is safe.</div>
                            ) : (
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                        <tr><th className="p-4 w-24">Type</th><th className="p-4">Reported Content</th><th className="p-4">Date</th><th className="p-4 text-right">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                        {reportsList.map(report => (
                                            <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${report.type === 'pub' ? 'bg-orange-100 text-orange-800' : report.type === 'comment' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{report.type}</span>
                                                </td>
                                                <td className="p-4 font-medium italic">"{report.targetName}"</td>
                                                <td className="p-4 text-xs text-gray-500">{report.createdAt && typeof report.createdAt.toDate === 'function' ? new Date(report.createdAt.toDate()).toLocaleDateString() : 'Recent'}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleResolveReport(report.id)} className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 px-3 py-1.5 rounded-lg font-bold transition">Dismiss</button>
                                                        <button onClick={() => handleDeleteReportedContent(report)} className="text-xs bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold transition shadow-sm">Delete Content</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-purple-200 dark:border-purple-900/50 overflow-hidden">
                        <div className="p-5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30">
                            <h3 className="text-xl font-black text-purple-800 dark:text-purple-300 flex items-center gap-2">🌍 Public Leaderboard Review</h3>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">Review groups that have opted into the public directory. Ensure their names are appropriate.</p>
                        </div>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                    <tr><th className="p-4">Group Name</th><th className="p-4">City</th><th className="p-4">Members</th><th className="p-4 text-right">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                    {groupsList.filter(g => g.isPublic).length === 0 ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500 font-medium">No public groups found.</td></tr>
                                    ) : groupsList.filter(g => g.isPublic).map(g => (
                                        <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-4 font-bold text-lg">{g.groupName}</td>
                                            <td className="p-4 text-gray-500">{g.city || 'Global'}</td>
                                            <td className="p-4"><span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 py-1 px-3 rounded-full font-bold text-xs">{g.members?.length || 0}</span></td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleRevokePublicStatus(g.id)} className="text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg font-bold text-xs transition">Revoke Public Status</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-blue-200 dark:border-blue-900/50 overflow-hidden">
                        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30">
                            <h3 className="text-xl font-black text-blue-800 dark:text-blue-300 flex items-center gap-2">📸 Photo Moderation Queue</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Scan uploaded pub photos for guideline violations. Most recent uploads are shown first.</p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {pubsList.filter(p => p.photoURL && !p.photoURL.includes('googleusercontent')).length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-gray-500 font-medium">No user-uploaded photos to moderate.</div>
                                ) : pubsList.filter(p => p.photoURL && !p.photoURL.includes('googleusercontent')).slice(0, 40).map(pub => (
                                    <div key={pub.id} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <img src={pub.photoURL} alt={pub.name} className="w-full h-48 object-cover group-hover:scale-105 transition duration-300" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                                            <p className="text-white font-bold truncate">{pub.name}</p>
                                            <p className="text-gray-300 text-xs truncate">{pub.location || 'Unknown'}</p>
                                        </div>
                                        <button onClick={() => handleDeletePhoto(pub.id)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg font-bold shadow-lg hover:bg-red-700 transition opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0" title="Delete Photo">🗑️ Scrub</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-900/50 overflow-hidden">
                            <div className="p-5 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30">
                                <h3 className="text-xl font-black text-orange-800 dark:text-orange-300 flex items-center gap-2">👯‍♂️ Merge Duplicate Pubs</h3>
                                <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Combine duplicated pubs into a single master record. All ratings, comments, and hit-list votes will be seamlessly transferred across all groups.</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">1. The Master Pub (Keep)</label>
                                        <select value={mergePrimary} onChange={(e) => setMergePrimary(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 cursor-pointer outline-none">
                                            <option value="">-- Select Primary Pub --</option>
                                            {sortedPubsForDropdown.map(p => (
                                                <option key={`p-${p.id}`} value={p.id}>{p.name} ({p.location || 'Unknown'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">2. The Duplicate (Merge & Delete)</label>
                                        <select value={mergeDuplicate} onChange={(e) => setMergeDuplicate(e.target.value)} className="w-full px-4 py-3 border border-red-200 dark:border-red-900/50 rounded-xl bg-red-50 dark:bg-red-900/20 dark:text-white focus:ring-2 focus:ring-red-500 cursor-pointer outline-none">
                                            <option value="">-- Select Duplicate Pub --</option>
                                            {sortedPubsForDropdown.map(p => (
                                                <option key={`d-${p.id}`} value={p.id}>{p.name} ({p.location || 'Unknown'})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button onClick={handleMergePubs} disabled={isMerging || !mergePrimary || !mergeDuplicate} className="px-8 py-3 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md">
                                        {isMerging ? "🔄 Merging Databases..." : "🛠️ Execute Merge"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

{activeTab === 'pubs' && isAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Global Pub Directory</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full font-bold">
                            {pubsList.filter(p => p.isLocked).length} Verified Pubs
                        </span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Photo</th>
                                    <th className="p-3">Pub Name</th>
                                    <th className="p-3">Location</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                {pubsList.map(pub => (
                                    <tr key={pub.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${pub.isLocked ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="p-3 text-center">
                                            {pub.isLocked ? <span className="text-xl" title="Verified & Locked">🔒</span> : <span className="text-xl opacity-20" title="Unlocked">🔓</span>}
                                        </td>
                                        <td className="p-3 w-16">{pub.photoURL ? <img src={pub.photoURL} alt="pub" className="w-10 h-10 rounded object-cover shadow-sm" /> : <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center text-xl">🍺</div>}</td>
                                        <td className="p-3 font-bold">{pub.name}</td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">{pub.location || 'Unknown'}</td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleTogglePubLock(pub)} className={`font-bold text-xs px-3 py-1.5 rounded transition shadow-sm ${pub.isLocked ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' : 'bg-brand text-white hover:opacity-80'}`}>
                                                    {pub.isLocked ? 'Unlock' : 'Verify'}
                                                </button>
                                                <button onClick={() => handleDeletePub(pub.id)} className="text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 font-bold text-xs px-3 py-1.5 rounded transition shadow-sm">
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'users' && isAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-fadeIn">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">User Directory</h3>
                        <button onClick={handleExportUsersCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-1.5">
                            📊 Export to CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3 text-center">Role</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                {usersList.map(u => (
                                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${u.isBanned ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''}`}>
                                        <td className="p-3 font-bold flex items-center gap-2">
                                            {u.avatarUrl && <img src={u.avatarUrl} className="w-6 h-6 rounded-full" alt="avatar"/>}
                                            {u.displayName || 'Unknown'}
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                                        <td className="p-3 text-center">
                                            {u.isSuperAdmin ? <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-[10px] uppercase px-2 py-1 rounded font-black tracking-wider">SuperAdmin</span>
                                            : u.isAdmin ? <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] uppercase px-2 py-1 rounded font-black tracking-wider">Admin</span>
                                            : u.isModerator ? <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-[10px] uppercase px-2 py-1 rounded font-black tracking-wider">Moderator</span>
                                            : <span className="text-gray-400 text-xs font-semibold">User</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                            {u.isBanned ? <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">BANNED</span> : <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">ACTIVE</span>}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {isTrueSuperAdmin && !u.isSuperAdmin && (
                                                    <div className="flex gap-1 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2">
                                                        <button onClick={() => handleToggleModRole(u)} className={`text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider transition ${u.isModerator ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300'}`} title="Toggle Moderator">Mod</button>
                                                        <button onClick={() => handleToggleAdminRole(u)} className={`text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider transition ${u.isAdmin ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300'}`} title="Toggle Admin">Admin</button>
                                                    </div>
                                                )}
                                                {!u.isSuperAdmin && (
                                                    <button onClick={() => handleToggleBan(u)} className={`font-semibold text-xs px-3 py-1.5 rounded text-white ${u.isBanned ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700 shadow-sm transform hover:scale-105 transition-all'}`}>
                                                        {u.isBanned ? 'Restore' : 'BAN'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                                    <p className="text-xs text-gray-400 mt-2">{item.createdAt && typeof item.createdAt.toDate === 'function' ? new Date(item.createdAt.toDate()).toLocaleString() : 'Recent'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}