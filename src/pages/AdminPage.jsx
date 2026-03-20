import React, { useState, useEffect } from 'react';
import { firebase, storage } from '../firebase'; 
import imageCompression from 'browser-image-compression'; 

export default function AdminPage({
    criteria,
    pubs,
    user,
    currentGroup,
    pubsRef,
    criteriaRef,
    groupRef,
    allUsers,
    db,
}) {
    const [activeTab, setActiveTab] = useState('settings'); 

    // --- SETTINGS & BRAND STATE ---
    const [editGroupName, setEditGroupName] = useState(currentGroup.groupName || "");
    const [editGroupCover, setEditGroupCover] = useState(currentGroup.coverPhoto || "");
    const [requireApproval, setRequireApproval] = useState(currentGroup.requireApproval || false);
    
    // NEW PUBLIC DIRECTORY STATES
    const [city, setCity] = useState(currentGroup.city || "");
    const [isPublic, setIsPublic] = useState(currentGroup.isPublic || false);
    
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // --- APPROVALS & TITLES STATE ---
    const [pendingMembers, setPendingMembers] = useState(currentGroup.pendingMembers || []);
    const [memberTitles, setMemberTitles] = useState(currentGroup.memberTitles || {});
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [editingTitleText, setEditingTitleText] = useState("");

    const [newCriterionName, setNewCriterionName] = useState("");
    const [newCriterionType, setNewCriterionType] = useState("scale");
    const [newCriterionWeight, setNewCriterionWeight] = useState(1);
    const [savingCriterion, setSavingCriterion] = useState(false);
    const [criterionError, setCriterionError] = useState("");
    
    const [editingCriterionId, setEditingCriterionId] = useState(null);
    const [editingCriterionName, setEditingCriterionName] = useState("");
    
    const [newPubName, setNewPubName] = useState("");
    const [newPubLocation, setNewPubLocation] = useState("");
    const [newPubLat, setNewPubLat] = useState("");
    const [newPubLng, setNewPubLng] = useState("");
    const [newPubPhotoURL, setNewPubPhotoURL] = useState("");
    const [newPubGoogleLink, setNewPubGoogleLink] = useState("");
    const [savingPub, setSavingPub] = useState(false);
    const [pubError, setPubError] = useState("");
    
    // --- IMAGE UPLOAD STATE ---
    const [uploading, setUploading] = useState(false);
    
    const [managers, setManagers] = useState(currentGroup.managers || []);
    const [members, setMembers] = useState(currentGroup.members || []);
    
    const [copyMessage, setCopyMessage] = useState("");
    const [showQr, setShowQr] = useState(false);
    
    const inviteCode = currentGroup?.id || groupRef.id;
    const inviteUrl = `${window.location.origin}?invite=${inviteCode}`;
    
    // Permissions
    const isCurrentUserOwner = currentGroup.ownerUid === user.uid;
    const isCurrentUserManager = currentGroup.managers?.includes(user.uid);
    const canManageSettings = isCurrentUserOwner || isCurrentUserManager;
    
    useEffect(() => {
        setManagers(currentGroup.managers || []);
        setMembers(currentGroup.members || []);
        setPendingMembers(currentGroup.pendingMembers || []);
        setMemberTitles(currentGroup.memberTitles || {});
        setEditGroupName(currentGroup.groupName || "");
        setEditGroupCover(currentGroup.coverPhoto || "");
        setRequireApproval(currentGroup.requireApproval || false);
        setCity(currentGroup.city || "");
        setIsPublic(currentGroup.isPublic || false);
    }, [currentGroup]);

    // --- SETTINGS LOGIC ---
    const handleSaveSettings = async () => {
        if (!editGroupName.trim()) return;
        setIsSavingSettings(true);
        try {
            await groupRef.update({
                groupName: editGroupName.trim(),
                coverPhoto: editGroupCover.trim(),
                requireApproval: requireApproval,
                city: city.trim(),
                isPublic: isPublic
            });
            alert("Group settings updated successfully!");
        } catch (e) {
            console.error("Error saving settings", e);
            alert("Failed to save settings.");
        }
        setIsSavingSettings(false);
    };

    // --- APPROVAL LOGIC ---
    const handleApproveMember = async (uid) => {
        try {
            await groupRef.update({
                pendingMembers: firebase.firestore.FieldValue.arrayRemove(uid),
                members: firebase.firestore.FieldValue.arrayUnion(uid)
            });
            await db.collection("users").doc(uid).update({
                groups: firebase.firestore.FieldValue.arrayUnion(currentGroup.id)
            });
        } catch (e) { console.error("Error approving member", e); }
    };

    const handleRejectMember = async (uid) => {
        if (!window.confirm("Are you sure you want to reject this join request?")) return;
        try {
            await groupRef.update({ pendingMembers: firebase.firestore.FieldValue.arrayRemove(uid) });
        } catch (e) { console.error("Error rejecting member", e); }
    };

    const handleSaveTitle = async (uid) => {
        try {
            await groupRef.update({ [`memberTitles.${uid}`]: editingTitleText.trim() });
            setEditingTitleId(null);
        } catch (e) { console.error("Error saving title", e); }
    };
    
    // --- NATIVE IMAGE UPLOAD LOGIC ---
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Please select an image file.");
            return;
        }

        setUploading(true);
        try {
            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            
            const fileRef = storage.ref(`pubs/${currentGroup.id}/${Date.now()}_${file.name}`);
            await fileRef.put(compressedFile);
            
            const url = await fileRef.getDownloadURL();
            setNewPubPhotoURL(url);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const handleAddCriterion = async (e) => {
        e.preventDefault();
        if (!isCurrentUserOwner && !isCurrentUserManager) {
            alert("Security Error: You do not have permission to add criteria.");
            return;
        }
        setCriterionError("");
        if (!newCriterionName.trim()) return setCriterionError("Please enter a name.");
        setSavingCriterion(true);
        try {
            await criteriaRef.add({
                name: newCriterionName.trim(), type: newCriterionType, weight: Number(newCriterionWeight) || 1,
                archived: false, order: criteria.length, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setNewCriterionName(""); setNewCriterionType("scale"); setNewCriterionWeight(1);
        } catch (e) { setCriterionError("Could not add criterion."); } 
        finally { setSavingCriterion(false); }
    };
    
    const handleArchiveCriterion = async (id, archived) => {
        try { await criteriaRef.doc(id).update({ archived }); } catch (e) { console.error(e); }
    };
    
    const handleSaveCriterionEdit = async (id) => {
        if (!editingCriterionName.trim()) return;
        try { await criteriaRef.doc(id).update({ name: editingCriterionName.trim() }); setEditingCriterionId(null); } 
        catch(e) { console.error(e); }
    };
    
    const handleAddPub = async (e) => {
        e.preventDefault();
        if (!isCurrentUserOwner && !isCurrentUserManager) {
            alert("Security Error: You do not have permission to add pubs.");
            return;
        }
        setPubError("");
        if (!newPubName.trim()) return setPubError("Please enter a pub name.");
        setSavingPub(true);
        try {
            const data = { name: newPubName.trim(), location: newPubLocation.trim() || "", status: "to-visit", addedBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
            if (newPubLat && newPubLng) { data.lat = parseFloat(newPubLat); data.lng = parseFloat(newPubLng); }
            if (newPubPhotoURL.trim()) data.photoURL = newPubPhotoURL.trim();
            if (newPubGoogleLink.trim()) data.googleLink = newPubGoogleLink.trim();
            await pubsRef.add(data);
            setNewPubName(""); setNewPubLocation(""); setNewPubLat(""); setNewPubLng(""); setNewPubPhotoURL(""); setNewPubGoogleLink("");
            alert("Pub added successfully!");
        } catch (e) { setPubError("Could not add pub."); } 
        finally { setSavingPub(false); }
    };
    
    const handleRoleChange = async (memberId, role) => {
        if (!isCurrentUserOwner || (memberId === user.uid && role !== "owner")) return;
        try {
            if (role === "owner") await groupRef.update({ ownerUid: memberId, managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
            else if (role === "manager") await groupRef.update({ managers: firebase.firestore.FieldValue.arrayUnion(memberId) });
            else if (role === "member") await groupRef.update({ managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
        } catch (e) { console.error(e); }
    };
    
    const handleRemoveMember = async (memberId) => {
        if (!isCurrentUserOwner || memberId === user.uid) return; 
        if (!window.confirm("Are you sure you want to kick this member?")) return;
        try {
            await groupRef.update({ members: firebase.firestore.FieldValue.arrayRemove(memberId), managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
            await db.collection("users").doc(memberId).update({ groups: firebase.firestore.FieldValue.arrayRemove(currentGroup.id) });
        } catch (e) { console.error(e); }
    };
    
    const handleCopyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopyMessage("Invite link copied!");
            setTimeout(() => setCopyMessage(""), 2000);
        } catch (e) { setCopyMessage("Could not copy."); }
    };
    
    const getUserLabel = (uid) => {
        const u = allUsers[uid];
        return u?.displayName || u?.email || uid;
    };
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Group Admin</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Managing <span className="font-bold text-blue-600 dark:text-blue-400">{currentGroup.groupName}</span>
                </p>
            </div>

            <div className="flex overflow-x-auto bg-gray-200 dark:bg-gray-700 p-1 rounded-xl shadow-inner gap-1">
                {[
                    { id: 'settings', icon: '⚙️', label: 'Settings' },
                    { id: 'invites', icon: '📨', label: 'Invites' },
                    { id: 'members', icon: '👥', label: `Members (${members.length})` },
                    { id: 'criteria', icon: '📋', label: `Criteria (${criteria.length})` },
                    { id: 'pubs', icon: '🍻', label: 'Add Pubs' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[120px] py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                        {tab.id === 'members' && pendingMembers.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">{pendingMembers.length}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors duration-300 min-h-[400px]">
                
                {/* --- TAB 1: SETTINGS --- */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Group Brand & Identity</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Group Name</label>
                                    <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cover Photo URL (Displays on Dashboard)</label>
                                    <input type="text" value={editGroupCover} onChange={e => setEditGroupCover(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white mb-3" />
                                    {editGroupCover && (
                                        <img src={editGroupCover} alt="Cover Preview" className="h-32 w-full object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-600" onError={(e) => { e.target.style.display = "none"; }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Private Group (Approvals)</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Require admin approval before new members can join via the invite link.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={requireApproval} onChange={() => setRequireApproval(!requireApproval)} className="sr-only peer" />
                                <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        {/* --- NEW: CITY & PUBLIC TOGGLE --- */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Group City / Region</label>
                                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. London, Manchester, New York" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-600 pt-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">🌍 Publish to Global Leaderboard</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow your group to be featured on the public homepage to attract new members.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isPublic} onChange={() => setIsPublic(!isPublic)} className="sr-only peer" />
                                    <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50">
                            {isSavingSettings ? 'Saving...' : '💾 Save Settings'}
                        </button>
                    </div>
                )}

                {/* --- TAB 2: INVITES --- */}
                {activeTab === 'invites' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Invite Friends</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Share this link or code so friends can join your group. {requireApproval ? 'Since your group is private, they will need your approval to enter.' : 'Anyone with the link can join instantly.'}</p>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Direct Invite Link</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input type="text" readOnly value={inviteUrl} className="flex-1 px-4 py-3 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white font-mono shadow-inner outline-none" />
                                <div className="flex gap-2">
                                    <button onClick={handleCopyInvite} className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">Copy</button>
                                    <button onClick={() => setShowQr(true)} className="flex-1 sm:flex-none px-6 py-3 bg-gray-800 dark:bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition shadow-sm">QR Code</button>
                                </div>
                            </div>
                            {copyMessage && <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-bold">{copyMessage}</p>}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Manual Group Code</p>
                            <span className="font-mono text-3xl font-black text-blue-600 dark:text-blue-400 tracking-widest">{inviteCode}</span>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: MEMBERS --- */}
                {activeTab === 'members' && (
                    <div className="space-y-6 animate-fadeIn">
                        
                        {pendingMembers.length > 0 && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl shadow-sm">
                                <h3 className="text-lg font-bold text-orange-800 dark:text-orange-400 mb-3 flex items-center gap-2">
                                    ⏳ Pending Join Requests <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingMembers.length}</span>
                                </h3>
                                <div className="space-y-2">
                                    {pendingMembers.map(uid => (
                                        <div key={uid} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-orange-100 dark:border-orange-700/50 shadow-sm">
                                            <span className="font-bold text-gray-800 dark:text-white">{getUserLabel(uid)}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApproveMember(uid)} className="px-4 py-1.5 bg-green-500 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-green-600 transition">Approve</button>
                                                <button onClick={() => handleRejectMember(uid)} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold uppercase tracking-wider rounded hover:bg-red-100 transition">Reject</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Member Roster</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Assign roles and give your friends funny custom titles (like "Chief Taster").</p>
                            
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">
                                        <tr>
                                            <th className="px-4 py-3">Member</th>
                                            <th className="px-4 py-3">Custom Title</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {members.map((uid) => {
                                            const isManager = managers.includes(uid);
                                            const isGroupOwner = currentGroup.ownerUid === uid;
                                            return (
                                                <tr key={uid} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                    <td className="px-4 py-4 font-semibold text-gray-800 dark:text-gray-200">
                                                        {getUserLabel(uid)} {uid === user.uid && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full ml-1 uppercase">You</span>}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {editingTitleId === uid ? (
                                                            <div className="flex items-center gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={editingTitleText} 
                                                                    onChange={e => setEditingTitleText(e.target.value)} 
                                                                    placeholder="e.g. Always Late" 
                                                                    className="w-32 px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" 
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleSaveTitle(uid)} className="text-green-600 dark:text-green-400 font-bold hover:scale-110 transition">💾</button>
                                                                <button onClick={() => setEditingTitleId(null)} className="text-gray-400 hover:text-red-500 font-bold transition">✕</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 group">
                                                                <span className={`text-sm italic ${memberTitles[uid] ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                    {memberTitles[uid] || "No Title"}
                                                                </span>
                                                                {canManageSettings && (
                                                                    <button 
                                                                        onClick={() => { setEditingTitleId(uid); setEditingTitleText(memberTitles[uid] || ""); }} 
                                                                        className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 text-xs transition"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${isGroupOwner ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : isManager ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                            {isGroupOwner ? "Owner" : isManager ? "Manager" : "Member"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        {isCurrentUserOwner && !isGroupOwner && (
                                                            <div className="flex justify-end gap-2">
                                                                <select
                                                                    value={isManager ? "manager" : "member"}
                                                                    onChange={(e) => handleRoleChange(uid, e.target.value)}
                                                                    className="px-2 py-1 border dark:border-gray-600 rounded text-xs font-semibold bg-white dark:bg-gray-700 dark:text-white cursor-pointer"
                                                                >
                                                                    <option value="member">Member</option>
                                                                    <option value="manager">Manager</option>
                                                                </select>
                                                                <button onClick={() => handleRemoveMember(uid)} className="px-3 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-bold transition border border-red-100 dark:border-red-800">
                                                                    Kick
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 4: CRITERIA --- */}
                {activeTab === 'criteria' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-3">Create New Criterion</h3>
                            <form onSubmit={handleAddCriterion} className="flex flex-col md:flex-row gap-3">
                                <input type="text" value={newCriterionName} onChange={(e) => setNewCriterionName(e.target.value)} placeholder="e.g., Guinness Quality" className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                                <div className="flex gap-3">
                                    <select value={newCriterionType} onChange={(e) => setNewCriterionType(e.target.value)} className="w-40 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white cursor-pointer">
                                        <option value="scale">Scale (1–10)</option>
                                        <option value="yes-no">Yes / No</option>
                                        <option value="price">Price (£-£££)</option>
                                        <option value="currency">Exact Price (£)</option>
                                        <option value="text">Written Review</option>
                                    </select>
                                    <div className="relative">
                                        <span className="absolute -top-2 left-2 bg-white dark:bg-gray-800 text-[10px] px-1 text-gray-500 font-bold">Weight</span>
                                        <input type="number" min="0.1" step="0.1" value={newCriterionWeight} onChange={(e) => setNewCriterionWeight(e.target.value)} className="w-20 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white" />
                                    </div>
                                    <button type="submit" disabled={savingCriterion} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60">Add</button>
                                </div>
                            </form>
                            {criterionError && <p className="text-xs text-red-500 mt-2 font-bold">{criterionError}</p>}
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-2">Active Criteria</h3>
                            {criteria.map((c) => (
                                <div key={c.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${c.archived ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 shadow-sm'}`}>
                                    <div className="flex-1 mr-4">
                                        {editingCriterionId === c.id ? (
                                            <div className="flex items-center gap-2">
                                                <input type="text" value={editingCriterionName} onChange={(e) => setEditingCriterionName(e.target.value)} className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white text-sm" />
                                                <button onClick={() => handleSaveCriterionEdit(c.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded font-bold text-xs hover:bg-green-200">Save</button>
                                                <button onClick={() => setEditingCriterionId(null)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded font-bold text-xs hover:bg-gray-200">Cancel</button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-gray-800 dark:text-gray-200">{c.name}</p>
                                                    <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{c.type}</span>
                                                    {!c.archived && <button onClick={() => { setEditingCriterionId(c.id); setEditingCriterionName(c.name); }} className="text-blue-500 hover:text-blue-700 text-xs font-bold ml-2">Edit</button>}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Multiplier Weight: {c.weight ?? 1}x</p>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => canManageSettings && handleArchiveCriterion(c.id, !c.archived)} disabled={!canManageSettings} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${!canManageSettings ? 'opacity-50 cursor-not-allowed' : ''} ${c.archived ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                                        {c.archived ? "Restore" : "Archive"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 5: PUBS WITH NATIVE UPLOAD --- */}
                {activeTab === 'pubs' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Add a New Pub</h3>
                            <form onSubmit={handleAddPub} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pub Name *</label>
                                        <input type="text" maxLength={50} value={newPubName} onChange={(e) => setNewPubName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Location / Area</label>
                                        <input type="text" maxLength={50} value={newPubLocation} onChange={(e) => setNewPubLocation(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GPS Latitude</label>
                                        <input type="text" value={newPubLat} onChange={(e) => setNewPubLat(e.target.value)} placeholder="e.g. 51.5074" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white font-mono" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GPS Longitude</label>
                                        <input type="text" value={newPubLng} onChange={(e) => setNewPubLng(e.target.value)} placeholder="e.g. -0.1278" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white font-mono" />
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                                        Pub Photo
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className={`flex-1 flex flex-col items-center justify-center px-4 py-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                                            newPubPhotoURL 
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-700/50'
                                        }`}>
                                            {uploading ? (
                                                <svg className="animate-spin mb-1 h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <span className="text-2xl mb-1">📸</span>
                                            )}
                                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                                {uploading ? "Uploading Image..." : newPubPhotoURL ? "Change Photo" : "Upload or Take Photo"}
                                            </span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleImageUpload} 
                                                className="hidden" 
                                                disabled={uploading} 
                                            />
                                        </label>

                                        {newPubPhotoURL && (
                                            <div className="relative w-20 h-20 group">
                                                <img 
                                                    src={newPubPhotoURL} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover rounded-xl shadow-md border-2 border-white dark:border-gray-600" 
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewPubPhotoURL("")}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" disabled={savingPub} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-60 shadow-md">
                                    {savingPub ? "Saving..." : "🍻 Add Pub to Database"}
                                </button>
                                {pubError && <p className="text-sm text-red-500 text-center font-bold">{pubError}</p>}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        
            {/* QR Modal */}
            {showQr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setShowQr(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Scan to Join</h3>
                        <p className="text-gray-500 mb-6 text-sm">Have your friend point their phone camera at this code.</p>
                        <div className="bg-white p-4 rounded-xl border-4 border-gray-100 inline-block mb-6 shadow-sm">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`} alt="Group invite QR" className="mx-auto" />
                        </div>
                        <p className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded truncate">{inviteUrl}</p>
                    </div>
                </div>
            )}
        </div>
    );
}