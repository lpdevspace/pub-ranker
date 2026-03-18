import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

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
    const [newCriterionName, setNewCriterionName] = useState("");
    const [newCriterionType, setNewCriterionType] = useState("scale");
    const [newCriterionWeight, setNewCriterionWeight] = useState(1);
    const [savingCriterion, setSavingCriterion] = useState(false);
    const [criterionError, setCriterionError] = useState("");
    
    // Edit Criteria State
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
    
    const [managers, setManagers] = useState(currentGroup.managers || []);
    const [members, setMembers] = useState(currentGroup.members || []);
    
    // Invite link + QR UI state
    const [copyMessage, setCopyMessage] = useState("");
    const [showQr, setShowQr] = useState(false);
    
    const inviteCode = currentGroup?.id || groupRef.id;
    const inviteUrl = `${window.location.origin}?invite=${inviteCode}`;
    
    const isOwner = currentGroup.ownerUid === user.uid;
    
    useEffect(() => {
        setManagers(currentGroup.managers || []);
        setMembers(currentGroup.members || []);
    }, [currentGroup.managers, currentGroup.members]);
    
    const handleAddCriterion = async (e) => {
        e.preventDefault();
        setCriterionError("");
    
        if (!newCriterionName.trim()) {
            setCriterionError("Please enter a name for the new criterion.");
            return;
        }
    
        setSavingCriterion(true);
        try {
            await criteriaRef.add({
                name: newCriterionName.trim(),
                type: newCriterionType,
                weight: Number(newCriterionWeight) || 1,
                archived: false,
                order: criteria.length,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setNewCriterionName("");
            setNewCriterionType("scale");
            setNewCriterionWeight(1);
        } catch (e) {
            console.error("Error adding criterion", e);
            setCriterionError("Could not add criterion. Please try again.");
        } finally {
            setSavingCriterion(false);
        }
    };
    
    const handleArchiveCriterion = async (id, archived) => {
        try {
            await criteriaRef.doc(id).update({ archived });
        } catch (e) {
            console.error("Error updating criterion", e);
        }
    };
    
    const handleSaveCriterionEdit = async (id) => {
        if (!editingCriterionName.trim()) return;
        try {
            await criteriaRef.doc(id).update({ name: editingCriterionName.trim() });
            setEditingCriterionId(null);
        } catch(e) {
            console.error("Error updating criterion name", e);
        }
    };
    
    const handleAddPub = async (e) => {
        e.preventDefault();
        setPubError("");
    
        if (!newPubName.trim()) {
            setPubError("Please enter a pub name.");
            return;
        }
    
        setSavingPub(true);
        try {
            const data = {
                name: newPubName.trim(),
                location: newPubLocation.trim() || "",
                status: "to-visit",
                addedBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            };
        
            if (newPubLat && newPubLng) {
                data.lat = parseFloat(newPubLat);
                data.lng = parseFloat(newPubLng);
            }
        
            if (newPubPhotoURL.trim()) {
                data.photoURL = newPubPhotoURL.trim();
            }
        
            if (newPubGoogleLink.trim()) {
                data.googleLink = newPubGoogleLink.trim();
            }
        
            await pubsRef.add(data);
        
            setNewPubName("");
            setNewPubLocation("");
            setNewPubLat("");
            setNewPubLng("");
            setNewPubPhotoURL("");
            setNewPubGoogleLink("");
        } catch (e) {
            console.error("Error adding pub", e);
            setPubError("Could not add pub. Please try again.");
        } finally {
            setSavingPub(false);
        }
    };
    
    const handleRoleChange = async (memberId, role) => {
        if (!isOwner) return;
        if (memberId === user.uid && role !== "owner") {
            return;
        }
    
        try {
            if (role === "owner") {
                await groupRef.update({
                    ownerUid: memberId,
                    managers: firebase.firestore.FieldValue.arrayRemove(memberId),
                });
            } else if (role === "manager") {
                await groupRef.update({
                    managers: firebase.firestore.FieldValue.arrayUnion(memberId),
                });
            } else if (role === "member") {
                await groupRef.update({
                    managers: firebase.firestore.FieldValue.arrayRemove(memberId),
                });
            }
        } catch (e) {
            console.error("Error changing role", e);
        }
    };
    
    const handleRemoveMember = async (memberId) => {
        if (!isOwner) return;
        if (memberId === user.uid) return; 
    
        try {
            await groupRef.update({
                members: firebase.firestore.FieldValue.arrayRemove(memberId),
                managers: firebase.firestore.FieldValue.arrayRemove(memberId),
            });
        
            await db
                .collection("users")
                .doc(memberId)
                .update({
                    groups: firebase.firestore.FieldValue.arrayRemove(currentGroup.id),
                });
        } catch (e) {
            console.error("Error removing member", e);
        }
    };
    
    const handleCopyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopyMessage("Invite link copied!");
            setTimeout(() => setCopyMessage(""), 2000);
        } catch (e) {
            console.error("Error copying invite link", e);
            setCopyMessage("Could not copy. Please copy manually.");
        }
    };
    
    const getUserLabel = (uid) => {
        const u = allUsers[uid];
        return u?.displayName || u?.email || uid;
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Manage Group</h2>
            <p className="text-sm text-gray-500">
                Group: <span className="font-semibold">{currentGroup.groupName}</span>
            </p>
        
            <div className="bg-white p-4 rounded-lg shadow space-y-3">
                <h3 className="text-lg font-semibold text-gray-700">Invite & Share</h3>
                <p className="text-sm text-gray-600">
                    Share this link or code so friends can join{" "}
                    <span className="font-semibold">{currentGroup.groupName}</span>.
                </p>
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-500 uppercase">
                        Invite link
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={inviteUrl}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50"
                        />
                        <button
                            onClick={handleCopyInvite}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                        >
                            Copy
                        </button>
                        <button
                            onClick={() => setShowQr(true)}
                            className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
                        >
                            Show QR
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Or share this code:{" "}
                        <span className="font-mono font-semibold">{inviteCode}</span>
                    </p>
                    {copyMessage && (
                        <p className="text-xs text-green-600 mt-1">{copyMessage}</p>
                    )}
                </div>
            </div>
        
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700">
                        Rating Criteria
                    </h3>
                    <form onSubmit={handleAddCriterion} className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCriterionName}
                                onChange={(e) => setNewCriterionName(e.target.value)}
                                placeholder="New criterion name"
                                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                                value={newCriterionType}
                                onChange={(e) => setNewCriterionType(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm bg-white"
                            >
                                <option value="scale">Scale (1–10)</option>
                                <option value="yes-no">Yes / No</option>
                                <option value="price">Price (cheap → pricey)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Weight</label>
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={newCriterionWeight}
                                onChange={(e) => setNewCriterionWeight(e.target.value)}
                                className="w-20 px-2 py-1 border rounded-lg text-sm"
                            />
                            <button
                                type="submit"
                                disabled={savingCriterion}
                                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                            >
                                {savingCriterion ? "Adding..." : "Add"}
                            </button>
                        </div>
                        {criterionError && (
                            <p className="text-xs text-red-500">{criterionError}</p>
                        )}
                    </form>
            
                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {criteria.map((c) => (
                            <div key={c.id} className="flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-gray-50">
                                <div className="flex-1 mr-4">
                                    {editingCriterionId === c.id ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                value={editingCriterionName} 
                                                onChange={(e) => setEditingCriterionName(e.target.value)}
                                                className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button onClick={() => handleSaveCriterionEdit(c.id)} className="text-green-600 hover:text-green-800 font-semibold">Save</button>
                                            <button onClick={() => setEditingCriterionId(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-800">{c.name}</p>
                                                <button onClick={() => { setEditingCriterionId(c.id); setEditingCriterionName(c.name); }} className="text-blue-500 hover:text-blue-700 text-xs">Edit</button>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Type: {c.type} · Weight: {c.weight ?? 1}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleArchiveCriterion(c.id, !c.archived)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${c.archived ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                                >
                                    {c.archived ? "Restore" : "Archive"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
        
                <div className="bg-white p-4 rounded-lg shadow space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700">Add Pub</h3>
                    <form onSubmit={handleAddPub} className="space-y-2">
                        <input
                            type="text"
                            value={newPubName}
                            onChange={(e) => setNewPubName(e.target.value)}
                            placeholder="Pub name"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            value={newPubLocation}
                            onChange={(e) => setNewPubLocation(e.target.value)}
                            placeholder="Area / address (optional)"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPubLat}
                                onChange={(e) => setNewPubLat(e.target.value)}
                                placeholder="Lat (optional)"
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                            <input
                                type="text"
                                value={newPubLng}
                                onChange={(e) => setNewPubLng(e.target.value)}
                                placeholder="Lng (optional)"
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                        <input
                            type="text"
                            value={newPubPhotoURL}
                            onChange={(e) => setNewPubPhotoURL(e.target.value)}
                            placeholder="Photo URL (optional)"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                            type="text"
                            value={newPubGoogleLink}
                            onChange={(e) => setNewPubGoogleLink(e.target.value)}
                            placeholder="Google Maps link (optional)"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <button
                            type="submit"
                            disabled={savingPub}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60"
                        >
                            {savingPub ? "Adding..." : "Add Pub"}
                        </button>
                        {pubError && (
                            <p className="text-xs text-red-500 mt-1">{pubError}</p>
                        )}
                    </form>
                    
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-md font-semibold text-gray-700 flex items-center gap-2 mb-2">
                            Pubs Missing Coordinates 
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">{pubs.filter(p => !p.lat || !p.lng).length}</span>
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">These pubs will not appear on the map. Please edit them to add Latitude and Longitude.</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {pubs.filter(p => !p.lat || !p.lng).map(pub => (
                                <div key={pub.id} className="text-sm flex justify-between items-center bg-orange-50 px-2 py-1 rounded">
                                    <span className="text-gray-800">{pub.name}</span>
                                    <span className="text-orange-600" title="Missing Coordinates">⚠️</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        
            <div className="bg-white p-4 rounded-lg shadow space-y-3">
                <h3 className="text-lg font-semibold text-gray-700">Members & Roles</h3>
                <p className="text-xs text-gray-500">
                    Only the owner can change roles or remove members.
                </p>
                <div className="max-h-72 overflow-y-auto space-y-2">
                    {members.map((uid) => {
                        const isManager = managers.includes(uid);
                        const isGroupOwner = currentGroup.ownerUid === uid;
                        return (
                            <div
                                key={uid}
                                className="flex items-center justify-between px-3 py-2 border rounded-lg text-sm"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {getUserLabel(uid)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {isGroupOwner
                                        ? "Owner"
                                        : isManager
                                        ? "Manager"
                                        : "Member"}
                                    </p>
                                </div>
                                {isOwner && !isGroupOwner && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={isManager ? "manager" : "member"}
                                            onChange={(e) => handleRoleChange(uid, e.target.value)}
                                            className="px-2 py-1 border rounded-lg text-xs bg-white"
                                        >
                                            <option value="member">Member</option>
                                            <option value="manager">Manager</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(uid)}
                                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        
            {showQr && (
                <div className="modal-backdrop">
                    <div className="bg-white p-4 rounded-lg shadow space-y-3 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Scan to join
                        </h3>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`}
                            alt="Group invite QR"
                            className="mx-auto"
                        />
                        <p className="text-xs text-gray-500 text-center mt-2">
                            This QR encodes: <span className="font-mono">{inviteUrl}</span>
                        </p>
                        <button
                            onClick={() => setShowQr(false)}
                            className="mt-3 w-full bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-gray-800 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}