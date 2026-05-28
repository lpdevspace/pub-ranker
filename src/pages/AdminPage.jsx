import React, { useState, useEffect, useMemo } from 'react';
import { firebase, storage } from '../firebase';
import imageCompression from 'browser-image-compression';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../hooks/useToast';

import SettingsTab    from '../components/admin/SettingsTab';
import InvitesTab     from '../components/admin/InvitesTab';
import MembersTab     from '../components/admin/MembersTab';
import CriteriaTab    from '../components/admin/CriteriaTab';
import WeightsTab     from '../components/admin/WeightsTab';
import AddPubsTab     from '../components/admin/AddPubsTab';
import ManagePubsTab  from '../components/admin/ManagePubsTab';
import AuditTab       from '../components/admin/AuditTab';

const NAV_GROUPS = [
    {
        label: 'Group',
        items: [
            { id: 'settings', icon: '⚙️',  label: 'Settings' },
            { id: 'invites',  icon: '📨',  label: 'Invites' },
        ],
    },
    {
        label: 'Members',
        items: [
            { id: 'members',  icon: '👥',  label: 'Members', showBadge: true },
        ],
    },
    {
        label: 'Content',
        items: [
            { id: 'pubs',        icon: '➕',  label: 'Add Pubs' },
            { id: 'manage-pubs', icon: '🍻',  label: 'Manage Pubs' },
            { id: 'criteria',    icon: '📋',  label: 'Criteria' },
            { id: 'weights',     icon: '⚖️',  label: 'Weights' },
        ],
    },
    {
        label: 'Reports',
        items: [
            { id: 'audit', icon: '🕵️', label: 'Audit Logs' },
        ],
    },
];

