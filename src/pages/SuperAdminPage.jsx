import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// ---------------------------------------------------------------------------
// Navigation groups & icons configurations
// ---------------------------------------------------------------------------
const SUPER_NAV_GROUPS = [
    {
        label: 'System Management',
        items: [
            { id: 'overview', icon: 'dashboard', label: 'Overview Dashboard' },
            { id: 'users', icon: 'users', label: 'User Directory', adminOnly: true },
            { id: 'roles', icon: 'roles', label: 'Custom Roles', superAdminOnly: true },
            { id: 'gamification', icon: 'gamification', label: 'Gamification Engine', adminOnly: true },
        ],
    },
    {
        label: 'Global Directory',
        items: [
            { id: 'pubs', icon: 'pubs', label: 'Master Pubs', adminOnly: true },
            { id: 'claims', icon: 'claims', label: 'Venue Claims', adminOnly: true, showBadge: 'claimsCount' },
            { id: 'tags', icon: 'tags', label: 'Global Tags', adminOnly: true },
        ],
    },
    {
        label: 'Community Operations',
        items: [
            { id: 'moderation', icon: 'moderation', label: 'Moderation Queue', showBadge: 'reportsCount' },
            { id: 'feedback', icon: 'feedback', label: 'Feedback Inbox', showBadge: 'feedbackCount' },
        ],
    },
];

function SuperAdminNavIcon({ type }) {
    switch (type) {
        case 'dashboard':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
            );
        case 'users':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case 'roles':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 11l2 2 4-4" />
                </svg>
            );
        case 'gamification':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
                    <line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" />
                    <rect x="2" y="6" width="20" height="12" rx="3" />
                </svg>
            );
        case 'pubs':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1.5" x2="6" y2="4.5" />
                    <line x1="10" y1="1.5" x2="10" y2="4.5" />
                    <line x1="14" y1="1.5" x2="14" y2="4.5" />
                </svg>
            );
        case 'claims':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-teal-505" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M3 21h18M3 7v14M21 7v14M12 3v4M8 11h2M8 15h2M14 11h2M14 15h2" />
                </svg>
            );
        case 'tags':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
            );
        case 'moderation':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            );
        case 'feedback':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            );
        default:
            return <span>⚙️</span>;
    }
}

