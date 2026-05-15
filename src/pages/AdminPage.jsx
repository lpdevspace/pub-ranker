import React, { useState, useEffect, useMemo } from 'react';
import { firebase, storage } from '../firebase'; 
import imageCompression from 'browser-image-compression'; 
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../hooks/useToast';

export default function AdminPage({
    criteria, pubs, user, currentGroup, pubsRef, criteriaRef, groupRef, allUsers, db, featureFlags, scores = {} 
}) {
    const { showToast } = useToast();
    const [confirmState, setConfirmState] = useState(null);
    const [activeTab, setActiveTab] = useState('settings'); 

    // --- SETTINGS STATES ---
    const [editGroupName, setEditGroupName] = useState(currentGroup?.groupName || "");
    const [editGroupCover, setEditGroupCover] = useState(currentGroup?.coverPhoto || "");
    const [brandColor, setBrandColor] = useState(currentGroup?.brandColor || "#2563eb"); 
    const [requireApproval, setRequireApproval] = useState(currentGroup?.requireApproval || false);
    const [city, setCity] = useState(currentGroup?.city || "");
    const [isPublic, setIsPublic] = useState(currentGroup?.isPublic || false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState("");

    // --- WEIGHTS STATE ---
    const [localWeights, setLocalWeights] = useState({});

    const sanitizeImageUrl = (value) => {
        if (!value || typeof value !== 'string') return "";
        try {
            const parsed = new URL(value, window.location.origin);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
        } catch (_) {}
        return "";
    };

    const safeEditGroupCover = sanitizeImageUrl(editGroupCover);
    const [savingWeights, setSavingWeights] = useState(false);

    // --- MEMBERS STATE ---
    const [pendingMembers, setPendingMembers] = useState(currentGroup?.pendingMembers || []);
    const [memberTitles, setMemberTitles] = useState(currentGroup?.memberTitles || {});
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [editingTitleText, setEditingTitleText] = useState("");
    const [managers, setManagers] = useState(currentGroup?.managers || []);
    const [members, setMembers] = useState(currentGroup?.members || []);

    // --- CRITERIA STATE ---
    const [newCriterionName, setNewCriterionName] = useState("");
    const [newCriterionType, setNewCriterionType] = useState("scale");
    const [newCriterionWeight, setNewCriterionWeight] = useState(1);
    const [savingCriterion, setSavingCriterion] = useState(false);
    const [criterionError, setCriterionError] = useState("");
    const [editingCriterionId, setEditingCriterionId] = useState(null);
    const [editingCriterionName, setEditingCriterionName] = useState("");
    
    // --- PUBS STATE ---
    const [masterSearchTerm, setMasterSearchTerm] = useState("");
    const [masterResults, setMasterResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [newPubName, setNewPubName] = useState("");
    const [newPubLocation, setNewPubLocation] = useState("");
    const [newPubLat, setNewPubLat] = useState("");
    const [newPubLng, setNewPubLng] = useState("");
    const [newPubPhotoURL, setNewPubPhotoURL] = useState("");
    const [newPubGoogleLink, setNewPubGoogleLink] = useState("");
    const [savingPub, setSavingPub] = useState(false);
    const [pubError, setPubError] = useState("");
    const [uploading, setUploading] = useState(false);
    
    // --- MISC STATES ---
    const [copyMessage, setCopyMessage] = useState("");
    const [showQr, setShowQr] = useState(false);

    // --- AUDIT LOGS STATE ---
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Guard: if currentGroup hasn't loaded yet, show a loading state
    if (!currentGroup) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 dark:text-gray-400">Loading group data...</p>
            </div>
        );
    }
    
    const inviteCode = currentGroup?.id || groupRef?.id;
    const inviteUrl = `${window.location.origin}?invite=${inviteCode}`;
    
    const isCurrentUserOwner = currentGroup?.ownerUid === user?.uid;
    const isCurrentUserManager = currentGroup?.managers?.includes(user?.uid);
    const canManageSettings = isCurrentUserOwner || isCurrentUserManager;
    
    useEffect(() => {
        setManagers(currentGroup?.managers || []);
        setMembers(currentGroup?.members || []);
        setPendingMembers(currentGroup?.pendingMembers || []);
        setMemberTitles(currentGroup?.memberTitles || {});
        setEditGroupName(currentGroup?.groupName || "");
        setEditGroupCover(currentGroup?.coverPhoto || "");
        setRequireApproval(currentGroup?.requireApproval || false);
        setCity(currentGroup?.city || "");
        setIsPublic(currentGroup?.isPublic || false);
    }, [currentGroup]);

    useEffect(() => {
        const w = {};
        criteria.forEach(c => { w[c.id] = c.weight ?? 1; });
        setLocalWeights(w);
    }, [criteria]);

    // FETCH AUDIT LOGS
    useEffect(() => {
        if (activeTab === 'audit') {
            setLoadingLogs(true);
            const unsub = groupRef.collection('auditLogs')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .onSnapshot(snap => {
                    setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    setLoadingLogs(false);
                });
            return () => unsub();
        }
    }, [activeTab, groupRef]);

    const getUserLabel = (uid) => {
        const u = allUsers[uid];
        return u?.displayName || u?.email || uid;
    };

    // MASTER LOGGING FUNCTION
    const logAdminAction = async (actionTitle, details = "") => {
        try {
            await groupRef.collection('auditLogs').add({
                action: actionTitle,
                details: details,
                adminId: user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to write audit log:", e);
        }
    };

    const simulatedLeaderboard = useMemo(() => {
        if (!pubs || !scores) return [];
        const visitedPubs = pubs.filter(p => p.status === 'visited');
        return visitedPubs.map(pub => {
            let totalScore = 0; let totalWeight = 0;
            const pubScoresData = scores[pub.id] ?? {};
            Object.entries(pubScoresData).forEach(([criterionId, criterionScores]) => {
                const weight = localWeights[criterionId] ?? 1;
                criterionScores.forEach((score) => {
                    if (score.type === 'scale' && score.value !== null) { totalScore += score.value * weight; totalWeight += weight; }
                    else if (score.type === 'price' && score.value !== null) { totalScore += (score.value * 2) * weight; totalWeight += weight; }
                });
            });
            return { ...pub, avgScore: totalWeight > 0 ? totalScore / totalWeight : 0 };
        }).sort((a, b) => b.avgScore - a.avgScore).slice(0, 5); 
    }, [pubs, scores, localWeights]);

    const handleExportData = () => {
        let csv = "Pub Name,Location,Status,Added By\n";
        pubs.forEach(p => {
            const addedBy = allUsers[p.addedBy]?.displayName || allUsers[p.addedBy]?.email || "Unknown";
            csv += `"${p.name}","${p.location}","${p.status}","${addedBy}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${(currentGroup?.groupName || 'group').replace(/\s+/g, '_')}_Pubs.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logAdminAction("Exported Data", "Downloaded Group Data as CSV");
    };

    const handleSaveSettings = async () => {
        if (!editGroupName.trim()) return;
        setIsSavingSettings(true);
        try {
            await groupRef.update({
                groupName: editGroupName.trim(),
                coverPhoto: editGroupCover.trim(),
                brandColor: brandColor, 
                requireApproval: requireApproval,
                city: city.trim(),
                isPublic: isPublic
            });
            logAdminAction("Updated Group Settings", "Changed branding or privacy settings");
            showToast("Group settings saved!", "success");
        } catch (e) { 
            console.error("Error saving settings", e); 
            showToast("Failed to save settings.", "error");
        }
        setIsSavingSettings(false);
    };

    const handleSyncLegacyPubs = () => {
        const legacyPubs = pubs.filter(p => !p.placeId);
        if (legacyPubs.length === 0) {
            showToast("All your pubs are already synced with Google!", "success");
            return;
        }

        setConfirmState({
            title: 'Sync Legacy Pubs',
            message: `Found ${legacyPubs.length} pub${legacyPubs.length !== 1 ? 's' : ''} missing Google data. This will use your Google API quota. Do you want to proceed?`,
            confirmLabel: 'Sync Now',
            danger: false,
            onConfirm: () => runSyncLegacyPubs(legacyPubs),
        });
    };

    const runSyncLegacyPubs = async (legacyPubs) => {
        setIsSyncing(true);
        let successCount = 0;

        try {
            const { Place } = await window.google.maps.importLibrary("places");

            for (let i = 0; i < legacyPubs.length; i++) {
                const pub = legacyPubs[i];
                setSyncProgress(`Syncing ${i + 1} of ${legacyPubs.length}: ${pub.name}...`);

                try {
                    const searchQuery = pub.location ? `${pub.name} in ${pub.location}` : pub.name;
                    const request = { textQuery: searchQuery, fields: ['id', 'displayName', 'rating', 'photos', 'formattedAddress'] };
                    const { places } = await Place.searchByText(request);

                    if (places && places.length > 0) {
                        const bestMatch = places[0];
                        const updates = { placeId: bestMatch.id };
                        if (bestMatch.rating) updates.googleRating = bestMatch.rating;
                        if (bestMatch.photos && bestMatch.photos.length > 0 && !pub.photoURL) {
                            updates.photoURL = bestMatch.photos[0].getURI({ maxWidth: 800 });
                        }
                        await pubsRef.doc(pub.id).update(updates);
                        successCount++;
                    }
                } catch (err) { console.error(`Failed to sync ${pub.name}:`, err); }
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            logAdminAction("Database Maintenance", `Synced ${successCount} legacy pubs with Google Places API`);
            showToast(`Sync complete! Updated ${successCount} of ${legacyPubs.length} legacy pubs.`, "success");
        } catch (error) {
            console.error("Critical error during sync:", error);
            showToast("Failed to initialise Google Places API.", "error");
        } finally {
            setIsSyncing(false);
            setSyncProgress("");
        }
    };

    const handleSaveWeights = async () => {
        setSavingWeights(true);
        try {
            const promises = criteria.map(c => {
                if (localWeights[c.id] !== c.weight) return criteriaRef.doc(c.id).update({ weight: localWeights[c.id] });
                return null;
            }).filter(Boolean);
            await Promise.all(promises);
            logAdminAction("Updated Global Weights", "Adjusted the multiplier weights for the leaderboard");
            showToast("Global weights updated!", "success");
        } catch(e) { 
            console.error("Error saving weights", e); 
            showToast("Failed to save weights.", "error");
        } finally { setSavingWeights(false); }
    };

    const handleApproveMember = async (uid) => {
        try {
            await groupRef.update({ pendingMembers: firebase.firestore.FieldValue.arrayRemove(uid), members: firebase.firestore.FieldValue.arrayUnion(uid) });
            await db.collection("users").doc(uid).update({ groups: firebase.firestore.FieldValue.arrayUnion(currentGroup.id) });
            logAdminAction("Approved Member", `Allowed ${getUserLabel(uid)} to join the group`);
            showToast(`${getUserLabel(uid)} approved!`, "success");
        } catch (e) { 
            console.error("Error approving member", e); 
            showToast("Failed to approve member.", "error");
        }
    };

    const handleRejectMember = (uid) => {
        setConfirmState({
            title: 'Reject Join Request',
            message: `Are you sure you want to reject ${getUserLabel(uid)}'s request to join?`,
            confirmLabel: 'Reject',
            danger: true,
            onConfirm: async () => {
                try { 
                    await groupRef.update({ pendingMembers: firebase.firestore.FieldValue.arrayRemove(uid) }); 
                    logAdminAction("Rejected Member", `Denied entry to ${getUserLabel(uid)}`);
                    showToast(`${getUserLabel(uid)}'s request rejected.`, "info");
                } 
                catch (e) { 
                    console.error("Error rejecting member", e); 
                    showToast("Failed to reject request.", "error");
                }
            },
        });
    };

    const handleSaveTitle = async (uid) => {
        try { 
            await groupRef.update({ [`memberTitles.${uid}`]: editingTitleText.trim() }); 
            setEditingTitleId(null); 
            logAdminAction("Changed Member Title", `Gave ${getUserLabel(uid)} the title "${editingTitleText.trim()}"`);
            showToast("Title saved!", "success");
        } 
        catch (e) { 
            console.error("Error saving title", e); 
            showToast("Failed to save title.", "error");
        }
    };

    const handleRoleChange = async (memberId, role) => {
        if (!isCurrentUserOwner || (memberId === user.uid && role !== "owner")) return;
        try {
            if (role === "owner") await groupRef.update({ ownerUid: memberId, managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
            else if (role === "manager") await groupRef.update({ managers: firebase.firestore.FieldValue.arrayUnion(memberId) });
            else if (role === "member") await groupRef.update({ managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
            
            logAdminAction("Changed Role", `Made ${getUserLabel(memberId)} a ${role}`);
            showToast(`Role updated to ${role}.`, "success");
        } catch (e) { 
            console.error(e); 
            showToast("Failed to update role.", "error");
        }
    };
    
    const handleRemoveMember = (memberId) => {
        if (!isCurrentUserOwner || memberId === user.uid) return;
        setConfirmState({
            title: 'Kick Member',
            message: `Are you sure you want to remove ${getUserLabel(memberId)} from the group? They can rejoin via the invite link.`,
            confirmLabel: 'Kick',
            danger: true,
            onConfirm: async () => {
                try {
                    await groupRef.update({ members: firebase.firestore.FieldValue.arrayRemove(memberId), managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
                    await db.collection("users").doc(memberId).update({ groups: firebase.firestore.FieldValue.arrayRemove(currentGroup.id) });
                    logAdminAction("Kicked Member", `Removed ${getUserLabel(memberId)} from the group`);
                    showToast(`${getUserLabel(memberId)} removed.`, "info");
                } catch (e) { 
                    console.error(e); 
                    showToast("Failed to remove member.", "error");
                }
            },
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { 
            showToast("Please select an image file.", "error");
            return; 
        }
        setUploading(true);
        try {
            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            const fileRef = storage.ref(`pubs/global/${Date.now()}_${file.name}`);
            await fileRef.put(compressedFile);
            const url = await fileRef.getDownloadURL();
            setNewPubPhotoURL(url);
        } catch (err) { 
            console.error("Upload failed:", err); 
            showToast("Failed to upload image.", "error");
        } 
        finally { setUploading(false); }
    };

    const handleAddCriterion = async (e) => {
        e.preventDefault();
        if (!isCurrentUserOwner && !isCurrentUserManager) { 
            showToast("You do not have permission to add criteria.", "error");
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
            logAdminAction("Added Criterion", `Created new rating category: ${newCriterionName.trim()}`);
            setNewCriterionName(""); setNewCriterionType("scale"); setNewCriterionWeight(1);
            showToast("Criterion added!", "success");
        } catch (e) { setCriterionError("Could not add criterion."); } 
        finally { setSavingCriterion(false); }
    };
    
    const handleArchiveCriterion = async (id, archived, name) => {
        try { 
            await criteriaRef.doc(id).update({ archived }); 
            logAdminAction(archived ? "Archived Criterion" : "Restored Criterion", `Target: ${name}`);
            showToast(archived ? `"${name}" archived.` : `"${name}" restored.`, "success");
        } catch (e) { 
            console.error(e); 
            showToast("Failed to update criterion.", "error");
        }
    };

    const handleSaveCriterionEdit = async (id) => {
        if (!editingCriterionName.trim()) return;
        try { 
            await criteriaRef.doc(id).update({ name: editingCriterionName.trim() }); 
            setEditingCriterionId(null); 
            logAdminAction("Edited Criterion", `Changed name to: ${editingCriterionName.trim()}`);
            showToast("Criterion updated!", "success");
        } 
        catch(e) { 
            console.error(e); 
            showToast("Failed to update criterion.", "error");
        }
    };

    const searchMasterList = async (e) => {
        e.preventDefault();
        if (!masterSearchTerm.trim()) return;
        setSavingPub(true);
        try {
            const snap = await db.collection('pubs').get();
            const allGlobal = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const term = masterSearchTerm.toLowerCase();
            const matches = allGlobal.filter(p => p.name.toLowerCase().includes(term) || (p.location && p.location.toLowerCase().includes(term)));
            setMasterResults(matches);
            setHasSearched(true);
        } catch (err) {
            console.error(err);
            showToast("Error searching master database.", "error");
        } finally {
            setSavingPub(false);
        }
    };

    const importPub = async (globalPub) => {
        const existing = pubs.find(p => p.globalId === globalPub.id || p.name.toLowerCase() === globalPub.name.toLowerCase());
        if (existing) {
            showToast("This pub is already in your group!", "error");
            return;
        }

        try {
            await pubsRef.add({
                name: globalPub.name || "",
                location: globalPub.location || "",
                lat: globalPub.lat || null,
                lng: globalPub.lng || null,
                photoURL: globalPub.photoURL || "",
                googleLink: globalPub.googleLink || "",
                placeId: globalPub.placeId || "",
                googleRating: globalPub.googleRating || null,
                tags: globalPub.tags || [],
                globalId: globalPub.id,
                addedBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: "to-visit"
            });

            if (groupRef) {
                await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(1) });
            }

            logAdminAction("Imported Pub", `Added ${globalPub.name} from the Global Database`);
            showToast(`${globalPub.name} imported successfully!`, "success");
            setMasterSearchTerm("");
            setMasterResults([]);
            setHasSearched(false);
            setShowManualForm(false);
        } catch (err) {
            console.error(err);
            showToast("Failed to import pub.", "error");
        }
    };
    
    const handleAddPub = async (e) => {
        e.preventDefault();
        if (!isCurrentUserOwner && !isCurrentUserManager) { 
            showToast("You do not have permission to add pubs.", "error");
            return; 
        }
        setPubError("");
        if (!newPubName.trim()) return setPubError("Please enter a pub name.");
        
        setSavingPub(true);
        
        try {
            let googlePhotoUrl = "";
            let googleRating = null;
            let placeId = "";
            let fullAddress = newPubLocation.trim() || "";

            try {
                if (window.google && !featureFlags?.disableGoogleAPI) { 
                    const { Place } = await window.google.maps.importLibrary("places");
                    const searchQuery = fullAddress ? `${newPubName.trim()} in ${fullAddress}` : newPubName.trim();
                    const request = { textQuery: searchQuery, fields: ['id', 'displayName', 'rating', 'photos', 'formattedAddress'] };
                    const { places } = await Place.searchByText(request);

                    if (places && places.length > 0) {
                        const bestMatch = places[0];
                        placeId = bestMatch.id;
                        googleRating = bestMatch.rating || null;
                        if (bestMatch.formattedAddress) fullAddress = bestMatch.formattedAddress;
                        if (bestMatch.photos && bestMatch.photos.length > 0) {
                            googlePhotoUrl = bestMatch.photos[0].getURI({ maxWidth: 800 }); 
                        }
                    }
                }
            } catch (googleErr) {
                console.error("Failed to fetch Google Data, continuing with manual data:", googleErr);
            }

            const pubData = {
                name: newPubName.trim(),
                location: fullAddress,
                lat: newPubLat ? parseFloat(newPubLat) : null,
                lng: newPubLng ? parseFloat(newPubLng) : null,
                photoURL: newPubPhotoURL.trim() || googlePhotoUrl || "",
                googleLink: newPubGoogleLink.trim() || "",
                placeId: placeId || "",
                googleRating: googleRating || null,
                addedBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            const globalPubRef = await db.collection('pubs').add({
                ...pubData,
                isLocked: false 
            });

            await pubsRef.add({
                ...pubData,
                globalId: globalPubRef.id,
                status: "to-visit"
            });
            
            if (groupRef) {
                await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(1) });
            }

            logAdminAction("Created Pub", `Created ${newPubName.trim()} entirely manually`);
            
            setNewPubName(""); setNewPubLocation(""); setNewPubLat(""); setNewPubLng(""); setNewPubPhotoURL(""); setNewPubGoogleLink("");
            setShowManualForm(false);
            setMasterSearchTerm("");
            setHasSearched(false);
            showToast("Pub created and added to your group!", "success");
            
        } catch (e) { 
            console.error("Error saving pub to Firebase:", e);
            setPubError("Could not add pub."); 
        } finally { 
            setSavingPub(false); 
        }
    };

    const handleDeleteGroupPub = (pubId, pubName) => {
        setConfirmState({
            title: 'Remove Pub',
            message: `Remove "${pubName}" from your group? This will also delete any ratings associated with it.`,
            confirmLabel: 'Remove',
            danger: true,
            onConfirm: async () => {
                try {
                    await pubsRef.doc(pubId).delete();
                    
                    if (groupRef) {
                        await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(-1) });
                    }

                    logAdminAction("Deleted Pub", `Removed ${pubName} from the group directory`);
                    showToast(`"${pubName}" removed.`, "info");
                } catch (error) {
                    console.error("Error removing pub:", error);
                    showToast("Failed to remove pub.", "error");
                }
            },
        });
    };

    const handleCopyInvite = async () => {
        try { await navigator.clipboard.writeText(inviteUrl); setCopyMessage("Invite link copied!"); setTimeout(() => setCopyMessage(""), 2000); } 
        catch (e) { setCopyMessage("Could not copy."); }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* ConfirmModal */}
            {confirmState && (
                <ConfirmModal
                    {...confirmState}
                    onClose={() => setConfirmState(null)}
                />
            )}

            <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Group Admin</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Managing <span className="font-bold text-blue-600 dark:text-blue-400">{currentGroup?.groupName}</span></p>
            </div>

            <div className="flex overflow-x-auto bg-gray-200 dark:bg-gray-700 p-1 rounded-xl shadow-inner gap-1 hide-scrollbar">
                {[
                    { id: 'settings', icon: '⚙️', label: 'Settings' },
                    { id: 'invites', icon: '📨', label: 'Invites' },
                    { id: 'members', icon: '👥', label: `Members (${members.length})` },
                    { id: 'criteria', icon: '📋', label: `Add Criteria` },
                    { id: 'weights', icon: '⚖️', label: `Weights` },
                    { id: 'pubs', icon: '➕', label: 'Add Pubs' },
                    { id: 'manage-pubs', icon: '🍻', label: 'Manage Pubs' },
                    { id: 'audit', icon: '🕵️', label: 'Audit Logs' }, 
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[120px] py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                        {tab.id === 'members' && pendingMembers.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">{pendingMembers.length}</span>}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors duration-300 min-h-[400px]">
                
                {/* --- TAB: SETTINGS --- */}
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
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Brand Theme Color</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-10 w-16 p-1 border dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-800" />
                                        <span className="text-sm font-mono text-gray-500">{brandColor.toUpperCase()}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">This color will be used for primary buttons and accents across your group's dashboard.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cover Photo URL (Displays on Dashboard)</label>
                                    <input type="text" value={editGroupCover} onChange={e => setEditGroupCover(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white mb-3" />
                                    {safeEditGroupCover && <img src={safeEditGroupCover} alt="Cover Preview" className="h-32 w-full object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-600" onError={(e) => { e.target.style.display = "none"; }} />}
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

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 space-y-4 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-400">Export Group Data</h3>
                                <p className="text-sm text-blue-600 dark:text-blue-300">Download a .csv file of all your pubs, locations, and their statuses for use in Excel.</p>
                            </div>
                            <button onClick={handleExportData} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex flex-col items-center justify-center">
                                📥 Download CSV
                            </button>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800 space-y-4 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-orange-800 dark:text-orange-400">Database Maintenance</h3>
                                <p className="text-sm text-orange-600 dark:text-orange-300">If you have older pubs in your database that are missing cover photos and Google data, you can force a sync here.</p>
                            </div>
                            
                            <button 
                                onClick={handleSyncLegacyPubs} 
                                disabled={isSyncing} 
                                className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50 flex flex-col items-center justify-center"
                            >
                                {isSyncing ? (
                                    <>
                                        <span>🔄 Syncing... Please do not close this page.</span>
                                        <span className="text-xs font-normal mt-1 opacity-80">{syncProgress}</span>
                                    </>
                                ) : '🔄 Sync Legacy Pubs with Google'}
                            </button>
                        </div>

                        <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50">
                            {isSavingSettings ? 'Saving...' : '💾 Save Settings'}
                        </button>
                    </div>
                )}

                {/* --- TAB: INVITES --- */}
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

                {/* --- TAB: MEMBERS --- */}
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
                                            const isGroupOwner = currentGroup?.ownerUid === uid;
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
                                                                    <button onClick={() => { setEditingTitleId(uid); setEditingTitleText(memberTitles[uid] || ""); }} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 text-xs transition">✏️</button>
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

                {/* --- TAB: CRITERIA --- */}
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
                                    <button type="submit" disabled={savingCriterion} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60">Add Rule</button>
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
                                    <button onClick={() => canManageSettings && handleArchiveCriterion(c.id, !c.archived, c.name)} disabled={!canManageSettings} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${!canManageSettings ? 'opacity-50 cursor-not-allowed' : ''} ${c.archived ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                                        {c.archived ? "Restore" : "Archive"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB: WEIGHTS --- */}
                {activeTab === 'weights' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">
                            
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-6">
                                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    🔮 Live Preview (Top 5)
                                </h4>
                                <div className="space-y-2">
                                    {simulatedLeaderboard.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic">Rate some pubs to see the preview.</p>
                                    ) : (
                                        simulatedLeaderboard.map((pub, idx) => (
                                            <div key={pub.id} className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                                                <span className="font-bold text-gray-700 dark:text-gray-200"><span className="text-gray-400 mr-2">#{idx + 1}</span> {pub.name}</span>
                                                <span className="font-black text-blue-600 dark:text-blue-400">{pub.avgScore.toFixed(2)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Global Criteria Weights</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Adjust how important each criterion is. This will permanently alter the leaderboard rankings for everyone in the group.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                {criteria.filter(c => !c.archived).map((c) => (
                                    <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="font-bold text-gray-700 dark:text-gray-300 truncate pr-2">{c.name}</span>
                                            <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded font-black dark:text-blue-400">{(localWeights[c.id] ?? c.weight ?? 1).toFixed(1)}x</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.1" 
                                            max="3" 
                                            step="0.1" 
                                            value={localWeights[c.id] ?? c.weight ?? 1} 
                                            onChange={(e) => setLocalWeights(prev => ({ ...prev, [c.id]: parseFloat(e.target.value) }))} 
                                            className="w-full accent-blue-600 cursor-pointer" 
                                        />
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleSaveWeights} disabled={savingWeights} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 mt-6">
                                {savingWeights ? 'Updating Database...' : '💾 Save & Update Leaderboard'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- TAB: ADD PUBS --- */}
                {activeTab === 'pubs' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Add a Pub to Your Group</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Search the Global Master Database to save time and API quota, or manually create a new one.</p>

                            {!showManualForm ? (
                                <div className="space-y-6">
                                    <form onSubmit={searchMasterList} className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={masterSearchTerm} 
                                            onChange={e => setMasterSearchTerm(e.target.value)} 
                                            placeholder="Search global database (e.g., The Red Lion)..." 
                                            className="flex-1 px-4 py-3 border dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white shadow-sm" 
                                            required 
                                        />
                                        <button type="submit" disabled={savingPub} className="bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-md">
                                            {savingPub ? "Searching..." : "🔍 Search"}
                                        </button>
                                    </form>

                                    {hasSearched && (
                                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 animate-fadeIn">
                                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3">Search Results ({masterResults.length})</h4>
                                            
                                            {masterResults.length === 0 ? (
                                                <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <p className="text-gray-500 dark:text-gray-400 mb-4">No matching pubs found globally.</p>
                                                    <button onClick={() => setShowManualForm(true)} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-sm">
                                                        ➕ Create Custom Pub
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                                    {masterResults.map(pub => (
                                                        <div key={pub.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-300 transition group">
                                                            <div className="flex items-center gap-4">
                                                                {pub.photoURL ? (
                                                                    <img src={pub.photoURL} alt={pub.name} className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl shadow-sm">🍺</div>
                                                                )}
                                                                <div>
                                                                    <h5 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-lg leading-tight">
                                                                        {pub.name}
                                                                        {pub.isLocked && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" title="Verified by Super Admin">🔒 Verified</span>}
                                                                    </h5>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pub.location || 'Unknown Location'}</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => importPub(pub)} className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm ml-4 whitespace-nowrap">
                                                                📥 Import
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <div className="text-center pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Didn't find what you're looking for?</p>
                                                        <button onClick={() => setShowManualForm(true)} className="text-brand font-bold hover:underline">
                                                            ➕ Create a brand new pub
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleAddPub} className="space-y-4 animate-fadeIn">
                                    <button type="button" onClick={() => setShowManualForm(false)} className="text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white mb-2 inline-flex items-center gap-1 transition-colors">
                                        ← Back to Global Search
                                    </button>
                                    
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
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                                            </label>

                                            {newPubPhotoURL && (
                                                <div className="relative w-20 h-20 group">
                                                    <img src={newPubPhotoURL} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-md border-2 border-white dark:border-gray-600" />
                                                    <button type="button" onClick={() => setNewPubPhotoURL("")} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition">✕</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button type="submit" disabled={savingPub} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-60 shadow-md">
                                        {savingPub ? "Saving..." : "🍻 Create Global Pub & Import"}
                                    </button>
                                    {pubError && <p className="text-sm text-red-500 text-center font-bold">{pubError}</p>}
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: MANAGE PUBS --- */}
                {activeTab === 'manage-pubs' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Manage Group Pubs</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">View and remove pubs from your group's Hit List or Visited directory.</p>
                            
                            {pubs.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8 italic">No pubs in your group yet.</p>
                            ) : (
                                <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            <tr>
                                                <th className="p-3">Pub</th>
                                                <th className="p-3">Location</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {pubs.sort((a, b) => a.name.localeCompare(b.name)).map(pub => (
                                                <tr key={pub.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                    <td className="p-3 flex items-center gap-3 font-bold text-gray-800 dark:text-white">
                                                        {pub.photoURL ? (
                                                            <img src={pub.photoURL} alt={pub.name} className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm">🍺</div>
                                                        )}
                                                        {pub.name}
                                                    </td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400">{pub.location || '—'}</td>
                                                    <td className="p-3">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${pub.status === 'visited' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                            {pub.status === 'visited' ? '✅ Visited' : '📍 To Visit'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button onClick={() => handleDeleteGroupPub(pub.id, pub.name)} className="px-3 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-bold transition border border-red-100 dark:border-red-800">
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: AUDIT LOGS --- */}
                {activeTab === 'audit' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Audit Log</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">A record of the last 50 admin actions in this group.</p>
                        </div>
                        {loadingLogs ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic py-8 text-center">Loading logs...</p>
                        ) : auditLogs.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic py-8 text-center">No audit logs yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {auditLogs.map(log => (
                                    <div key={log.id} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 dark:text-white text-sm">{log.action}</p>
                                            {log.details && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.details}</p>}
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">by {getUserLabel(log.adminId)}</p>
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap pt-0.5">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