export default function AdminPage({
    criteria, pubs, user, currentGroup, pubsRef, criteriaRef, groupRef, allUsers, db, featureFlags, scores = {}
}) {
    const { showToast } = useToast();
    const [confirmState, setConfirmState] = useState(null);
    const [activeTab, setActiveTab] = useState('settings');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // --- SETTINGS ---
    const [editGroupName,  setEditGroupName]  = useState(currentGroup?.groupName   || '');
    const [editGroupCover, setEditGroupCover] = useState(currentGroup?.coverPhoto   || '');
    const [brandColor,     setBrandColor]     = useState(currentGroup?.brandColor   || '#2563eb');
    const [requireApproval, setRequireApproval] = useState(currentGroup?.requireApproval || false);
    const [city,    setCity]    = useState(currentGroup?.city     || '');
    const [isPublic, setIsPublic] = useState(currentGroup?.isPublic || false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSyncing,   setIsSyncing]   = useState(false);
    const [syncProgress, setSyncProgress] = useState('');

    // --- WEIGHTS ---
    const [localWeights, setLocalWeights] = useState({});
    const [savingWeights, setSavingWeights] = useState(false);

    // --- MEMBERS ---
    const [pendingMembers, setPendingMembers] = useState(currentGroup?.pendingMembers || []);
    const [memberTitles,   setMemberTitles]   = useState(currentGroup?.memberTitles  || {});
    const [editingTitleId,   setEditingTitleId]   = useState(null);
    const [editingTitleText, setEditingTitleText] = useState('');
    const [managers, setManagers] = useState(currentGroup?.managers || []);
    const [members,  setMembers]  = useState(currentGroup?.members  || []);

    // --- CRITERIA ---
    const [newCriterionName,   setNewCriterionName]   = useState('');
    const [newCriterionType,   setNewCriterionType]   = useState('scale');
    const [newCriterionWeight, setNewCriterionWeight] = useState(1);
    const [savingCriterion, setSavingCriterion] = useState(false);
    const [criterionError,  setCriterionError]  = useState('');
    const [editingCriterionId,   setEditingCriterionId]   = useState(null);
    const [editingCriterionName, setEditingCriterionName] = useState('');

    // --- PUBS ---
    const [masterSearchTerm, setMasterSearchTerm] = useState('');
    const [masterResults,    setMasterResults]    = useState([]);
    const [hasSearched,      setHasSearched]      = useState(false);
    const [showManualForm,   setShowManualForm]   = useState(false);
    const [newPubName,     setNewPubName]     = useState('');
    const [newPubLocation, setNewPubLocation] = useState('');
    const [newPubLat,      setNewPubLat]      = useState('');
    const [newPubLng,      setNewPubLng]      = useState('');
    const [newPubPhotoURL, setNewPubPhotoURL] = useState('');
    const [newPubGoogleLink, setNewPubGoogleLink] = useState('');
    const [savingPub, setSavingPub] = useState(false);
    const [pubError,  setPubError]  = useState('');
    const [uploading, setUploading] = useState(false);

    // --- MISC ---
    const [copyMessage, setCopyMessage] = useState('');
    const [showQr,      setShowQr]      = useState(false);

    // --- AUDIT ---
    const [auditLogs,   setAuditLogs]   = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Guard
    if (!currentGroup) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 dark:text-gray-400">Loading group data...</p>
            </div>
        );
    }

    const inviteCode = currentGroup?.id || groupRef?.id;
    const inviteUrl  = `${window.location.origin}?invite=${inviteCode}`;

    const isCurrentUserOwner   = currentGroup?.ownerUid === user?.uid;
    const isCurrentUserManager = currentGroup?.managers?.includes(user?.uid);
    const canManageSettings    = isCurrentUserOwner || isCurrentUserManager;

    const sanitizeImageUrl = (value) => {
        if (!value || typeof value !== 'string') return '';
        try {
            const parsed = new URL(value, window.location.origin);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
        } catch (_) {}
        return '';
    };
    const safeEditGroupCover = sanitizeImageUrl(editGroupCover);

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        setManagers(currentGroup?.managers || []);
        setMembers(currentGroup?.members   || []);
        setPendingMembers(currentGroup?.pendingMembers || []);
        setMemberTitles(currentGroup?.memberTitles    || {});
        setEditGroupName(currentGroup?.groupName  || '');
        setEditGroupCover(currentGroup?.coverPhoto || '');
        setRequireApproval(currentGroup?.requireApproval || false);
        setCity(currentGroup?.city     || '');
        setIsPublic(currentGroup?.isPublic || false);
    }, [currentGroup]);

    useEffect(() => {
        const w = {};
        criteria.forEach(c => { w[c.id] = c.weight ?? 1; });
        setLocalWeights(w);
    }, [criteria]);

    useEffect(() => {
        if (!showQr) return;

        const renderQr = () => {
            const container = document.getElementById('admin-qr-canvas');
            if (!container || !window.QRCode) return;
            container.innerHTML = '';
            new window.QRCode(container, {
                text: inviteUrl,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel?.H ?? 2,
            });
        };

        if (window.QRCode) {
            window.setTimeout(renderQr, 50);
            return;
        }

        const existingScript = document.querySelector('script[data-admin-qr="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', renderQr, { once: true });
            return () => existingScript.removeEventListener('load', renderQr);
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.async = true;
        script.dataset.adminQr = 'true';
        script.addEventListener('load', renderQr, { once: true });
        document.head.appendChild(script);

        return () => script.removeEventListener('load', renderQr);
    }, [showQr, inviteUrl]);

    useEffect(() => {
        if (activeTab !== 'audit') return;
        setLoadingLogs(true);
        const unsub = groupRef.collection('auditLogs')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoadingLogs(false);
            }, err => {
                console.error('Failed to load audit logs:', err);
                setLoadingLogs(false);
            });
        return () => unsub();
    }, [activeTab, groupRef]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getUserLabel = (uid) => {
        const u = allUsers[uid];
        return u?.displayName || u?.email || uid;
    };

    const logAdminAction = async (actionTitle, details = '') => {
        try {
            await groupRef.collection('auditLogs').add({
                action: actionTitle,
                details,
                adminId: user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } catch (e) { console.error('Failed to write audit log:', e); }
    };

    // ── Simulated leaderboard (Weights tab preview) ────────────────────────────
    const simulatedLeaderboard = useMemo(() => {
        if (!pubs || !scores) return [];
        return pubs
            .filter(p => p.status === 'visited')
            .map(pub => {
                let totalScore = 0, totalWeight = 0;
                const pubScoresData = scores[pub.id] ?? {};
                Object.entries(pubScoresData).forEach(([criterionId, criterionScores]) => {
                    const weight = localWeights[criterionId] ?? 1;
                    criterionScores.forEach((score) => {
                        if (score.type === 'scale' && score.value !== null)  { totalScore += score.value * weight;       totalWeight += weight; }
                        if (score.type === 'price' && score.value !== null)  { totalScore += (score.value * 2) * weight; totalWeight += weight; }
                    });
                });
                return { ...pub, avgScore: totalWeight > 0 ? totalScore / totalWeight : 0 };
            })
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 5);
    }, [pubs, scores, localWeights]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleExportData = () => {
        let csv = 'Pub Name,Location,Status,Added By\n';
        pubs.forEach(p => {
            const addedBy = allUsers[p.addedBy]?.displayName || allUsers[p.addedBy]?.email || 'Unknown';
            csv += `"${p.name}","${p.location}","${p.status}","${addedBy}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${(currentGroup?.groupName || 'group').replace(/\s+/g, '_')}_Pubs.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logAdminAction('Exported Data', 'Downloaded Group Data as CSV');
    };

    const handleSaveSettings = async () => {
        if (!editGroupName.trim()) return;
        setIsSavingSettings(true);
        try {
            await groupRef.update({
                groupName:       editGroupName.trim(),
                coverPhoto:      editGroupCover.trim(),
                brandColor,
                requireApproval,
                city:     city.trim(),
                isPublic,
            });
            logAdminAction('Updated Group Settings', 'Changed branding or privacy settings');
            showToast('Group settings saved!', 'success');
        } catch (e) {
            console.error('Error saving settings', e);
            showToast('Failed to save settings.', 'error');
        }
        setIsSavingSettings(false);
    };

    const handleSyncLegacyPubs = () => {
        const legacyPubs = pubs.filter(p => !p.placeId);
        if (legacyPubs.length === 0) { showToast('All your pubs are already synced with Google!', 'success'); return; }
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
            const { Place } = await window.google.maps.importLibrary('places');
            for (let i = 0; i < legacyPubs.length; i++) {
                const pub = legacyPubs[i];
                setSyncProgress(`Syncing ${i + 1} of ${legacyPubs.length}: ${pub.name}...`);
                try {
                    const searchQuery = pub.location ? `${pub.name} in ${pub.location}` : pub.name;
                    const { places } = await Place.searchByText({ textQuery: searchQuery, fields: ['id', 'displayName', 'rating', 'photos', 'formattedAddress'] });
                    if (places?.length > 0) {
                        const best = places[0];
                        const updates = { placeId: best.id };
                        if (best.rating) updates.googleRating = best.rating;
                        if (best.photos?.length > 0 && !pub.photoURL) updates.photoURL = best.photos[0].getURI({ maxWidth: 800 });
                        await pubsRef.doc(pub.id).update(updates);
                        successCount++;
                    }
                } catch (err) { console.error(`Failed to sync ${pub.name}:`, err); }
                await new Promise(r => setTimeout(r, 800));
            }
            logAdminAction('Database Maintenance', `Synced ${successCount} legacy pubs with Google Places API`);
            showToast(`Sync complete! Updated ${successCount} of ${legacyPubs.length} legacy pubs.`, 'success');
        } catch (error) {
            console.error('Critical error during sync:', error);
            showToast('Failed to initialise Google Places API.', 'error');
        } finally {
            setIsSyncing(false);
            setSyncProgress('');
        }
    };

    const handleSaveWeights = async () => {
        setSavingWeights(true);
        try {
            const promises = criteria
                .filter(c => localWeights[c.id] !== c.weight)
                .map(c => criteriaRef.doc(c.id).update({ weight: localWeights[c.id] }));
            await Promise.all(promises);
            logAdminAction('Updated Global Weights', 'Adjusted the multiplier weights for the leaderboard');
            showToast('Global weights updated!', 'success');
        } catch (e) {
            console.error('Error saving weights', e);
            showToast('Failed to save weights.', 'error');
        } finally { setSavingWeights(false); }
    };

    const handleApproveMember = async (uid) => {
        try {
            await groupRef.update({ pendingMembers: firebase.firestore.FieldValue.arrayRemove(uid), members: firebase.firestore.FieldValue.arrayUnion(uid) });
            await db.collection('users').doc(uid).update({ groups: firebase.firestore.FieldValue.arrayUnion(currentGroup.id) });
            logAdminAction('Approved Member', `Allowed ${getUserLabel(uid)} to join the group`);
            showToast(`${getUserLabel(uid)} approved!`, 'success');
        } catch (e) { console.error('Error approving member', e); showToast('Failed to approve member.', 'error'); }
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
                    logAdminAction('Rejected Member', `Denied entry to ${getUserLabel(uid)}`);
                    showToast(`${getUserLabel(uid)}'s request rejected.`, 'info');
                } catch (e) { console.error('Error rejecting member', e); showToast('Failed to reject request.', 'error'); }
            },
        });
    };

    const handleSaveTitle = async (uid) => {
        try {
            await groupRef.update({ [`memberTitles.${uid}`]: editingTitleText.trim() });
            setEditingTitleId(null);
            logAdminAction('Changed Member Title', `Gave ${getUserLabel(uid)} the title "${editingTitleText.trim()}"`);
            showToast('Title saved!', 'success');
        } catch (e) { console.error('Error saving title', e); showToast('Failed to save title.', 'error'); }
    };

    const handleRoleChange = async (memberId, role) => {
        if (!isCurrentUserOwner || (memberId === user.uid && role !== 'owner')) return;
        try {
            if (role === 'owner')   await groupRef.update({ ownerUid: memberId, managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
            if (role === 'manager') await groupRef.update({ managers: firebase.firestore.FieldValue.arrayUnion(memberId) });
            if (role === 'member')  await groupRef.update({ managers: firebase.firestore.FieldValue.arrayRemove(memberId) });
            logAdminAction('Changed Role', `Made ${getUserLabel(memberId)} a ${role}`);
            showToast(`Role updated to ${role}.`, 'success');
        } catch (e) { console.error(e); showToast('Failed to update role.', 'error'); }
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
                    await db.collection('users').doc(memberId).update({ groups: firebase.firestore.FieldValue.arrayRemove(currentGroup.id) });
                    logAdminAction('Kicked Member', `Removed ${getUserLabel(memberId)} from the group`);
                    showToast(`${getUserLabel(memberId)} removed.`, 'info');
                } catch (e) { console.error(e); showToast('Failed to remove member.', 'error'); }
            },
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
        setUploading(true);
        try {
            const compressed = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true });
            const fileRef = storage.ref(`pubs/global/${Date.now()}_${file.name}`);
            await fileRef.put(compressed);
            setNewPubPhotoURL(await fileRef.getDownloadURL());
        } catch (err) { console.error('Upload failed:', err); showToast('Failed to upload image.', 'error'); }
        finally { setUploading(false); }
    };

    const handleAddCriterion = async (e) => {
        e.preventDefault();
        if (!canManageSettings) { showToast('You do not have permission to add criteria.', 'error'); return; }
        setCriterionError('');
        if (!newCriterionName.trim()) return setCriterionError('Please enter a name.');
        setSavingCriterion(true);
        try {
            await criteriaRef.add({
                name: newCriterionName.trim(), type: newCriterionType,
                weight: Number(newCriterionWeight) || 1, archived: false,
                order: criteria.length, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            logAdminAction('Added Criterion', `Created new rating category: ${newCriterionName.trim()}`);
            setNewCriterionName(''); setNewCriterionType('scale'); setNewCriterionWeight(1);
            showToast('Criterion added!', 'success');
        } catch (e) { setCriterionError('Could not add criterion.'); }
        finally { setSavingCriterion(false); }
    };

    const handleArchiveCriterion = async (id, archived, name) => {
        try {
            await criteriaRef.doc(id).update({ archived });
            logAdminAction(archived ? 'Archived Criterion' : 'Restored Criterion', `Target: ${name}`);
            showToast(archived ? `"${name}" archived.` : `"${name}" restored.`, 'success');
        } catch (e) { console.error(e); showToast('Failed to update criterion.', 'error'); }
    };

    const handleSaveCriterionEdit = async (id) => {
        if (!editingCriterionName.trim()) return;
        try {
            await criteriaRef.doc(id).update({ name: editingCriterionName.trim() });
            setEditingCriterionId(null);
            logAdminAction('Edited Criterion', `Changed name to: ${editingCriterionName.trim()}`);
            showToast('Criterion updated!', 'success');
        } catch (e) { console.error(e); showToast('Failed to update criterion.', 'error'); }
    };

    const searchMasterList = async (e) => {
        e.preventDefault();
        if (!masterSearchTerm.trim()) return;
        setSavingPub(true);
        try {
            const snap = await db.collection('pubs').get();
            const term = masterSearchTerm.toLowerCase();
            setMasterResults(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p =>
                p.name.toLowerCase().includes(term) || (p.location && p.location.toLowerCase().includes(term))
            ));
            setHasSearched(true);
        } catch (err) { console.error(err); showToast('Error searching master database.', 'error'); }
        finally { setSavingPub(false); }
    };

    const importPub = async (globalPub) => {
        if (pubs.find(p => p.globalId === globalPub.id || p.name.toLowerCase() === globalPub.name.toLowerCase())) {
            showToast('This pub is already in your group!', 'error'); return;
        }
        try {
            await pubsRef.add({ ...globalPub, globalId: globalPub.id, addedBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(), status: 'to-visit' });
            if (groupRef) await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(1) });
            logAdminAction('Imported Pub', `Added ${globalPub.name} from the Global Database`);
            showToast(`${globalPub.name} imported successfully!`, 'success');
            setMasterSearchTerm(''); setMasterResults([]); setHasSearched(false); setShowManualForm(false);
        } catch (err) { console.error(err); showToast('Failed to import pub.', 'error'); }
    };

    const handleAddPub = async (e) => {
        e.preventDefault();
        if (!canManageSettings) { showToast('You do not have permission to add pubs.', 'error'); return; }
        setPubError('');
        if (!newPubName.trim()) return setPubError('Please enter a pub name.');
        setSavingPub(true);
        try {
            let googlePhotoUrl = '', googleRating = null, placeId = '', fullAddress = newPubLocation.trim() || '';
            try {
                if (window.google && !featureFlags?.disableGoogleAPI) {
                    const { Place } = await window.google.maps.importLibrary('places');
                    const searchQuery = fullAddress ? `${newPubName.trim()} in ${fullAddress}` : newPubName.trim();
                    const { places } = await Place.searchByText({ textQuery: searchQuery, fields: ['id', 'displayName', 'rating', 'photos', 'formattedAddress'] });
                    if (places?.length > 0) {
                        const best = places[0];
                        placeId = best.id; googleRating = best.rating || null;
                        if (best.formattedAddress) fullAddress = best.formattedAddress;
                        if (best.photos?.length > 0) googlePhotoUrl = best.photos[0].getURI({ maxWidth: 800 });
                    }
                }
            } catch (googleErr) { console.error('Google fetch failed, continuing manually:', googleErr); }

            const pubData = {
                name: newPubName.trim(), location: fullAddress,
                lat: newPubLat ? parseFloat(newPubLat) : null,
                lng: newPubLng ? parseFloat(newPubLng) : null,
                photoURL: newPubPhotoURL.trim() || googlePhotoUrl || '',
                googleLink: newPubGoogleLink.trim() || '',
                placeId: placeId || '', googleRating: googleRating || null,
                addedBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            };
            const globalPubRef = await db.collection('pubs').add({ ...pubData, isLocked: false });
            await pubsRef.add({ ...pubData, globalId: globalPubRef.id, status: 'to-visit' });
            if (groupRef) await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(1) });
            logAdminAction('Created Pub', `Created ${newPubName.trim()} manually`);
            setNewPubName(''); setNewPubLocation(''); setNewPubLat(''); setNewPubLng(''); setNewPubPhotoURL(''); setNewPubGoogleLink('');
            setShowManualForm(false); setMasterSearchTerm(''); setHasSearched(false);
            showToast('Pub created and added to your group!', 'success');
        } catch (e) { console.error('Error saving pub:', e); setPubError('Could not add pub.'); }
        finally { setSavingPub(false); }
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
                    if (groupRef) await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(-1) });
                    logAdminAction('Deleted Pub', `Removed ${pubName} from the group directory`);
                    showToast(`"${pubName}" removed.`, 'info');
                } catch (error) { console.error('Error removing pub:', error); showToast('Failed to remove pub.', 'error'); }
            },
        });
    };

    const handleCopyInvite = async () => {
        try { await navigator.clipboard.writeText(inviteUrl); setCopyMessage('Invite link copied!'); setTimeout(() => setCopyMessage(''), 2000); }
        catch (e) { setCopyMessage('Could not copy.'); }
    };

    const handleDownloadQr = () => {
        const canvas = document.querySelector('#admin-qr-canvas canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${(currentGroup?.groupName || 'group').replace(/\s+/g, '_')}_invite_qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Active tab label (for mobile header) ───────────────────────────────────
    const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label ?? '';

    // ── Nav item renderer ──────────────────────────────────────────────────────
    const NavItem = ({ item }) => {
        const isActive = activeTab === item.id;
        return (
            <button
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                    isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
                {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
                <span className="text-base leading-none">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'members' && pendingMembers.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                        {pendingMembers.length}
                    </span>
                )}
                {item.id === 'members' && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{members.length}</span>
                )}
            </button>
        );
    };

    // ── Sidebar content ────────────────────────────────────────────────────────
    const SidebarContent = () => (
        <nav className="flex flex-col gap-5 p-4">
            {/* Group identity */}
            <div className="px-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Managing</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate">{currentGroup?.groupName}</p>
            </div>

            {NAV_GROUPS.map(group => (
                <div key={group.label}>
                    <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {group.label}
                    </p>
                    <div className="flex flex-col gap-0.5">
                        {group.items.map(item => <NavItem key={item.id} item={item} />)}
                    </div>
                </div>
            ))}
        </nav>
    );

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="w-full">
            {confirmState && <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />}

            {showQr && (
                <div
                    onClick={() => setShowQr(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.72)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-4)',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '360px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xl)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: 'var(--space-6)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'var(--space-4)',
                        }}
                    >
                        <button
                            onClick={() => setShowQr(false)}
                            aria-label="Close QR modal"
                            style={{
                                position: 'absolute',
                                top: 'var(--space-3)',
                                right: 'var(--space-3)',
                                width: '32px',
                                height: '32px',
                                borderRadius: '9999px',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-surface-offset)',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: 700,
                            }}
                        >
                            ✕
                        </button>

                        <div style={{ textAlign: 'center', paddingTop: 'var(--space-2)' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>Scan to Join</h3>
                            <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                Share this QR code so people can join <strong>{currentGroup?.groupName || 'your group'}</strong>.
                            </p>
                        </div>

                        <div
                            id="admin-qr-canvas"
                            style={{
                                background: '#ffffff',
                                padding: '14px',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid #e5e7eb',
                                minHeight: '228px',
                                minWidth: '228px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        />

                        <button
                            onClick={handleDownloadQr}
                            style={{
                                width: '100%',
                                padding: 'var(--space-3) var(--space-4)',
                                background: 'var(--color-primary)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 700,
                                fontSize: 'var(--text-sm)',
                                cursor: 'pointer',
                            }}
                        >
                            ⬇ Download QR
                        </button>
                    </div>
                </div>
            )}

            {/* Page header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Group Admin</h2>
            </div>

            {/* Mobile: top bar with hamburger */}
            <div className="flex items-center gap-3 mb-4 md:hidden">
                <button
                    onClick={() => setSidebarOpen(o => !o)}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    aria-label="Toggle admin menu"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6"  x2="21" y2="6"  />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{activeLabel}</span>
            </div>

            {/* Mobile: slide-down sidebar */}
            {sidebarOpen && (
                <div className="md:hidden mb-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
                    <SidebarContent />
                </div>
            )}

            {/* Desktop: sidebar + content layout */}
            <div className="flex gap-6 items-start">

                {/* Sidebar — desktop only */}
                <aside className="hidden md:block w-52 shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm sticky top-20">
                    <SidebarContent />
                </aside>

                {/* Main content */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 min-h-[500px]">

                    {activeTab === 'settings' && (
                        <SettingsTab
                            editGroupName={editGroupName} setEditGroupName={setEditGroupName}
                            brandColor={brandColor} setBrandColor={setBrandColor}
                            editGroupCover={editGroupCover} setEditGroupCover={setEditGroupCover}
                            safeEditGroupCover={safeEditGroupCover}
                            requireApproval={requireApproval} setRequireApproval={setRequireApproval}
                            city={city} setCity={setCity}
                            isPublic={isPublic} setIsPublic={setIsPublic}
                            isSavingSettings={isSavingSettings}
                            isSyncing={isSyncing} syncProgress={syncProgress}
                            handleSaveSettings={handleSaveSettings}
                            handleSyncLegacyPubs={handleSyncLegacyPubs}
                            handleExportData={handleExportData}
                        />
                    )}

                    {activeTab === 'invites' && (
                        <InvitesTab
                            inviteUrl={inviteUrl} inviteCode={inviteCode}
                            requireApproval={requireApproval}
                            copyMessage={copyMessage}
                            handleCopyInvite={handleCopyInvite}
                            setShowQr={setShowQr}
                        />
                    )}

                    {activeTab === 'members' && (
                        <MembersTab
                            members={members} managers={managers} pendingMembers={pendingMembers}
                            memberTitles={memberTitles}
                            editingTitleId={editingTitleId} setEditingTitleId={setEditingTitleId}
                            editingTitleText={editingTitleText} setEditingTitleText={setEditingTitleText}
                            user={user} currentGroup={currentGroup}
                            isCurrentUserOwner={isCurrentUserOwner}
                            canManageSettings={canManageSettings}
                            getUserLabel={getUserLabel}
                            handleApproveMember={handleApproveMember}
                            handleRejectMember={handleRejectMember}
                            handleSaveTitle={handleSaveTitle}
                            handleRoleChange={handleRoleChange}
                            handleRemoveMember={handleRemoveMember}
                        />
                    )}

                    {activeTab === 'criteria' && (
                        <CriteriaTab
                            criteria={criteria}
                            newCriterionName={newCriterionName} setNewCriterionName={setNewCriterionName}
                            newCriterionType={newCriterionType} setNewCriterionType={setNewCriterionType}
                            newCriterionWeight={newCriterionWeight} setNewCriterionWeight={setNewCriterionWeight}
                            savingCriterion={savingCriterion}
                            criterionError={criterionError}
                            editingCriterionId={editingCriterionId} setEditingCriterionId={setEditingCriterionId}
                            editingCriterionName={editingCriterionName} setEditingCriterionName={setEditingCriterionName}
                            canManageSettings={canManageSettings}
                            handleAddCriterion={handleAddCriterion}
                            handleArchiveCriterion={handleArchiveCriterion}
                            handleSaveCriterionEdit={handleSaveCriterionEdit}
                        />
                    )}

                    {activeTab === 'weights' && (
                        <WeightsTab
                            criteria={criteria}
                            localWeights={localWeights} setLocalWeights={setLocalWeights}
                            savingWeights={savingWeights}
                            simulatedLeaderboard={simulatedLeaderboard}
                            handleSaveWeights={handleSaveWeights}
                        />
                    )}

                    {activeTab === 'pubs' && (
                        <AddPubsTab
                            showManualForm={showManualForm} setShowManualForm={setShowManualForm}
                            masterSearchTerm={masterSearchTerm} setMasterSearchTerm={setMasterSearchTerm}
                            masterResults={masterResults}
                            hasSearched={hasSearched}
                            savingPub={savingPub}
                            newPubName={newPubName} setNewPubName={setNewPubName}
                            newPubLocation={newPubLocation} setNewPubLocation={setNewPubLocation}
                            newPubLat={newPubLat} setNewPubLat={setNewPubLat}
                            newPubLng={newPubLng} setNewPubLng={setNewPubLng}
                            newPubPhotoURL={newPubPhotoURL} setNewPubPhotoURL={setNewPubPhotoURL}
                            newPubGoogleLink={newPubGoogleLink} setNewPubGoogleLink={setNewPubGoogleLink}
                            pubError={pubError}
                            uploading={uploading}
                            searchMasterList={searchMasterList}
                            importPub={importPub}
                            handleAddPub={handleAddPub}
                            handleImageUpload={handleImageUpload}
                        />
                    )}

                    {activeTab === 'manage-pubs' && (
                        <ManagePubsTab
                            pubs={pubs}
                            handleDeleteGroupPub={handleDeleteGroupPub}
                        />
                    )}

                    {activeTab === 'audit' && (
                        <AuditTab
                            auditLogs={auditLogs}
                            loadingLogs={loadingLogs}
                            getUserLabel={getUserLabel}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