export default function SuperAdminPage({ db, userProfile, user }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const activeLabel = useMemo(() => {
        for (const group of SUPER_NAV_GROUPS) {
            const item = group.items.find(i => i.id === activeTab);
            if (item) return item.label;
        }
        return activeTab;
    }, [activeTab]);

    if (!isModerator) return <div className="p-8 text-center text-red-500 font-bold text-xl mt-12">🛑 Access Denied. Staff Only.</div>;
    if (loading) return <div className="p-8 text-center animate-pulse dark:text-gray-300 mt-12">Fetching secure metrics...</div>;

    const sortedPubsForDropdown = [...pubsList].sort((a, b) => a.name.localeCompare(b.name));


    const SidebarContent = () => (
        <nav className="p-4 space-y-5">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200/60 dark:border-gray-700 select-none">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Access Role</span>
                <p className="text-xs font-bold text-brand truncate leading-tight mt-0.5">
                    {isTrueSuperAdmin ? '👑 Super Admin' : isAdmin ? '🛡️ Admin' : '🛠️ Moderator'}
                </p>
            </div>

            {SUPER_NAV_GROUPS.map(group => {
                const visibleItems = group.items.filter(item => {
                    if (item.superAdminOnly) return isTrueSuperAdmin;
                    if (item.adminOnly) return isAdmin;
                    return true;
                });
                if (visibleItems.length === 0) return null;

                return (
                    <div key={group.label} className="space-y-1">
                        <p className="px-3 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-550 select-none">
                            {group.label}
                        </p>
                        <div className="flex flex-col gap-0.5">
                            {visibleItems.map(item => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setSidebarOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-brand/10 dark:bg-brand-highlight/20 text-brand'
                                                : 'text-gray-600 dark:text-gray-405 hover:bg-gray-50 dark:hover:bg-gray-750 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <SuperAdminNavIcon type={item.icon} />
                                        <span className="truncate">{item.label}</span>
                                        {item.showBadge === 'claimsCount' && venueClaimsList.length > 0 && (
                                            <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">{venueClaimsList.length}</span>
                                        )}
                                        {item.showBadge === 'reportsCount' && reportsList.length > 0 && (
                                            <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">{reportsList.length}</span>
                                        )}
                                        {item.showBadge === 'feedbackCount' && feedbackList.filter(f => !f.resolved).length > 0 && (
                                            <span className="ml-auto bg-brand text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                {feedbackList.filter(f => !f.resolved).length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </nav>
    );

    return (
        <div className="w-full">
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
                        <button onClick={() => setManagingGroup(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition cursor-pointer">✕</button>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-1 pr-10 truncate">{managingGroup.groupName}</h3>
                        <p className="text-sm text-gray-500 mb-6 font-bold uppercase tracking-wider">Member Management</p>
                        <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                            {managingGroup.members?.map(uid => {
                                const u = usersList.find(usr => usr.id === uid) || { id: uid, displayName: 'Unknown User', email: '' };
                                const isOwner = managingGroup.ownerUid === uid;
                                const isManager = managingGroup.managers?.includes(uid);
                                return (
                                    <div key={uid} className="flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600 gap-3 transition-colors hover:bg-white dark:hover:bg-gray-700">
                                        <div>
                                            <p className="font-bold text-gray-805 dark:text-white flex items-center gap-2">
                                                {u.displayName}
                                                {isOwner ? <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Owner</span>
                                                 : isManager ? <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Manager</span>
                                                 : <span className="bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Member</span>}
                                            </p>
                                            <p className="text-xs text-gray-500">{u.email || 'No email'}</p>
                                        </div>
                                        {!isOwner ? (
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handlePromoteToOwner(managingGroup.id, uid)} className="text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 px-2.5 py-1.5 rounded-xl font-bold uppercase transition cursor-pointer">Make Owner</button>
                                                <button onClick={() => handleToggleManager(managingGroup.id, uid, isManager)} className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-xl font-bold uppercase transition cursor-pointer">{isManager ? 'Revoke Manager' : 'Make Manager'}</button>
                                                <button onClick={() => handleRemoveMember(managingGroup.id, uid)} className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 px-2.5 py-1.5 rounded-xl font-bold uppercase transition cursor-pointer">Remove</button>
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

            {/* Page Header */}
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-850 dark:text-white leading-tight">Global Management</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Global configuration, community safety queues, feedback, and user database control.</p>
                </div>
            </div>

            {/* Mobile: top bar with hamburger */}
            <div className="flex items-center gap-3 mb-4 md:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-2xl shadow-sm">
                <button
                    onClick={() => setSidebarOpen(o => !o)}
                    className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-750 text-gray-650 dark:text-gray-300 transition cursor-pointer border border-gray-200 dark:border-gray-655"
                    aria-label="Toggle admin menu"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="3" y1="6"  x2="21" y2="6"  />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <span className="text-xs font-bold text-gray-750 dark:text-gray-200 uppercase tracking-wider">{activeLabel}</span>
            </div>

            {/* Mobile: slide-down sidebar */}
            {sidebarOpen && (
                <div className="md:hidden mb-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-fadeIn">
                    <SidebarContent />
                </div>
            )}

            {/* Main Shell Grid Layout */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                
                {/* Desktop Sidebar */}
                <aside className="hidden md:block w-56 shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm sticky top-20 overflow-hidden">
                    <SidebarContent />
                </aside>

                {/* Sub-view Content Container */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 min-h-[520px] w-full">
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fadeIn">
                            
                            {/* Maintenance Warning lockout alert banner */}
                            {isTrueSuperAdmin && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 bg-red-50/10">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Emergency Lockdown Mode</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Instantly lock all non-admin users out of the active app sessions.</p>
                                    </div>
                                    <button
                                        onClick={handleToggleMaintenance}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer ${
                                            isMaintenanceMode
                                                ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]'
                                                : 'bg-gray-400 hover:bg-gray-500'
                                        }`}
                                    >
                                        {isMaintenanceMode ? '🛑 Active: Lock Enabled' : 'Enable Maintenance Lock'}
                                    </button>
                                </div>
                            )}

                            {/* Analytics KPI Widgets Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                {/* Total Users */}
                                <div className="bg-white dark:bg-gray-805 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-750 shadow-sm flex flex-col justify-between hover:border-blue-500/20 transition-colors">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Total Users</span>
                                        <p className="text-3xl font-black text-gray-850 dark:text-white mt-1 tabular-nums">{stats.users}</p>
                                    </div>
                                    {isAdmin && <button onClick={() => setActiveTab('users')} className="text-xs font-bold text-brand hover:underline mt-2 text-left cursor-pointer">Manage Users →</button>}
                                </div>
                                {/* Total Groups */}
                                <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-750 shadow-sm flex flex-col justify-between hover:border-purple-500/20 transition-colors">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Active Groups</span>
                                        <p className="text-3xl font-black text-gray-850 dark:text-white mt-1 tabular-nums">{stats.groups}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-550 mt-2 select-none">Database Synced</span>
                                </div>
                                {/* Total Pubs */}
                                <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-750 shadow-sm flex flex-col justify-between hover:border-rose-500/20 transition-colors">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider">Master Pubs</span>
                                        <p className="text-3xl font-black text-gray-850 dark:text-white mt-1 tabular-nums">{stats.pubs}</p>
                                    </div>
                                    {isAdmin && <button onClick={() => setActiveTab('pubs')} className="text-xs font-bold text-brand hover:underline mt-2 text-left cursor-pointer">Pub Directory →</button>}
                                </div>
                                {/* Claims Queue */}
                                <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-750 shadow-sm flex flex-col justify-between hover:border-teal-505/20 transition-colors">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider">Claims Pending</span>
                                        <p className={`text-3xl font-black mt-1 tabular-nums ${venueClaimsList.length > 0 ? 'text-teal-650 dark:text-teal-400' : 'text-gray-850 dark:text-white'}`}>{venueClaimsList.length}</p>
                                    </div>
                                    {isAdmin ? (
                                        <button onClick={() => setActiveTab('claims')} className="text-xs font-bold text-brand hover:underline mt-2 text-left cursor-pointer">Review Queue →</button>
                                    ) : (
                                        <span className="text-xs text-gray-400 dark:text-gray-550 mt-2">Staff Only</span>
                                    )}
                                </div>
                                {/* Reports Queue */}
                                <div className="bg-white dark:bg-gray-855 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-750 shadow-sm flex flex-col justify-between hover:border-red-500/20 transition-colors">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider">Open Reports</span>
                                        <p className={`text-3xl font-black mt-1 tabular-nums ${reportsList.length > 0 ? 'text-red-650 dark:text-red-400 animate-pulse' : 'text-gray-850 dark:text-white'}`}>{reportsList.length}</p>
                                    </div>
                                    <button onClick={() => setActiveTab('moderation')} className="text-xs font-bold text-brand hover:underline mt-2 text-left cursor-pointer">Reports Queue →</button>
                                </div>
                                {/* Feedback Inbox */}
                                <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-750 shadow-sm flex flex-col justify-between hover:border-cyan-500/20 transition-colors">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider">Inbox Message</span>
                                        <p className={`text-3xl font-black mt-1 tabular-nums ${feedbackList.filter(f => !f.resolved).length > 0 ? 'text-cyan-650 dark:text-cyan-400' : 'text-gray-850 dark:text-white'}`}>{feedbackList.filter(f => !f.resolved).length}</p>
                                    </div>
                                    <button onClick={() => setActiveTab('feedback')} className="text-xs font-bold text-brand hover:underline mt-2 text-left cursor-pointer">Open Inbox →</button>
                                </div>
                            </div>

                            {/* Middle section configurations grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* System Configuration & Flags */}
                                {isAdmin && (
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white">App Configuration</h4>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Toggle Global Feature Flags</p>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-750/30 rounded-xl border border-gray-150 dark:border-gray-750">
                                                <p className="text-xs font-bold text-gray-805 dark:text-gray-200">Enable Comments</p>
                                                <input type="checkbox" checked={featureFlags.enableComments || false} onChange={() => handleToggleFlag('enableComments')} className="w-4 h-4 cursor-pointer accent-brand" />
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-750/30 rounded-xl border border-gray-150 dark:border-gray-750">
                                                <p className="text-xs font-bold text-gray-805 dark:text-gray-200">Enable Reactions</p>
                                                <input type="checkbox" checked={featureFlags.enableReactions || false} onChange={() => handleToggleFlag('enableReactions')} className="w-4 h-4 cursor-pointer accent-brand" />
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-red-50/40 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40">
                                                <div>
                                                    <p className="text-xs font-bold text-red-800 dark:text-red-300">Disable Google API</p>
                                                    <p className="text-[9px] text-red-650 dark:text-red-400 leading-tight">Kill-switch for API billing</p>
                                                </div>
                                                <input type="checkbox" checked={featureFlags.disableGoogleAPI || false} onChange={() => handleToggleFlag('disableGoogleAPI')} className="w-4 h-4 cursor-pointer accent-red-600" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Global Announcement */}
                                {isAdmin && (
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Announcement Broadcast</h4>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Global User Alert Banner</p>
                                        </div>
                                        <textarea
                                            value={announcement}
                                            onChange={(e) => setAnnouncement(e.target.value)}
                                            placeholder="Type an announcement to display to all users..."
                                            className="flex-1 w-full p-3 text-xs border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-750 dark:text-white resize-none min-h-[90px] outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handlePublishAnnouncement}
                                                disabled={isPublishing || !announcement.trim()}
                                                className="flex-1 py-2 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 disabled:opacity-50 transition cursor-pointer"
                                            >
                                                Broadcast Alert
                                            </button>
                                            <button
                                                onClick={handleClearAnnouncement}
                                                disabled={isPublishing || !announcement}
                                                className="px-3.5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl disabled:opacity-50 transition cursor-pointer"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Default Criteria Configuration */}
                                {isAdmin && (
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Default Group Criteria</h4>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Applied to newly created groups</p>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto max-h-[120px] space-y-1.5 pr-1 my-1">
                                            {defaultCriteria.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic">No defaults set.</p>
                                            ) : (
                                                defaultCriteria.map((crit, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 p-2 rounded-lg border border-gray-200/50 dark:border-gray-700">
                                                        <div>
                                                            <span className="font-bold text-xs text-gray-850 dark:text-white mr-2">{crit.name}</span>
                                                            <span className="text-[9px] uppercase font-bold tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-805 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                                                {crit.type}
                                                            </span>
                                                        </div>
                                                        <button onClick={() => handleDeleteDefaultCriteria(idx)} className="text-red-500 hover:text-red-750 font-bold text-[10px] uppercase tracking-wider cursor-pointer">
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <form onSubmit={handleAddDefaultCriteria} className="flex gap-1.5 mt-1">
                                            <input
                                                type="text"
                                                value={newDefCritName}
                                                onChange={e => setNewDefCritName(e.target.value)}
                                                placeholder="e.g. Price"
                                                className="flex-1 px-3 py-2 text-xs border dark:border-gray-600 rounded-xl bg-gray-55 dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                                required
                                            />
                                            <select
                                                value={newDefCritType}
                                                onChange={e => setNewDefCritType(e.target.value)}
                                                className="px-2.5 py-2 text-xs border dark:border-gray-600 rounded-xl bg-gray-55 dark:bg-gray-755 dark:text-white outline-none cursor-pointer"
                                            >
                                                <option value="scale">Scale</option>
                                                <option value="price">Price</option>
                                                <option value="yes-no">Y/N</option>
                                                <option value="text">Review</option>
                                            </select>
                                            <button type="submit" className="bg-brand text-white px-3 py-2 text-xs rounded-xl font-bold hover:opacity-85 transition cursor-pointer">
                                                Add
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* Active Groups System Database Table */}
                            {isAdmin && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20 gap-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Active Groups System Database</h4>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Global Group List</p>
                                        </div>
                                        <button
                                            onClick={handleCleanupOrphanedGroups}
                                            className="bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                                        >
                                            🧹 Deep Clean Orphaned Groups
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto max-h-[320px] p-2">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-gray-50 dark:bg-gray-750 text-gray-555 dark:text-gray-400 sticky top-0 font-bold border-b border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <th className="p-4">Group Name</th>
                                                    <th className="p-4 text-center">Members</th>
                                                    <th className="p-4">Owner UID</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-150 dark:divide-gray-750 text-gray-750 dark:text-gray-200">
                                                {groupsList.map(g => (
                                                    <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/30 transition-colors">
                                                        <td className="p-4 font-bold">{g.groupName}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`py-1 px-2.5 rounded-full font-semibold text-[10px] ${g.members?.length === 0 ? 'bg-red-100 text-red-800' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-805 dark:text-blue-300'}`}>
                                                                {g.members?.length || 0}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 font-mono text-[10px] text-gray-400 truncate max-w-[130px]">{g.ownerUid}</td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                {(!g.members || !g.members.includes(user?.uid)) && (
                                                                    <button onClick={() => handleJoinGroup(g.id, g.groupName)} className="text-[10px] bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 hover:bg-green-100/60 dark:hover:bg-green-900/40 px-2.5 py-1.5 rounded-xl font-bold uppercase transition cursor-pointer">
                                                                        Join
                                                                    </button>
                                                                )}
                                                                <button onClick={() => setManagingGroup(g)} className="text-[10px] bg-brand/10 dark:bg-brand-highlight/20 text-brand hover:bg-brand/20 px-2.5 py-1.5 rounded-xl font-bold uppercase transition cursor-pointer">
                                                                    Manage Members
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
                        </div>
                    )}

                    {/* CLAIMS TAB */}
                    {activeTab === 'claims' && isAdmin && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">Venue Verification Queue</h4>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Managers requesting ownership of venue profiles</p>
                                </div>
                                <div className="overflow-x-auto p-2">
                                    {venueClaimsList.length === 0 ? (
                                        <div className="text-center py-16">
                                            <span className="text-4xl block mb-2 opacity-50">📬</span>
                                            <p className="text-gray-550 dark:text-gray-400 text-sm font-bold">No pending claims. You're all caught up!</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-gray-50 dark:bg-gray-755 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <th className="p-4 rounded-tl-xl">Venue Requested</th>
                                                    <th className="p-4">Contact Details</th>
                                                    <th className="p-4">Requested At</th>
                                                    <th className="p-4 text-right rounded-tr-xl">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-150 dark:divide-gray-750 text-gray-755 dark:text-gray-200">
                                                {venueClaimsList.map(claim => (
                                                    <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/30 transition-colors">
                                                        <td className="p-4">
                                                            <p className="font-bold text-sm text-gray-855 dark:text-white">{claim.pubName}</p>
                                                            <p className="text-[9px] text-gray-400 mt-0.5 font-mono select-all">Pub ID: {claim.pubId}</p>
                                                        </td>
                                                        <td className="p-4">
                                                            <a href={`mailto:${claim.contactEmail}`} className="text-brand hover:underline font-semibold text-xs block">{claim.contactEmail}</a>
                                                            <span className="text-[9px] text-gray-400 mt-1 block uppercase tracking-wider">Uid: {claim.requestedByUid.substring(0, 8)}...</span>
                                                        </td>
                                                        <td className="p-4 text-gray-505">
                                                            {claim.requestedAt && typeof claim.requestedAt.toDate === 'function'
                                                                ? new Date(claim.requestedAt.toDate()).toLocaleDateString('en-GB')
                                                                : 'Recent'}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                <button onClick={() => handleRejectClaim(claim.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-955/20 dark:hover:bg-red-900/40 rounded-xl font-bold text-[10px] uppercase transition cursor-pointer">
                                                                    Reject
                                                                </button>
                                                                <button onClick={() => handleApproveClaim(claim)} className="px-3.5 py-1.5 bg-green-650 hover:bg-green-700 text-white rounded-xl font-bold text-[10px] uppercase transition shadow-sm cursor-pointer">
                                                                    Verify & Hand Over
                                                                </button>
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
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">Global Pub Tags</h4>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Master directory of tags users can assign to venues</p>
                                </div>
                                
                                <form onSubmit={handleSaveTag} className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-750 my-5">
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Tag Name</label>
                                            <input
                                                type="text"
                                                value={editingTag ? editingTag.name : newTagName}
                                                onChange={e => editingTag ? setEditingTag({ ...editingTag, name: e.target.value }) : setNewTagName(e.target.value)}
                                                placeholder="e.g. Beer Garden"
                                                className="w-full px-3 py-2 text-xs border dark:border-gray-600 rounded-xl bg-white dark:bg-gray-850 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                                required
                                            />
                                        </div>
                                        <div className="w-full md:w-auto">
                                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider mb-1.5">Tag Icon Image</label>
                                            <div className="flex items-center gap-3">
                                                <label className="flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-dashed border-gray-300 dark:border-gray-650 hover:border-brand cursor-pointer bg-white dark:bg-gray-800 transition overflow-hidden">
                                                    {isUploadingTagIcon ? (
                                                        <span className="text-brand animate-spin text-xs">🌀</span>
                                                    ) : (editingTag ? editingTag.iconUrl : newTagIcon) ? (
                                                        <img src={editingTag ? editingTag.iconUrl : newTagIcon} alt="Icon" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs">📸</span>
                                                    )}
                                                    <input type="file" accept="image/*" onChange={handleTagImageUpload} className="hidden" disabled={isUploadingTagIcon} />
                                                </label>
                                                {(editingTag ? editingTag.iconUrl : newTagIcon) && (
                                                    <button type="button" onClick={() => editingTag ? setEditingTag({ ...editingTag, iconUrl: '' }) : setNewTagIcon('')} className="text-red-500 text-[10px] font-bold uppercase tracking-wider hover:underline cursor-pointer">
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full md:w-auto flex gap-1.5">
                                            <button
                                                type="submit"
                                                disabled={isSavingTag || isUploadingTagIcon}
                                                className="w-full md:w-auto px-4 py-2 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 transition disabled:opacity-50 cursor-pointer"
                                            >
                                                {isSavingTag ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
                                            </button>
                                            {editingTag && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingTag(null)}
                                                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-250 dark:hover:bg-gray-650 transition cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </form>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                                    {tagsList.length === 0 ? (
                                        <p className="text-gray-500 italic col-span-full text-center py-6 text-xs">No global tags created yet.</p>
                                    ) : (
                                        tagsList.map(tag => (
                                            <div key={tag.id} className="flex items-center justify-between p-3 border border-gray-250 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-850 shadow-sm group hover:border-brand transition">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {tag.iconUrl ? (
                                                        <img src={tag.iconUrl} alt={tag.name} className="w-7 h-7 rounded-full object-cover shadow-sm border border-gray-100 dark:border-gray-700 flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-750 flex items-center justify-center text-xs flex-shrink-0">🏷️</div>
                                                    )}
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate" title={tag.name}>
                                                        {tag.name}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingTag(tag)} className="text-blue-505 hover:text-blue-700 text-[10px] bg-blue-50 dark:bg-blue-900/30 p-1 rounded cursor-pointer" title="Edit">✏️</button>
                                                    <button onClick={() => handleDeleteTag(tag.id)} className="text-red-500 hover:text-red-700 text-[10px] bg-red-50 dark:bg-red-900/30 p-1 rounded cursor-pointer" title="Delete">✕</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ROLES TAB */}
                    {activeTab === 'roles' && isTrueSuperAdmin && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">Create Custom Roles</h4>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Define permission levels for staff accounts</p>
                                </div>
                                
                                <form onSubmit={handleSaveNewRole} className="bg-gray-50 dark:bg-gray-707 p-4 rounded-xl border border-gray-200 dark:border-gray-755 my-5">
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Role Name</label>
                                        <input
                                            type="text"
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            placeholder="e.g. Content Moderator"
                                            className="w-full px-3 py-2 text-xs border dark:border-gray-600 rounded-xl bg-white dark:bg-gray-850 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                            required
                                        />
                                    </div>
                                    
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Granted Permissions</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                        {Object.keys(defaultPermissions).map(perm => (
                                            <label key={perm} className="flex items-center gap-2.5 p-3 bg-white dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-brand/40 transition select-none">
                                                <input type="checkbox" checked={editingRolePermissions[perm]} onChange={e => setEditingRolePermissions({ ...editingRolePermissions, [perm]: e.target.checked })} className="w-4 h-4 accent-brand cursor-pointer" />
                                                <span className="font-semibold text-xs text-gray-700 dark:text-gray-200 capitalize">
                                                    {perm.replace('can', 'Can ')}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    
                                    <button type="submit" className="w-full py-2.5 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 transition cursor-pointer">
                                        Save Custom Role
                                    </button>
                                </form>
                                
                                <h4 className="font-bold text-xs text-gray-800 dark:text-white mb-3">Active Roles Database</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(roles).map(([id, role]) => (
                                        <div key={id} className="p-4 border border-gray-250 dark:border-gray-700 rounded-xl bg-gray-55 dark:bg-gray-850/50 shadow-sm relative group">
                                            {!['admin', 'mod'].includes(id) && (
                                                <button onClick={() => handleDeleteRole(id)} className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xs font-bold transition cursor-pointer" title="Delete Role">
                                                    ✕
                                                </button>
                                            )}
                                            <h5 className="font-black text-sm text-brand mb-2.5 uppercase tracking-wider">{role.name}</h5>
                                            <ul className="text-[10px] space-y-1.5">
                                                {Object.entries(role.perms).map(([p, val]) => (
                                                    <li key={p} className="flex items-center gap-1.5">
                                                        {val ? (
                                                            <span className="text-green-500 font-bold">✓</span>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-600 line-through">✗</span>
                                                        )}
                                                        <span className={`capitalize ${val ? 'text-gray-805 dark:text-gray-200 font-medium' : 'text-gray-400 dark:text-gray-600 line-through font-normal'}`}>
                                                            {p.replace('can', 'can ')}
                                                        </span>
                                                    </li>
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
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20 gap-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Registered User Directory</h4>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Database search & accounts manager</p>
                                    </div>
                                    <button
                                        onClick={handleExportUsersCSV}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                                    >
                                        📊 Export Directory to CSV
                                    </button>
                                </div>
                                
                                <div className="overflow-x-auto max-h-[600px] p-2">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-gray-105 dark:bg-gray-750 text-gray-550 dark:text-gray-400 sticky top-0 font-bold border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="p-4">User Identity</th>
                                                <th className="p-4">Contact Email</th>
                                                <th className="p-4 text-center">System Role</th>
                                                <th className="p-4 text-center">Status</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-150 dark:divide-gray-750 text-gray-750 dark:text-gray-200">
                                            {usersList.map(u => (
                                                <tr key={u.id} className={`hover:bg-gray-50/70 dark:hover:bg-gray-755/30 transition-colors ${u.isBanned ? 'opacity-65 bg-red-50/20 dark:bg-red-950/5' : ''}`}>
                                                    <td className="p-4 font-bold flex items-center gap-2">
                                                        {u.avatarUrl ? (
                                                            <img src={u.avatarUrl} className="w-7 h-7 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-700" alt="avatar" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-brand-subtle dark:bg-brand-highlight/20 text-brand flex items-center justify-center font-bold text-[10px]">
                                                                {(u.displayName || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-bold text-gray-855 dark:text-white">{u.displayName || 'Unknown User'}</p>
                                                            <p className="text-[9px] text-gray-450 font-mono mt-0.5">UID: {u.id}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-500 dark:text-gray-400 select-all">{u.email}</td>
                                                    <td className="p-4 text-center">
                                                        {u.isBanned ? (
                                                            <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[9px] px-2 py-0.5 rounded-md font-black tracking-wider">
                                                                BANNED
                                                            </span>
                                                        ) : u.isSuperAdmin ? (
                                                            <span className="bg-purple-100 dark:bg-purple-950/40 text-purple-750 dark:text-purple-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                                SuperAdmin
                                                            </span>
                                                        ) : u.assignedRole && roles[u.assignedRole] ? (
                                                            <span className="bg-blue-105 dark:bg-blue-950/40 text-blue-750 dark:text-blue-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                                {roles[u.assignedRole].name}
                                                            </span>
                                                        ) : u.isAdmin ? (
                                                            <span className="bg-gray-100 dark:bg-gray-750 text-gray-800 dark:text-gray-305 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                                Admin (Legacy)
                                                            </span>
                                                        ) : u.isModerator ? (
                                                            <span className="bg-gray-100 dark:bg-gray-750 text-gray-800 dark:text-gray-305 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                                Mod (Legacy)
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-[10px] font-bold">Standard User</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {u.isBanned ? (
                                                            <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-350 text-[9px] px-2.5 py-0.5 rounded-full font-black tracking-wider">
                                                                BANNED
                                                            </span>
                                                        ) : (
                                                            <span className="bg-green-105 dark:bg-green-955/40 text-green-700 dark:text-green-300 text-[9px] px-2.5 py-0.5 rounded-full font-black tracking-wider">
                                                                ACTIVE
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-1.5 items-center">
                                                            {isTrueSuperAdmin && !u.isSuperAdmin && (
                                                                <select
                                                                    value={u.assignedRole || 'none'}
                                                                    onChange={(e) => handleAssignUserRole(u.id, e.target.value)}
                                                                    className="px-2.5 py-1.5 border dark:border-gray-600 rounded-xl bg-white dark:bg-gray-750 text-[10px] font-black cursor-pointer outline-none shadow-sm"
                                                                >
                                                                    <option value="none">Standard User</option>
                                                                    {Object.entries(roles).map(([id, role]) => (
                                                                        <option key={id} value={id}>{role.name}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                            {!u.isSuperAdmin && (
                                                                <button
                                                                    onClick={() => handleToggleBan(u)}
                                                                    className={`font-bold text-[10px] uppercase px-3 py-1.5 rounded-xl text-white transition-all cursor-pointer ${
                                                                        u.isBanned
                                                                            ? 'bg-gray-500 hover:bg-gray-600'
                                                                            : 'bg-red-650 hover:bg-red-700 shadow-sm'
                                                                    }`}
                                                                >
                                                                    {u.isBanned ? 'Restore' : 'Ban'}
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
                        </div>
                    )}

                    {/* GAMIFICATION TAB */}
                    {activeTab === 'gamification' && isAdmin && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">Global Gamification Engine</h4>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Control scoring metrics & milestone achievement awards</p>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-5">
                                    {/* Points system */}
                                    <div className="space-y-4">
                                        <h5 className="font-bold text-xs text-gray-750 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 uppercase tracking-wider">Scoring Configurations</h5>
                                        {[['pointsPerPub','Points per Pub Scored'],['pointsPerReview','Points per Written Review'],['pointsPerAdd','Points per Pub Created'],['pointsPerCrawl','Points per Crawl Started']].map(([key, label]) => (
                                            <div key={key} className="flex items-center justify-between bg-gray-55 dark:bg-gray-750/30 p-2.5 rounded-xl border border-gray-150 dark:border-gray-700">
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{label}</span>
                                                <input
                                                    type="number"
                                                    value={gamification[key]}
                                                    onChange={e => setGamification({ ...gamification, [key]: e.target.value })}
                                                    className="w-16 px-2 py-1 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-850 dark:text-white text-center font-bold outline-none"
                                                />
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleSavePointRules}
                                            disabled={isSavingGamification}
                                            className="w-full bg-brand text-white font-bold py-2 rounded-xl text-xs hover:opacity-85 transition disabled:opacity-50 cursor-pointer"
                                        >
                                            {isSavingGamification ? 'Saving...' : 'Update Points Engine'}
                                        </button>
                                    </div>
                                    
                                    {/* Badges system */}
                                    <div>
                                        <h5 className="font-bold text-xs text-gray-755 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 uppercase tracking-wider">Achievement Badges</h5>
                                        
                                        <form onSubmit={handleAddBadge} className="bg-gray-55 dark:bg-gray-750/40 p-3 rounded-xl border border-gray-200 dark:border-gray-750 mb-4 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newBadge.emoji}
                                                    onChange={e => setNewBadge({ ...newBadge, emoji: e.target.value })}
                                                    className="w-10 text-center px-2 py-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white"
                                                    placeholder="🏆"
                                                    maxLength="2"
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    value={newBadge.title}
                                                    onChange={e => setNewBadge({ ...newBadge, title: e.target.value })}
                                                    className="flex-1 px-3 py-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white font-bold"
                                                    placeholder="Badge Name (e.g. Pub Legend)"
                                                    required
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={newBadge.desc}
                                                onChange={e => setNewBadge({ ...newBadge, desc: e.target.value })}
                                                className="w-full px-3 py-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white"
                                                placeholder="Short description of badge achievement..."
                                                required
                                            />
                                            <div className="flex gap-1.5 items-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Unlocks when:</span>
                                                <select
                                                    value={newBadge.metric}
                                                    onChange={e => setNewBadge({ ...newBadge, metric: e.target.value })}
                                                    className="flex-1 text-[10px] px-2 py-1 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white font-bold cursor-pointer"
                                                >
                                                    <option value="rated">Pubs Rated</option>
                                                    <option value="reviews">Reviews Written</option>
                                                    <option value="added">Pubs Added</option>
                                                    <option value="tens">Perfect 10s Given</option>
                                                    <option value="crawls">Crawls Created</option>
                                                </select>
                                                <span className="text-xs text-gray-405 font-black">&gt;=</span>
                                                <input
                                                    type="number"
                                                    value={newBadge.threshold}
                                                    onChange={e => setNewBadge({ ...newBadge, threshold: e.target.value })}
                                                    className="w-12 px-2 py-1 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-850 dark:text-white text-center font-bold"
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                            <button type="submit" className="w-full bg-brand text-white font-bold py-1.5 rounded-lg text-xs hover:opacity-85 transition cursor-pointer">
                                                Add Badge Reward
                                            </button>
                                        </form>
                                        
                                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                            {(!gamification.badges || gamification.badges.length === 0) ? (
                                                <p className="text-xs text-gray-500 italic text-center py-4">No custom award badges created yet.</p>
                                            ) : (
                                                gamification.badges.map((b, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-850 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="text-xl select-none">{b.emoji}</span>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-gray-805 dark:text-white leading-tight truncate">{b.title}</p>
                                                                <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5 truncate font-medium">
                                                                    {b.desc} ({b.metric} &gt;= {b.threshold})
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleDeleteBadge(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-2 cursor-pointer" title="Delete">
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PUBS TAB */}
                    {activeTab === 'pubs' && isAdmin && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20 gap-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Global Master Pub Directory</h4>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Global list of all venues and claim verification status</p>
                                    </div>
                                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full font-bold select-none">
                                        {pubsList.filter(p => p.isLocked).length} Verified Pubs
                                    </span>
                                </div>
                                
                                <div className="overflow-x-auto max-h-[600px] p-2">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-gray-105 dark:bg-gray-750 text-gray-550 dark:text-gray-400 sticky top-0 font-bold border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="p-4 w-12 text-center">Status</th>
                                                <th className="p-4 w-14">Photo</th>
                                                <th className="p-4">Venue Details</th>
                                                <th className="p-4">Location</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-150 dark:divide-gray-750 text-gray-755 dark:text-gray-200">
                                            {pubsList.map(pub => {
                                                const managerCount = Array.isArray(pub.claimedBy) ? pub.claimedBy.length : (pub.claimedBy ? 1 : 0);
                                                return (
                                                    <tr key={pub.id} className={`hover:bg-gray-55 dark:hover:bg-gray-755/30 transition-colors ${pub.isLocked ? 'bg-blue-50/10 dark:bg-blue-950/5' : ''}`}>
                                                        <td className="p-4 text-center">
                                                            {pub.isLocked ? (
                                                                <span className="text-lg" title="Verified & Locked">🔒</span>
                                                            ) : (
                                                                <span className="text-lg opacity-20" title="Unlocked">🔓</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {pub.photoURL ? (
                                                                <img src={pub.photoURL} alt="pub" className="w-9 h-9 rounded-lg object-cover shadow-sm border border-gray-250 dark:border-gray-700" />
                                                            ) : (
                                                                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-750 rounded-lg flex items-center justify-center text-lg select-none">🍺</div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="font-bold text-gray-855 dark:text-white">{pub.name}</p>
                                                            {managerCount > 0 ? (
                                                                <span className="inline-block bg-brand-subtle dark:bg-brand-highlight/20 text-brand text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5">
                                                                    {managerCount} Manager{managerCount > 1 ? 's' : ''}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] text-gray-400 italic">No assigned managers</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-gray-500 font-medium">{pub.location || 'Unknown location'}</td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleTogglePubLock(pub)}
                                                                    className={`font-bold text-[10px] uppercase px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer ${
                                                                        pub.isLocked
                                                                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-250 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-650'
                                                                            : 'bg-brand text-white hover:opacity-85'
                                                                    }`}
                                                                >
                                                                    {pub.isLocked ? 'Unverify' : 'Verify'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePub(pub.id)}
                                                                    className="text-red-705 bg-red-50 hover:bg-red-100 dark:bg-red-955/20 dark:hover:bg-red-900/40 font-bold text-[10px] uppercase px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
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

                    {/* MODERATION TAB */}
                    {activeTab === 'moderation' && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* Reports Queue */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-900/30 shadow-sm overflow-hidden">
                                <div className="flex justify-between items-center p-5 border-b border-red-250 dark:border-red-900/40 bg-red-50/30 dark:bg-red-955/10">
                                    <div>
                                        <h4 className="text-sm font-bold text-red-800 dark:text-red-305">Community Reports Queue</h4>
                                        <p className="text-[10px] text-red-650 dark:text-red-400 mt-0.5">Content flagged by users for review</p>
                                    </div>
                                    <span className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-full">
                                        {reportsList.length}
                                    </span>
                                </div>
                                
                                <div className="overflow-x-auto max-h-80 p-2">
                                    {reportsList.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 font-bold text-xs">
                                            No pending flags! The community is clear.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-gray-50 dark:bg-gray-755 text-gray-550 dark:text-gray-405 font-bold border-b border-gray-205 dark:border-gray-700">
                                                <tr>
                                                    <th className="p-4 w-20">Type</th>
                                                    <th className="p-4">Reported Content</th>
                                                    <th className="p-4">Reported At</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-150 dark:divide-gray-755 text-gray-755 dark:text-gray-200">
                                                {reportsList.map(report => (
                                                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/30 transition-colors">
                                                        <td className="p-4">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                                report.type === 'pub' ? 'bg-orange-105 text-orange-800' : report.type === 'comment' ? 'bg-purple-105 text-purple-800' : 'bg-blue-105 text-blue-800'
                                                            }`}>
                                                                {report.type}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 font-medium italic text-gray-805 dark:text-gray-200">
                                                            "{report.targetName}"
                                                        </td>
                                                        <td className="p-4 text-gray-405">
                                                            {report.createdAt && typeof report.createdAt.toDate === 'function'
                                                                ? new Date(report.createdAt.toDate()).toLocaleDateString('en-GB')
                                                                : 'Recent'}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                <button onClick={() => handleResolveReport(report.id)} className="text-[10px] uppercase bg-gray-200 hover:bg-gray-250 dark:bg-gray-700 dark:hover:bg-gray-650 px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer">
                                                                    Dismiss
                                                                </button>
                                                                <button onClick={() => handleDeleteReportedContent(report)} className="text-[10px] uppercase bg-red-650 text-white hover:bg-red-700 px-2.5 py-1.5 rounded-xl font-bold transition shadow-sm cursor-pointer">
                                                                    Delete Content
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {/* Public Leaderboard review */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-purple-200 dark:border-purple-900/30 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-purple-200 dark:border-purple-900/40 bg-purple-55/20 dark:bg-purple-955/10">
                                    <h4 className="text-sm font-bold text-purple-855 dark:text-purple-305">Public Leaderboard Status</h4>
                                    <p className="text-[10px] text-purple-655 dark:text-purple-400 mt-0.5">Groups opted into the public city leaderboard</p>
                                </div>
                                
                                <div className="overflow-x-auto max-h-80 p-2">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-gray-55 dark:bg-gray-750 text-gray-555 dark:text-gray-400 font-bold border-b border-gray-250 dark:border-gray-700">
                                            <tr>
                                                <th className="p-4">Group Name</th>
                                                <th className="p-4">City</th>
                                                <th className="p-4">Members</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-150 dark:divide-gray-755 text-gray-755 dark:text-gray-200">
                                            {groupsList.filter(g => g.isPublic).length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="p-8 text-center text-gray-500 font-bold">
                                                        No public leaderboard listings.
                                                    </td>
                                                </tr>
                                            ) : (
                                                groupsList.filter(g => g.isPublic).map(g => (
                                                    <tr key={g.id} className="hover:bg-gray-55 dark:hover:bg-gray-750/30 transition-colors">
                                                        <td className="p-4 font-bold text-sm">{g.groupName}</td>
                                                        <td className="p-4 font-medium text-gray-500">{g.city || 'Global'}</td>
                                                        <td className="p-4">
                                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-805 dark:text-blue-300 py-0.5 px-2.5 rounded-full font-bold text-[10px]">
                                                                {g.members?.length || 0} members
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => handleRevokePublicStatus(g.id)} className="text-red-750 bg-red-50 hover:bg-red-100 dark:bg-red-955/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition cursor-pointer">
                                                                Revoke Public Status
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Photo Moderation Queue */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-900/30 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-blue-200 dark:border-blue-900/40 bg-blue-55/20 dark:bg-blue-955/10">
                                    <h4 className="text-sm font-bold text-blue-805 dark:text-blue-305">Photo Moderation Feed</h4>
                                    <p className="text-[10px] text-blue-655 dark:text-blue-400 mt-0.5">Scrub user uploaded imagery violating guidelines</p>
                                </div>
                                
                                <div className="p-5">
                                    {pubsList.filter(p => p.photoURL && !p.photoURL.includes('googleusercontent')).length === 0 ? (
                                        <div className="py-8 text-center text-gray-505 font-bold text-xs">
                                            No user-uploaded photos to moderate.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {pubsList.filter(p => p.photoURL && !p.photoURL.includes('googleusercontent')).slice(0, 20).map(pub => (
                                                <div key={pub.id} className="relative group rounded-xl overflow-hidden border border-gray-250 dark:border-gray-705 shadow-sm">
                                                    <img src={pub.photoURL} alt={pub.name} className="w-full h-32 object-cover group-hover:scale-105 transition duration-300 select-none" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 flex flex-col justify-end">
                                                        <p className="text-white font-bold text-[11px] truncate leading-none mb-1">{pub.name}</p>
                                                        <p className="text-gray-300 text-[9px] truncate">{pub.location || 'Unknown'}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeletePhoto(pub.id)}
                                                        className="absolute top-2 right-2 bg-red-650 text-white p-1.5 rounded-lg text-xs font-bold shadow-lg hover:bg-red-700 transition opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 cursor-pointer"
                                                        title="Scrub Image"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Merge duplicates */}
                            {isAdmin && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-orange-200 dark:border-orange-900/30 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-orange-200 dark:border-orange-900/40 bg-orange-55/20 dark:bg-orange-955/10">
                                        <h4 className="text-sm font-bold text-orange-855 dark:text-orange-305">Merge Duplicate Venues</h4>
                                        <p className="text-[10px] text-orange-655 dark:text-orange-400 mt-0.5">Combine duplicate entries and transfer reviews globally</p>
                                    </div>
                                    
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">1. Master Venue (Keep)</label>
                                                <select
                                                    value={mergePrimary}
                                                    onChange={(e) => setMergePrimary(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-brand cursor-pointer outline-none"
                                                >
                                                    <option value="">-- Choose Master Venue --</option>
                                                    {sortedPubsForDropdown.map(p => (
                                                        <option key={`p-${p.id}`} value={p.id}>{p.name} ({p.location || 'Unknown'})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">2. Duplicate Venue (Purge & Merge)</label>
                                                <select
                                                    value={mergeDuplicate}
                                                    onChange={(e) => setMergeDuplicate(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs border border-red-200 dark:border-red-900/50 rounded-xl bg-red-50/30 dark:bg-red-955/10 dark:text-white focus:ring-2 focus:ring-red-505 cursor-pointer outline-none"
                                                >
                                                    <option value="">-- Choose Duplicate Venue --</option>
                                                    {sortedPubsForDropdown.map(p => (
                                                        <option key={`d-${p.id}`} value={p.id}>{p.name} ({p.location || 'Unknown'})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={handleMergePubs}
                                                disabled={isMerging || !mergePrimary || !mergeDuplicate}
                                                className="px-6 py-2.5 bg-orange-655 text-white font-black text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-md cursor-pointer"
                                            >
                                                {isMerging ? "Merging Databases..." : "Execute Database Merge"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FEEDBACK TAB */}
                    {activeTab === 'feedback' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Feedback & Bug Reports Inbox</h4>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Submitted via feedback form</p>
                                    </div>
                                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full font-bold">
                                        {feedbackList.length} Messages
                                    </span>
                                </div>

                                {feedbackList.length === 0 ? (
                                    <div className="text-center py-16 text-gray-505 italic text-xs font-bold">
                                        No feedback reports in your inbox.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {feedbackList.map(item => (
                                            <div
                                                key={item.id}
                                                className={`p-4 rounded-xl border-l-4 transition-all shadow-sm ${
                                                    item.resolved
                                                        ? 'bg-gray-50/50 dark:bg-gray-850/50 border-gray-300 dark:border-gray-700 opacity-60'
                                                        : 'bg-white dark:bg-gray-850 border-brand'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                            item.type === 'bug' ? 'bg-red-105 text-red-800 dark:bg-red-955/40 dark:text-red-300' : item.type === 'feature' ? 'bg-purple-105 text-purple-800 dark:bg-purple-955/40 dark:text-purple-305' : 'bg-blue-105 text-blue-800 dark:bg-blue-955/40 dark:text-blue-305'
                                                        }`}>
                                                            {item.type}
                                                        </span>
                                                        <span className="text-[10px] text-gray-450 dark:text-gray-400">
                                                            Sender: <strong className="text-gray-705 dark:text-gray-200">{item.userName}</strong> ({item.userEmail})
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1.5 self-end sm:self-auto">
                                                        <button
                                                            onClick={() => handleResolveFeedback(item.id, item.resolved)}
                                                            className={`text-[9px] uppercase font-black px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                                                                item.resolved
                                                                    ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                                                    : 'text-green-800 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-950/20'
                                                            }`}
                                                        >
                                                            {item.resolved ? 'Reopen' : '✓ Resolve'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFeedback(item.id)}
                                                            className="text-[9px] uppercase font-black text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-gray-800 dark:text-gray-250 text-xs font-semibold whitespace-pre-wrap leading-relaxed">
                                                    {item.message}
                                                </p>
                                                <p className="text-[9px] text-gray-400 mt-3 font-medium">
                                                    {item.createdAt && typeof item.createdAt.toDate === 'function'
                                                        ? new Date(item.createdAt.toDate()).toLocaleString('en-GB')
                                                        : 'Recent'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}