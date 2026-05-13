import React, { useState, useEffect, useCallback } from 'react';
import { firebase, storage } from '../firebase';
import imageCompression from 'browser-image-compression';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Tiny toast helper — replaces alert() without a full toast library
// ---------------------------------------------------------------------------
function useToast() {
    const [toasts, setToasts] = useState([]);
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);
    return { toasts, showToast };
}

function ToastContainer({ toasts }) {
    if (!toasts.length) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`px-5 py-3 rounded-xl shadow-lg text-white text-sm font-bold animate-fadeIn ${
                    t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-500' : 'bg-green-600'
                }`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}

export default function SuperAdminPage({ db, userProfile, user }) {
    const [activeTab, setActiveTab] = useState('overview');

    const [stats, setStats] = useState({ users: 0, groups: 0, pubs: 0 });
    const [groupsList, setGroupsList] = useState([]);
    const [pubsList, setPubsList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [reportsList, setReportsList] = useState([]);
    const [venueClaimsList, setVenueClaimsList] = useState([]);

    const [managingGroup, setManagingGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState('');
    const [announcement, setAnnouncement] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

    const [gamification, setGamification] = useState({ pointsPerPub: 5, pointsPerReview: 2, pointsPerAdd: 3, pointsPerCrawl: 5, badges: [] });
    const [newBadge, setNewBadge] = useState({ emoji: '🍻', title: '', desc: '', metric: 'rated', threshold: 1 });
    const [isSavingGamification, setIsSavingGamification] = useState(false);

    const [featureFlags, setFeatureFlags] = useState({ enableComments: false, enableReactions: false, disableGoogleAPI: false });
    const [mergePrimary, setMergePrimary] = useState('');
    const [mergeDuplicate, setMergeDuplicate] = useState('');
    const [isMerging, setIsMerging] = useState(false);

    const [defaultCriteria, setDefaultCriteria] = useState([]);
    const [newDefCritName, setNewDefCritName] = useState('');
    const [newDefCritType, setNewDefCritType] = useState('scale');

    const [roles, setRoles] = useState({});
    const [newRoleName, setNewRoleName] = useState('');
    const defaultPermissions = { canBanUsers: false, canManageGroups: false, canDeletePubs: false, canModeratePhotos: false, canEditConfig: false };
    const [editingRolePermissions, setEditingRolePermissions] = useState({ ...defaultPermissions });

    const [tagsList, setTagsList] = useState([]);
    const [newTagName, setNewTagName] = useState('');
    const [newTagIcon, setNewTagIcon] = useState('');
    const [isUploadingTagIcon, setIsUploadingTagIcon] = useState(false);
    const [isSavingTag, setIsSavingTag] = useState(false);
    const [editingTag, setEditingTag] = useState(null);

    // ConfirmModal state
    const [confirmState, setConfirmState] = useState(null);

    // Toast
    const { toasts, showToast } = useToast();

    const isTrueSuperAdmin = !!userProfile?.isSuperAdmin;
    const isAdmin = isTrueSuperAdmin || !!userProfile?.isAdmin || !!userProfile?.permissions?.canEditConfig;
    const isModerator = isAdmin || !!userProfile?.isModerator || !!userProfile?.permissions?.canModeratePhotos;

    const fetchGlobalData = async () => {
        try {
            setGlobalError('');
            let userCount = 0, groupCount = 0, pubCount = 0;
            try {
                const [uCount, gCount, pCount] = await Promise.all([
                    db.collection('users').count().get(),
                    db.collection('groups').count().get(),
                    db.collection('pubs').count().get(),
                ]);
                userCount = uCount.data().count;
                groupCount = gCount.data().count;
                pubCount = pCount.data().count;
            } catch (e) {}

            setStats({ users: userCount, groups: groupCount, pubs: pubCount });

            const [usersSnap, groupsSnap, pubsSnap, feedbackSnap, annDoc, defDoc, reportsSnap, gamificationDoc, rolesDoc, tagsDoc, claimsSnap] = await Promise.all([
                db.collection('users').limit(100).get().catch(() => ({ docs: [] })),
                db.collection('groups').limit(100).get().catch(() => ({ docs: [] })),
                db.collection('pubs').orderBy('createdAt', 'desc').limit(100).get().catch(() => ({ docs: [] })),
                db.collection('feedback').orderBy('createdAt', 'desc').limit(50).get().catch(() => ({ docs: [] })),
                db.collection('global').doc('settings').get().catch(() => ({ exists: false, data: () => ({}) })),
                db.collection('global').doc('defaults').get().catch(() => ({ exists: false, data: () => ({}) })),
                db.collection('reports').where('resolved', '==', false).limit(50).get().catch(() => ({ docs: [] })),
                db.collection('global').doc('gamification').get().catch(() => ({ exists: false, data: () => ({}) })),
                db.collection('global').doc('roles').get().catch(() => ({ exists: false, data: () => ({}) })),
                db.collection('global').doc('tags').get().catch(() => ({ exists: false, data: () => ({}) })),
                db.collection('venueClaims').where('status', '==', 'pending').get().catch(() => ({ docs: [] })),
            ]);

            const groupsData = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            groupsData.sort((a, b) => (a.groupName || '').localeCompare(b.groupName || ''));
            setGroupsList(groupsData);
            setPubsList(pubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setUsersList(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setReportsList(reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setFeedbackList(feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setVenueClaimsList(claimsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            if (annDoc.exists) {
                setAnnouncement(annDoc.data().announcement || '');
                setIsMaintenanceMode(annDoc.data().maintenanceMode || false);
                setFeatureFlags(annDoc.data().featureFlags || { enableComments: false, enableReactions: false, disableGoogleAPI: false });
            }
            if (gamificationDoc.exists && gamificationDoc.data()) setGamification(prev => ({ ...prev, ...gamificationDoc.data() }));
            if (defDoc.exists) setDefaultCriteria(defDoc.data().criteria || []);
            if (rolesDoc.exists && rolesDoc.data().roleList) setRoles(rolesDoc.data().roleList);
            else setRoles({ admin: { name: 'Full Admin', perms: { canBanUsers: true, canManageGroups: true, canDeletePubs: true, canModeratePhotos: true, canEditConfig: true } }, mod: { name: 'Moderator', perms: { canBanUsers: false, canManageGroups: false, canDeletePubs: false, canModeratePhotos: true, canEditConfig: false } } });
            if (tagsDoc.exists && tagsDoc.data().tagList) setTagsList(tagsDoc.data().tagList);
            else setTagsList([]);
        } catch (error) {
            setGlobalError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (isModerator) fetchGlobalData(); }, [db, isModerator]);

    // -----------------------------------------------------------------------
    // CLAIM HANDLERS
    // -----------------------------------------------------------------------
    const handleApproveClaim = (claim) => {
        setConfirmState({
            title: 'Approve Venue Claim',
            message: `Approve claim for "${claim.pubName}"? This will grant ${claim.contactEmail} access to global analytics.`,
            confirmLabel: 'Approve',
            danger: false,
            onConfirm: async () => {
                try {
                    const batch = db.batch();
                    batch.update(db.collection('pubs').doc(claim.pubId), { claimedBy: firebase.firestore.FieldValue.arrayUnion(claim.requestedByUid), isLocked: true });
                    batch.update(db.collection('venueClaims').doc(claim.id), { status: 'approved', resolvedAt: firebase.firestore.FieldValue.serverTimestamp(), resolvedBy: user.uid });
                    await batch.commit();
                    setVenueClaimsList(prev => prev.filter(c => c.id !== claim.id));
                    setPubsList(prev => prev.map(p => p.id === claim.pubId ? { ...p, isLocked: true } : p));
                    showToast(`✅ ${claim.pubName} has been successfully assigned!`);
                } catch (err) { showToast('Failed to approve claim: ' + err.message, 'error'); }
            },
        });
    };

    const handleRejectClaim = (claimId) => {
        setConfirmState({
            title: 'Reject Venue Claim',
            message: 'Are you sure you want to reject this claim?',
            confirmLabel: 'Reject',
            danger: true,
            onConfirm: async () => {
                try {
                    await db.collection('venueClaims').doc(claimId).update({ status: 'rejected', resolvedAt: firebase.firestore.FieldValue.serverTimestamp(), resolvedBy: user.uid });
                    setVenueClaimsList(prev => prev.filter(c => c.id !== claimId));
                } catch (err) { showToast('Failed to reject claim: ' + err.message, 'error'); }
            },
        });
    };

    // -----------------------------------------------------------------------
    // PUB HANDLERS
    // -----------------------------------------------------------------------
    const handleTogglePubLock = (pub) => {
        const action = pub.isLocked ? 'Unlock & Unverify' : 'Lock & Verify';
        setConfirmState({
            title: `${action} Pub`,
            message: pub.isLocked
                ? `Unverifying "${pub.name}" will remove all business managers from this pub. Continue?`
                : `Mark "${pub.name}" as verified and lock it?`,
            confirmLabel: action,
            danger: pub.isLocked,
            onConfirm: async () => {
                try {
                    const updates = { isLocked: !pub.isLocked };
                    if (pub.isLocked) updates.claimedBy = firebase.firestore.FieldValue.delete();
                    await db.collection('pubs').doc(pub.id).update(updates);
                    setPubsList(prev => prev.map(p => p.id === pub.id ? { ...p, isLocked: !pub.isLocked, claimedBy: pub.isLocked ? null : p.claimedBy } : p));
                } catch (error) { showToast(`Failed to update pub: ${error.message}`, 'error'); }
            },
        });
    };

    const handleDeletePub = (pubId) => {
        setConfirmState({
            title: 'Delete Pub Globally',
            message: 'This will permanently delete the pub and break all existing ratings for users who scored it. This cannot be undone.',
            confirmLabel: 'Delete Pub',
            danger: true,
            requireTyped: 'DELETE',
            onConfirm: async () => {
                try {
                    await db.collection('pubs').doc(pubId).delete();
                    setPubsList(prev => prev.filter(p => p.id !== pubId));
                    setStats(prev => ({ ...prev, pubs: prev.pubs - 1 }));
                    showToast('Pub deleted globally.');
                } catch (error) { showToast(`Failed to delete pub: ${error.message}`, 'error'); }
            },
        });
    };

    const handleMergePubs = () => {
        if (!mergePrimary || !mergeDuplicate) return showToast('Please select both a Primary and a Duplicate pub.', 'warning');
        if (mergePrimary === mergeDuplicate) return showToast('You cannot merge a pub into itself.', 'warning');
        const primaryPub = pubsList.find(p => p.id === mergePrimary);
        const duplicatePub = pubsList.find(p => p.id === mergeDuplicate);
        setConfirmState({
            title: 'Merge Duplicate Pubs',
            message: `All ratings, comments, and upvotes from "${duplicatePub.name}" will be transferred to "${primaryPub.name}", then the duplicate will be permanently deleted. This cannot be undone.`,
            confirmLabel: 'Execute Merge',
            danger: true,
            requireTyped: 'MERGE',
            onConfirm: async () => {
                setIsMerging(true);
                try {
                    const scoresSnapshot = await db.collectionGroup('scores').where('pubId', '==', mergeDuplicate).get();
                    const updatePromises = scoresSnapshot.docs.map(doc => doc.ref.update({ pubId: mergePrimary }));
                    await Promise.all(updatePromises);
                    const combinedUpvotes = Array.from(new Set([...(primaryPub.upvotes || []), ...(duplicatePub.upvotes || [])]));
                    await db.collection('pubs').doc(mergePrimary).update({ upvotes: combinedUpvotes });
                    await db.collection('pubs').doc(mergeDuplicate).delete();
                    setPubsList(prev => prev.filter(p => p.id !== mergeDuplicate).map(p => p.id === mergePrimary ? { ...p, upvotes: combinedUpvotes } : p));
                    setStats(prev => ({ ...prev, pubs: prev.pubs - 1 }));
                    setMergePrimary(''); setMergeDuplicate('');
                    showToast(`✅ Merge complete! Transferred ${scoresSnapshot.size} scores and deleted the duplicate.`);
                } catch (error) { showToast(`Merge failed: ${error.message}`, 'error'); }
                finally { setIsMerging(false); }
            },
        });
    };

    const handleDeletePhoto = (pubId) => {
        setConfirmState({
            title: 'Delete Pub Photo',
            message: 'Delete this photo for violating guidelines? The pub will remain but the image will be removed.',
            confirmLabel: 'Delete Photo',
            danger: true,
            onConfirm: async () => {
                try {
                    await db.collection('pubs').doc(pubId).update({ photoURL: '' });
                    setPubsList(prev => prev.map(p => p.id === pubId ? { ...p, photoURL: '' } : p));
                    showToast('Photo removed.');
                } catch (error) { showToast(`Failed to delete photo: ${error.message}`, 'error'); }
            },
        });
    };

    // -----------------------------------------------------------------------
    // USER HANDLERS
    // -----------------------------------------------------------------------
    const handleToggleBan = (targetUser) => {
        const action = targetUser.isBanned ? 'Unban' : 'Ban';
        setConfirmState({
            title: `${action} ${targetUser.displayName}`,
            message: targetUser.isBanned
                ? `Restore full access for ${targetUser.displayName}?`
                : `Ban ${targetUser.displayName}? They will be locked out of the app immediately.`,
            confirmLabel: action,
            danger: !targetUser.isBanned,
            requireTyped: !targetUser.isBanned ? 'BAN' : null,
            onConfirm: async () => {
                try {
                    await db.collection('users').doc(targetUser.id).update({ isBanned: !targetUser.isBanned });
                    setUsersList(prev => prev.map(u => u.id === targetUser.id ? { ...u, isBanned: !targetUser.isBanned } : u));
                    showToast(`${targetUser.displayName} has been ${targetUser.isBanned ? 'restored' : 'banned'}.`);
                } catch (error) { showToast(`Failed to update user status: ${error.message}`, 'error'); }
            },
        });
    };

    const handleAssignUserRole = (userId, roleId) => {
        setConfirmState({
            title: 'Update User Permissions',
            message: `Assign the "${roleId === 'none' ? 'Standard User' : roles[roleId]?.name}" role to this user?`,
            confirmLabel: 'Update Role',
            danger: false,
            onConfirm: async () => {
                const assignedPerms = roleId === 'none' ? {} : roles[roleId].perms;
                try {
                    await db.collection('users').doc(userId).update({ assignedRole: roleId === 'none' ? null : roleId, permissions: assignedPerms, isAdmin: false, isModerator: false });
                    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, assignedRole: roleId, permissions: assignedPerms, isAdmin: false, isModerator: false } : u));
                    showToast('Role updated.');
                } catch (error) { showToast('Failed to assign role.', 'error'); }
            },
        });
    };

    // -----------------------------------------------------------------------
    // GROUP HANDLERS
    // -----------------------------------------------------------------------
    const handleJoinGroup = (groupId, groupName) => {
        if (!user || !user.uid) return showToast('Error: Could not verify your user ID. Try refreshing.', 'error');
        setConfirmState({
            title: `Join "${groupName}"`,
            message: 'This will add you to their member list and add the group to your navigation menu.',
            confirmLabel: 'Join Group',
            danger: false,
            onConfirm: async () => {
                try {
                    const myUid = user.uid;
                    await db.collection('groups').doc(groupId).update({ members: firebase.firestore.FieldValue.arrayUnion(myUid) });
                    await db.collection('users').doc(myUid).update({ groups: firebase.firestore.FieldValue.arrayUnion(groupId), activeGroupId: groupId });
                    setGroupsList(prev => prev.map(g => g.id === groupId ? { ...g, members: [...(g.members || []), myUid] } : g));
                    showToast(`Joined ${groupName}.`);
                } catch (error) { showToast(`Failed to join group: ${error.message}`, 'error'); }
            },
        });
    };

    const handlePromoteToOwner = (groupId, uid) => {
        setConfirmState({
            title: 'Transfer Group Ownership',
            message: 'Are you sure you want to transfer ownership to this user? This cannot be undone without another transfer.',
            confirmLabel: 'Transfer Ownership',
            danger: true,
            onConfirm: async () => {
                try {
                    await db.collection('groups').doc(groupId).update({ ownerUid: uid, managers: firebase.firestore.FieldValue.arrayRemove(uid) });
                    const updatedGroup = { ...managingGroup, ownerUid: uid, managers: (managingGroup.managers || []).filter(m => m !== uid) };
                    setManagingGroup(updatedGroup);
                    setGroupsList(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
                } catch (e) { showToast('Failed to transfer ownership: ' + e.message, 'error'); }
            },
        });
    };

    const handleToggleManager = async (groupId, uid, isManager) => {
        try {
            if (isManager) {
                await db.collection('groups').doc(groupId).update({ managers: firebase.firestore.FieldValue.arrayRemove(uid) });
                const updatedGroup = { ...managingGroup, managers: managingGroup.managers.filter(m => m !== uid) };
                setManagingGroup(updatedGroup); setGroupsList(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
            } else {
                await db.collection('groups').doc(groupId).update({ managers: firebase.firestore.FieldValue.arrayUnion(uid) });
                const updatedGroup = { ...managingGroup, managers: [...(managingGroup.managers || []), uid] };
                setManagingGroup(updatedGroup); setGroupsList(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
            }
        } catch (e) { showToast('Failed to toggle manager: ' + e.message, 'error'); }
    };

    const handleRemoveMember = (groupId, uid) => {
        setConfirmState({
            title: 'Remove Group Member',
            message: 'Are you sure you want to remove this user from the group?',
            confirmLabel: 'Remove Member',
            danger: true,
            onConfirm: async () => {
                try {
                    await db.collection('groups').doc(groupId).update({ members: firebase.firestore.FieldValue.arrayRemove(uid), managers: firebase.firestore.FieldValue.arrayRemove(uid) });
                    await db.collection('users').doc(uid).update({ groups: firebase.firestore.FieldValue.arrayRemove(groupId) });
                    const updatedGroup = { ...managingGroup, members: managingGroup.members.filter(m => m !== uid), managers: (managingGroup.managers || []).filter(m => m !== uid) };
                    setManagingGroup(updatedGroup); setGroupsList(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
                } catch (e) { showToast('Failed to remove member: ' + e.message, 'error'); }
            },
        });
    };

    const handleRevokePublicStatus = (groupId) => {
        setConfirmState({
            title: 'Revoke Public Status',
            message: 'Remove this group from the public leaderboard? They can re-enable it themselves.',
            confirmLabel: 'Revoke',
            danger: true,
            onConfirm: async () => {
                try {
                    await db.collection('groups').doc(groupId).update({ isPublic: false });
                    setGroupsList(prev => prev.map(g => g.id === groupId ? { ...g, isPublic: false } : g));
                } catch (error) { showToast(`Failed to revoke status: ${error.message}`, 'error'); }
            },
        });
    };

    const handleCleanupOrphanedGroups = () => {
        const orphaned = groupsList.filter(g => !g.members || g.members.length === 0);
        if (orphaned.length === 0) return showToast('No orphaned groups found — database is clean!', 'success');
        setConfirmState({
            title: `Deep Clean ${orphaned.length} Orphaned Groups`,
            message: `Found ${orphaned.length} groups with 0 members. This will permanently delete all associated scores, criteria, comments, and the groups themselves. This cannot be undone.`,
            confirmLabel: 'Deep Clean',
            danger: true,
            requireTyped: 'CLEAN',
            onConfirm: async () => {
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
                    } catch (e) { console.error(`Failed to deep clean group ${g.id}`, e); }
                }
                setGroupsList(prev => prev.filter(g => g.members && g.members.length > 0));
                setStats(prev => ({ ...prev, groups: prev.groups - deletedCount }));
                showToast(`Deep clean complete! Purged ${deletedCount} orphaned groups.`);
            },
        });
    };

    // -----------------------------------------------------------------------
    // MODERATION HANDLERS
    // -----------------------------------------------------------------------
    const handleResolveReport = async (id) => {
        try {
            await db.collection('reports').doc(id).update({ resolved: true });
            setReportsList(prev => prev.filter(r => r.id !== id));
        } catch (error) { showToast(`Failed to resolve report: ${error.message}`, 'error'); }
    };

    const handleDeleteReportedContent = (report) => {
        setConfirmState({
            title: `Delete Reported ${report.type}`,
            message: `Permanently delete this ${report.type}? This action cannot be undone.`,
            confirmLabel: `Delete ${report.type}`,
            danger: true,
            requireTyped: 'DELETE',
            onConfirm: async () => {
                try {
                    if (report.type === 'pub') {
                        await db.collection('pubs').doc(report.targetId).delete();
                        setPubsList(prev => prev.filter(p => p.id !== report.targetId));
                        showToast('Pub deleted globally.');
                    } else if (report.type === 'review') {
                        await db.collection('groups').doc(report.groupId).collection('scores').doc(report.targetId).delete();
                        showToast('Review deleted.');
                    } else if (report.type === 'comment') {
                        await db.collection('groups').doc(report.groupId).collection('scores').doc(report.scoreId).collection('comments').doc(report.targetId).delete();
                        showToast('Comment deleted.');
                    }
                    await db.collection('reports').doc(report.id).update({ resolved: true });
                    setReportsList(prev => prev.filter(r => r.id !== report.id));
                } catch (error) { showToast(`Failed to delete content: ${error.message}`, 'error'); }
            },
        });
    };

    // -----------------------------------------------------------------------
    // TAG HANDLERS
    // -----------------------------------------------------------------------
    const handleTagImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        setIsUploadingTagIcon(true);
        try {
            const options = { maxSizeMB: 0.1, maxWidthOrHeight: 400, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            const fileRef = storage.ref(`global/tags/${Date.now()}_${file.name}`);
            await fileRef.put(compressedFile);
            const url = await fileRef.getDownloadURL();
            if (editingTag) setEditingTag({ ...editingTag, iconUrl: url });
            else setNewTagIcon(url);
        } catch (err) { showToast('Failed to upload tag image.', 'error'); }
        finally { setIsUploadingTagIcon(false); }
    };

    const handleSaveTag = async (e) => {
        e.preventDefault();
        setIsSavingTag(true);
        try {
            let updatedList;
            if (editingTag) {
                if (!editingTag.name.trim()) { setIsSavingTag(false); return; }
                updatedList = tagsList.map(t => t.id === editingTag.id ? editingTag : t);
                setEditingTag(null);
            } else {
                if (!newTagName.trim()) { setIsSavingTag(false); return; }
                const newTag = { id: Date.now().toString(), name: newTagName.trim(), iconUrl: newTagIcon };
                updatedList = [...tagsList, newTag];
                setNewTagName(''); setNewTagIcon('');
            }
            await db.collection('global').doc('tags').set({ tagList: updatedList }, { merge: true });
            setTagsList(updatedList);
            showToast('Tag saved.');
        } catch (err) { showToast('Failed to save tag: ' + err.message, 'error'); }
        setIsSavingTag(false);
    };

    const handleDeleteTag = (id) => {
        setConfirmState({
            title: 'Delete Tag',
            message: 'Delete this tag globally? It will be removed from all pubs that currently have it.',
            confirmLabel: 'Delete Tag',
            danger: true,
            onConfirm: async () => {
                const updatedList = tagsList.filter(t => t.id !== id);
                try {
                    await db.collection('global').doc('tags').set({ tagList: updatedList }, { merge: true });
                    setTagsList(updatedList);
                } catch (err) { showToast('Failed to delete tag.', 'error'); }
            },
        });
    };

    // -----------------------------------------------------------------------
    // ROLE HANDLERS
    // -----------------------------------------------------------------------
    const handleSaveNewRole = async (e) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        const roleId = newRoleName.toLowerCase().replace(/\s+/g, '_');
        const updatedRoles = { ...roles, [roleId]: { name: newRoleName.trim(), perms: editingRolePermissions } };
        try {
            await db.collection('global').doc('roles').set({ roleList: updatedRoles }, { merge: true });
            setRoles(updatedRoles); setNewRoleName(''); setEditingRolePermissions({ ...defaultPermissions });
            showToast('Custom role created!');
        } catch (error) { showToast('Failed to save role: ' + error.message, 'error'); }
    };

    const handleDeleteRole = (roleId) => {
        setConfirmState({
            title: 'Delete Role',
            message: 'Delete this role? Users assigned to this role will lose these permissions immediately.',
            confirmLabel: 'Delete Role',
            danger: true,
            onConfirm: async () => {
                const updatedRoles = { ...roles };
                delete updatedRoles[roleId];
                try {
                    await db.collection('global').doc('roles').set({ roleList: updatedRoles }, { merge: true });
                    setRoles(updatedRoles);
                } catch (error) { showToast('Failed to delete role.', 'error'); }
            },
        });
    };

    // -----------------------------------------------------------------------
    // GAMIFICATION HANDLERS
    // -----------------------------------------------------------------------
    const handleSavePointRules = async () => {
        setIsSavingGamification(true);
        try {
            await db.collection('global').doc('gamification').set({ pointsPerPub: Number(gamification.pointsPerPub), pointsPerReview: Number(gamification.pointsPerReview), pointsPerAdd: Number(gamification.pointsPerAdd), pointsPerCrawl: Number(gamification.pointsPerCrawl || 5) }, { merge: true });
            showToast('Point system updated globally!');
        } catch (e) { showToast('Failed to save: ' + e.message, 'error'); }
        setIsSavingGamification(false);
    };

    const handleAddBadge = async (e) => {
        e.preventDefault();
        if (!newBadge.title.trim()) return;
        const updatedBadges = [...(gamification.badges || []), { ...newBadge, threshold: Number(newBadge.threshold) }];
        try {
            await db.collection('global').doc('gamification').set({ badges: updatedBadges }, { merge: true });
            setGamification({ ...gamification, badges: updatedBadges });
            setNewBadge({ emoji: '🍻', title: '', desc: '', metric: 'rated', threshold: 1 });
            showToast('Badge added!');
        } catch (e) { showToast('Failed to add badge: ' + e.message, 'error'); }
    };

    const handleDeleteBadge = async (index) => {
        const updatedBadges = gamification.badges.filter((_, i) => i !== index);
        try {
            await db.collection('global').doc('gamification').set({ badges: updatedBadges }, { merge: true });
            setGamification({ ...gamification, badges: updatedBadges });
        } catch (e) { showToast('Failed to delete badge: ' + e.message, 'error'); }
    };

    // -----------------------------------------------------------------------
    // MISC HANDLERS
    // -----------------------------------------------------------------------
    const handleAddDefaultCriteria = async (e) => {
        e.preventDefault();
        if (!newDefCritName.trim()) return;
        const newCrit = { name: newDefCritName.trim(), type: newDefCritType, weight: 1 };
        const updated = [...defaultCriteria, newCrit];
        setDefaultCriteria(updated);
        try {
            await db.collection('global').doc('defaults').set({ criteria: updated }, { merge: true });
            setNewDefCritName(''); setNewDefCritType('scale');
        } catch (error) { showToast(`Failed to save: ${error.message}`, 'error'); }
    };

    const handleDeleteDefaultCriteria = async (index) => {
        const updated = defaultCriteria.filter((_, i) => i !== index);
        setDefaultCriteria(updated);
        try { await db.collection('global').doc('defaults').set({ criteria: updated }, { merge: true }); }
        catch (error) { showToast(`Failed to delete: ${error.message}`, 'error'); }
    };

    const handlePublishAnnouncement = async () => {
        setIsPublishing(true);
        try {
            await db.collection('global').doc('settings').set({ announcement: announcement.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            showToast('Announcement published globally!');
        } catch (error) { showToast(`Failed to publish: ${error.message}`, 'error'); }
        setIsPublishing(false);
    };

    const handleClearAnnouncement = async () => {
        setAnnouncement('');
        setIsPublishing(true);
        try { await db.collection('global').doc('settings').set({ announcement: '' }, { merge: true }); }
        catch (error) { console.error(error); }
        setIsPublishing(false);
    };

    const handleToggleMaintenance = () => {
        const newState = !isMaintenanceMode;
        if (!newState) {
            // Turning OFF — no confirmation needed
            (async () => {
                setIsMaintenanceMode(false);
                try { await db.collection('global').doc('settings').set({ maintenanceMode: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); showToast('Maintenance Mode is now OFF'); }
                catch (error) { showToast(`Failed to update: ${error.message}`, 'error'); setIsMaintenanceMode(true); }
            })();
            return;
        }
        setConfirmState({
            title: '⚠️ Enable Maintenance Mode',
            message: 'This will instantly lock ALL non-admin users out of the app. Active sessions will be terminated immediately.',
            confirmLabel: 'Lock App',
            danger: true,
            requireTyped: 'LOCK',
            onConfirm: async () => {
                setIsMaintenanceMode(true);
                try {
                    await db.collection('global').doc('settings').set({ maintenanceMode: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
                    showToast('🛑 Maintenance Mode is now ON — app is locked.', 'warning');
                } catch (error) { showToast(`Failed to update: ${error.message}`, 'error'); setIsMaintenanceMode(false); }
            },
        });
    };

    const handleToggleFlag = async (flagName) => {
        const newFlags = { ...featureFlags, [flagName]: !featureFlags[flagName] };
        setFeatureFlags(newFlags);
        try { await db.collection('global').doc('settings').set({ featureFlags: newFlags, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); }
        catch (error) { showToast(`Failed to update flag: ${error.message}`, 'error'); setFeatureFlags(featureFlags); }
    };

    const handleResolveFeedback = async (id, currentStatus) => {
        try {
            await db.collection('feedback').doc(id).update({ resolved: !currentStatus });
            setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, resolved: !currentStatus } : f));
        } catch (error) { showToast(`Failed to update feedback: ${error.message}`, 'error'); }
    };

    const handleDeleteFeedback = (id) => {
        setConfirmState({
            title: 'Delete Feedback',
            message: 'Permanently delete this feedback message?',
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: async () => {
                try {
                    await db.collection('feedback').doc(id).delete();
                    setFeedbackList(prev => prev.filter(f => f.id !== id));
                } catch (error) { showToast(`Failed to delete feedback: ${error.message}`, 'error'); }
            },
        });
    };

    const handleExportUsersCSV = () => {
        const headers = ['Name,Email,UserID,Role,IsBanned\n'];
        const rows = usersList.map(u => {
            let role = 'User';
            if (u.isSuperAdmin) role = 'SuperAdmin';
            else if (u.assignedRole && roles[u.assignedRole]) role = roles[u.assignedRole].name;
            else if (u.isAdmin) role = 'Admin (Legacy)';
            else if (u.isModerator) role = 'Moderator (Legacy)';
            return `"${u.displayName || 'Unknown'}","${u.email || 'No Email'}","${u.id}","${role}","${!!u.isBanned}"`;
        });
        const csvContent = headers.concat(rows).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pub_ranker_users_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (!isModerator) return <div className="p-8 text-center text-red-500 font-bold text-xl mt-12">🛑 Access Denied. Staff Only.</div>;
    if (loading) return <div className="p-8 text-center animate-pulse dark:text-gray-300 mt-12">Fetching secure metrics...</div>;

    let availableTabs = ['overview', 'moderation', 'feedback'];
    if (isAdmin) availableTabs.push('pubs', 'claims', 'tags', 'users', 'gamification');
    if (isTrueSuperAdmin) availableTabs.push('roles');

    const sortedPubsForDropdown = [...pubsList].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6 animate-fadeIn relative pb-20">
            <ToastContainer toasts={toasts} />
            {confirmState && (
                <ConfirmModal
                    {...confirmState}
                    onClose={() => setConfirmState(null)}
                />
            )}

            {managingGroup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 relative max-h-[90vh] flex flex-col">
                        <button onClick={() => setManagingGroup(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition">✕</button>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-1 pr-10 truncate">{managingGroup.groupName}</h3>
                        <p className="text-sm text-gray-500 mb-6 font-bold uppercase tracking-wider">Member Management</p>
                        <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                            {managingGroup.members?.map(uid => {
                                const u = usersList.find(usr => usr.id === uid) || { id: uid, displayName: 'Unknown User', email: '' };
                                const isOwner = managingGroup.ownerUid === uid;
                                const isManager = managingGroup.managers?.includes(uid);
                                return (
                                    <div key={uid} className="flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 gap-3 transition-colors hover:bg-white dark:hover:bg-gray-700">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                                {u.displayName}
                                                {isOwner ? <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Owner</span>
                                                 : isManager ? <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Manager</span>
                                                 : <span className="bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Member</span>}
                                            </p>
                                            <p className="text-xs text-gray-500">{u.email || 'No email'}</p>
                                        </div>
                                        {!isOwner ? (
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handlePromoteToOwner(managingGroup.id, uid)} className="text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 px-2 py-1.5 rounded font-bold uppercase transition">Make Owner</button>
                                                <button onClick={() => handleToggleManager(managingGroup.id, uid, isManager)} className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 px-2 py-1.5 rounded font-bold uppercase transition">{isManager ? 'Revoke Manager' : 'Make Manager'}</button>
                                                <button onClick={() => handleRemoveMember(managingGroup.id, uid)} className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 px-2 py-1.5 rounded font-bold uppercase transition">Remove</button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">Cannot modify owner</span>
                                        )}
                                    </div>
                                );
                            })}
                            {(!managingGroup.members || managingGroup.members.length === 0) && <p className="text-gray-500 italic text-sm">No members in this group.</p>}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Staff Dashboard</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Access Level: {isTrueSuperAdmin ? '👑 Super Admin' : isAdmin ? '🛡️ Admin' : '🛠️ Moderator'}</p>
                </div>
                <div className="flex flex-wrap bg-gray-200 dark:bg-gray-700 p-1 rounded-lg gap-1">
                    {availableTabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-800 text-brand shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                            {tab === 'moderation' && (reportsList.length > 0 ? '🚨 ' : '🛡️ ')}
                            {tab === 'claims' && '🏢 '}
                            {tab === 'gamification' && '🕹️ '}
                            {tab === 'tags' && '🏷️ '}
                            {tab === 'feedback' && feedbackList.filter(f => !f.resolved).length > 0 && '🔴 '}
                            {tab}
                            {tab === 'claims' && venueClaimsList.length > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{venueClaimsList.length}</span>
                            )}
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
                        {isMaintenanceMode ? '🛑 ACTIVE: App Locked' : 'Enable Lockout'}
                    </button>
                </div>
            )}

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                    {isAdmin && (
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
                                            <div><span className="font-bold text-gray-800 dark:text-white mr-2">{crit.name}</span><span className="text-[10px] uppercase font-bold tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{crit.type}</span></div>
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
                                <button onClick={handleCleanupOrphanedGroups} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-1.5">🧹 Delete Orphaned Groups</button>
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

            {/* CLAIMS TAB */}
            {activeTab === 'claims' && isAdmin && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">🏢 Venue Verification Queue</h3>
                            <p className="text-sm text-gray-400 mt-1">Pub managers requesting ownership of their venue profile.</p>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] p-4">
                            {venueClaimsList.length === 0 ? (
                                <div className="text-center py-12"><span className="text-5xl block mb-3 opacity-50">📬</span><p className="text-gray-500 dark:text-gray-400 font-medium">No pending venue claims. You're all caught up!</p></div>
                            ) : (
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                        <tr><th className="p-4 rounded-tl-lg">Venue Requested</th><th className="p-4">Contact Email Provided</th><th className="p-4">Date</th><th className="p-4 text-right rounded-tr-lg">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {venueClaimsList.map(claim => (
                                            <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                <td className="p-4 font-bold text-gray-900 dark:text-white text-lg">{claim.pubName}</td>
                                                <td className="p-4"><a href={`mailto:${claim.contactEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{claim.contactEmail}</a><p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">User ID: {claim.requestedByUid.substring(0, 8)}...</p></td>
                                                <td className="p-4 text-gray-500">{claim.requestedAt && typeof claim.requestedAt.toDate === 'function' ? new Date(claim.requestedAt.toDate()).toLocaleDateString() : 'Recent'}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleRejectClaim(claim.id)} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg font-bold transition">Reject</button>
                                                        <button onClick={() => handleApproveClaim(claim)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm transition">Verify & Hand Over</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAGS TAB */}
            {activeTab === 'tags' && isAdmin && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">🏷️ Global Pub Tags</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage the master list of tags users can assign to pubs. Upload icons for them too.</p>
                        <form onSubmit={handleSaveTag} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 mb-8">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tag Name</label>
                                    <input type="text" value={editingTag ? editingTag.name : newTagName} onChange={e => editingTag ? setEditingTag({ ...editingTag, name: e.target.value }) : setNewTagName(e.target.value)} placeholder="e.g. Beer Garden" className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand outline-none" required />
                                </div>
                                <div className="w-full md:w-auto">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tag Icon</label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex flex-col items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-brand cursor-pointer bg-white dark:bg-gray-800 transition overflow-hidden">
                                            {isUploadingTagIcon ? <span className="text-brand animate-spin text-xl">🌀</span>
                                             : (editingTag ? editingTag.iconUrl : newTagIcon) ? <img src={editingTag ? editingTag.iconUrl : newTagIcon} alt="Icon" className="w-full h-full object-cover" />
                                             : <span className="text-xl">📸</span>}
                                            <input type="file" accept="image/*" onChange={handleTagImageUpload} className="hidden" disabled={isUploadingTagIcon} />
                                        </label>
                                        {(editingTag ? editingTag.iconUrl : newTagIcon) && (
                                            <button type="button" onClick={() => editingTag ? setEditingTag({ ...editingTag, iconUrl: '' }) : setNewTagIcon('')} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full md:w-auto flex gap-2">
                                    <button type="submit" disabled={isSavingTag || isUploadingTagIcon} className="w-full md:w-auto px-6 py-3 bg-brand text-white font-bold rounded-lg hover:opacity-80 transition disabled:opacity-50">{isSavingTag ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}</button>
                                    {editingTag && <button type="button" onClick={() => setEditingTag(null)} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition">Cancel</button>}
                                </div>
                            </div>
                        </form>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {tagsList.length === 0 ? <p className="text-gray-500 italic col-span-full text-center py-6">No global tags created yet.</p>
                             : tagsList.map(tag => (
                                <div key={tag.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm group hover:border-brand transition">
                                    <div className="flex items-center gap-3">
                                        {tag.iconUrl ? <img src={tag.iconUrl} alt={tag.name} className="w-8 h-8 rounded-full object-cover shadow-sm border border-gray-100 dark:border-gray-700" /> : <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs">🏷️</div>}
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate max-w-[100px]" title={tag.name}>{tag.name}</span>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingTag(tag)} className="text-blue-500 hover:text-blue-700 text-xs bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded">✏️</button>
                                        <button onClick={() => handleDeleteTag(tag.id)} className="text-red-500 hover:text-red-700 text-xs bg-red-50 dark:bg-red-900/30 p-1.5 rounded">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ROLES TAB */}
            {activeTab === 'roles' && isTrueSuperAdmin && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Create Custom Roles</h3>
                        <p className="text-sm text-gray-500 mb-6">Build specific permission groups (e.g. "Half Admin") and assign them to users in the User Directory.</p>
                        <form onSubmit={handleSaveNewRole} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 mb-8">
                            <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role Name (e.g. Content Mod)" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-800 dark:text-white" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {Object.keys(defaultPermissions).map(perm => (
                                    <label key={perm} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-brand transition">
                                        <input type="checkbox" checked={editingRolePermissions[perm]} onChange={e => setEditingRolePermissions({ ...editingRolePermissions, [perm]: e.target.checked })} className="w-5 h-5 accent-brand" />
                                        <span className="font-semibold text-gray-700 dark:text-gray-200">{perm}</span>
                                    </label>
                                ))}
                            </div>
                            <button type="submit" className="w-full py-2 bg-brand text-white font-bold rounded-lg hover:opacity-80">Save New Role</button>
                        </form>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4">Existing Roles</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(roles).map(([id, role]) => (
                                <div key={id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm relative">
                                    <button onClick={() => handleDeleteRole(id)} className="absolute top-3 right-3 text-red-500 hover:text-red-700 font-bold">✕</button>
                                    <h5 className="font-black text-lg text-brand mb-2">{role.name}</h5>
                                    <ul className="text-xs space-y-1">
                                        {Object.entries(role.perms).map(([p, val]) => (
                                            <li key={p} className={val ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-400 line-through'}>{val ? '✔️' : '❌'} {p}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && isAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-fadeIn">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">User Directory</h3>
                        <button onClick={handleExportUsersCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-1.5">📊 Export to CSV</button>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3 text-center">Role</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                {usersList.map(u => (
                                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${u.isBanned ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''}`}>
                                        <td className="p-3 font-bold flex items-center gap-2">{u.avatarUrl && <img src={u.avatarUrl} className="w-6 h-6 rounded-full" alt="avatar" />}{u.displayName || 'Unknown'}</td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                                        <td className="p-3 text-center">
                                            {u.isSuperAdmin ? <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-[10px] uppercase px-2 py-1 rounded font-black tracking-wider">SuperAdmin</span>
                                             : u.assignedRole && roles[u.assignedRole] ? <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] uppercase px-2 py-1 rounded font-black tracking-wider">{roles[u.assignedRole].name}</span>
                                             : u.isAdmin ? <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-[10px] uppercase px-2 py-1 rounded font-black tracking-wider">Admin (Legacy)</span>
                                             : u.isModerator ? <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-[10px] uppercase px-2 py-1 rounded font-black tracking-wider">Mod (Legacy)</span>
                                             : <span className="text-gray-400 text-xs font-semibold">User</span>}
                                        </td>
                                        <td className="p-3 text-center">{u.isBanned ? <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">BANNED</span> : <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">ACTIVE</span>}</td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {isTrueSuperAdmin && !u.isSuperAdmin && (
                                                    <select value={u.assignedRole || 'none'} onChange={(e) => handleAssignUserRole(u.id, e.target.value)} className="px-2 py-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-xs font-bold mr-2 cursor-pointer outline-none">
                                                        <option value="none">Standard User</option>
                                                        {Object.entries(roles).map(([id, role]) => <option key={id} value={id}>{role.name}</option>)}
                                                    </select>
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

            {/* GAMIFICATION TAB */}
            {activeTab === 'gamification' && isAdmin && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">🕹️ Gamification Engine</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Alter how leaderboards are scored and create custom unlockable awards.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Point System</h4>
                                {[['pointsPerPub','Points per Pub Rated'],['pointsPerReview','Points per Written Review'],['pointsPerAdd','Points per Pub Added'],['pointsPerCrawl','Points per Pub Crawl Created']].map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</span>
                                        <input type="number" value={gamification[key]} onChange={e => setGamification({ ...gamification, [key]: e.target.value })} className="w-20 px-3 py-1 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white text-center font-bold" />
                                    </div>
                                ))}
                                <button onClick={handleSavePointRules} disabled={isSavingGamification} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">Save Point Rules</button>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Custom Awards</h4>
                                <form onSubmit={handleAddBadge} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-4 space-y-3">
                                    <div className="flex gap-2">
                                        <input type="text" value={newBadge.emoji} onChange={e => setNewBadge({ ...newBadge, emoji: e.target.value })} className="w-12 text-center px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white" placeholder="🏆" maxLength="2" required />
                                        <input type="text" value={newBadge.title} onChange={e => setNewBadge({ ...newBadge, title: e.target.value })} className="flex-1 px-3 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white text-sm" placeholder="Badge Title" required />
                                    </div>
                                    <input type="text" value={newBadge.desc} onChange={e => setNewBadge({ ...newBadge, desc: e.target.value })} className="w-full px-3 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white text-xs" placeholder="Short description..." required />
                                    <div className="flex gap-2 items-center">
                                        <span className="text-xs text-gray-500 font-bold">Unlocks when:</span>
                                        <select value={newBadge.metric} onChange={e => setNewBadge({ ...newBadge, metric: e.target.value })} className="flex-1 text-xs px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white">
                                            <option value="rated">Pubs Rated</option>
                                            <option value="reviews">Reviews Written</option>
                                            <option value="added">Pubs Added</option>
                                            <option value="tens">Perfect 10s Given</option>
                                            <option value="crawls">Crawls Created</option>
                                        </select>
                                        <span className="text-xs text-gray-500 font-bold">&gt;=</span>
                                        <input type="number" value={newBadge.threshold} onChange={e => setNewBadge({ ...newBadge, threshold: e.target.value })} className="w-16 px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white text-center text-xs font-bold" min="1" required />
                                    </div>
                                    <button type="submit" className="w-full bg-brand text-white font-bold py-1.5 rounded text-sm hover:opacity-80">Add Award</button>
                                </form>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {(!gamification.badges || gamification.badges.length === 0) ? <p className="text-xs text-gray-500 italic text-center">No custom awards created yet.</p>
                                     : gamification.badges.map((b, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{b.emoji}</span>
                                                <div><p className="text-xs font-bold text-gray-800 dark:text-white leading-none">{b.title}</p><p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{b.metric} &gt;= {b.threshold}</p></div>
                                            </div>
                                            <button onClick={() => handleDeleteBadge(idx)} className="text-red-500 hover:text-red-700 text-lg">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PUBS TAB */}
            {activeTab === 'pubs' && isAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Global Pub Directory</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full font-bold">{pubsList.filter(p => p.isLocked).length} Verified Pubs</span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0 z-10">
                                <tr><th className="p-3">Status</th><th className="p-3">Photo</th><th className="p-3">Pub Name</th><th className="p-3">Location</th><th className="p-3 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                {pubsList.map(pub => {
                                    const managerCount = Array.isArray(pub.claimedBy) ? pub.claimedBy.length : (pub.claimedBy ? 1 : 0);
                                    return (
                                        <tr key={pub.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${pub.isLocked ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="p-3 text-center">{pub.isLocked ? <span className="text-xl" title="Verified & Locked">🔒</span> : <span className="text-xl opacity-20" title="Unlocked">🔓</span>}</td>
                                            <td className="p-3 w-16">{pub.photoURL ? <img src={pub.photoURL} alt="pub" className="w-10 h-10 rounded object-cover shadow-sm" /> : <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center text-xl">🍺</div>}</td>
                                            <td className="p-3 font-bold">{pub.name}{managerCount > 0 && <span className="block text-[9px] text-brand uppercase tracking-wider">{managerCount} Manager{managerCount > 1 ? 's' : ''}</span>}</td>
                                            <td className="p-3 text-gray-500 dark:text-gray-400">{pub.location || 'Unknown'}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleTogglePubLock(pub)} className={`font-bold text-xs px-3 py-1.5 rounded transition shadow-sm ${pub.isLocked ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' : 'bg-brand text-white hover:opacity-80'}`}>{pub.isLocked ? 'Unverify' : 'Verify'}</button>
                                                    <button onClick={() => handleDeletePub(pub.id)} className="text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 font-bold text-xs px-3 py-1.5 rounded transition shadow-sm">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODERATION TAB */}
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
                            {reportsList.length === 0 ? <div className="p-8 text-center text-gray-500 font-medium">No pending reports! The community is safe.</div> : (
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                                        <tr><th className="p-4 w-24">Type</th><th className="p-4">Reported Content</th><th className="p-4">Date</th><th className="p-4 text-right">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                        {reportsList.map(report => (
                                            <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${report.type === 'pub' ? 'bg-orange-100 text-orange-800' : report.type === 'comment' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{report.type}</span></td>
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
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">Review groups that have opted into the public directory.</p>
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
                                            <td className="p-4 text-right"><button onClick={() => handleRevokePublicStatus(g.id)} className="text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg font-bold text-xs transition">Revoke Public Status</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-blue-200 dark:border-blue-900/50 overflow-hidden">
                        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30">
                            <h3 className="text-xl font-black text-blue-800 dark:text-blue-300 flex items-center gap-2">📸 Photo Moderation Queue</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Scan uploaded pub photos for guideline violations. Most recent uploads shown first.</p>
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

            {/* --- FEEDBACK TAB --- */}
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