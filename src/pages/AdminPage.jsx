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
import PubsTab        from '../components/admin/PubsTab';
import AuditTab       from '../components/admin/AuditTab';

const NAV_GROUPS = [
    {
        label: 'Command Center',
        items: [
            { id: 'overview', icon: 'dashboard', label: 'Overview' },
        ],
    },
    {
        label: 'Settings',
        items: [
            { id: 'settings', icon: 'settings',  label: 'Settings' },
            { id: 'invites',  icon: 'invites',  label: 'Invites' },
        ],
    },
    {
        label: 'Members',
        items: [
            { id: 'members',  icon: 'members',  label: 'Members', showBadge: true },
        ],
    },
    {
        label: 'Content Directory',
        items: [
            { id: 'pubs',     icon: 'pubs',  label: 'Pubs' },
            { id: 'criteria', icon: 'criteria',  label: 'Criteria' },
            { id: 'weights',  icon: 'weights',  label: 'Weights' },
        ],
    },
    {
        label: 'Security Logs',
        items: [
            { id: 'audit', icon: 'audit', label: 'Audit Logs' },
        ],
    },
];

function AdminNavIcon({ type }) {
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
        case 'settings':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            );
        case 'invites':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-cyan-550" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
            );
        case 'members':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
        case 'criteria':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
            );
        case 'weights':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
            );
        case 'audit':
            return (
                <svg className="w-4 h-4 flex-shrink-0 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="9" x2="15" y2="9" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                </svg>
            );
        default:
            return <span>⚙️</span>;
    }
}

function formatTimestamp(ts) {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function OverviewTab({
    currentGroup,
    membersCount,
    pubsCount,
    pendingCount,
    inviteUrl,
    inviteCode,
    copyMessage,
    handleCopyInvite,
    handleDownloadQr,
    auditLogs,
    loadingLogs,
    getUserLabel,
    setActiveTab,
}) {
    return (
        <div className="space-y-6">
            {/* Group identity header card */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-250 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                {currentGroup.coverPhoto ? (
                    <div className="h-28 w-full relative">
                        <img src={currentGroup.coverPhoto} alt="Group Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                ) : (
                    <div className="h-20 w-full bg-gradient-to-r from-brand/80 to-brand dark:from-brand-dark dark:to-brand" />
                )}
                <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand bg-brand-subtle dark:bg-brand-highlight/30 px-2.5 py-0.5 rounded-full select-none">Admin Panel</span>
                        <h3 className="text-2xl font-black text-gray-850 dark:text-white mt-1.5">{currentGroup.groupName}</h3>
                        {currentGroup.city && <p className="text-xs text-gray-455 dark:text-gray-400 mt-0.5">📍 Based in {currentGroup.city}</p>}
                    </div>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
                    >
                        ⚙️ Customize Group
                    </button>
                </div>
            </div>

            {/* Dashboard stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3 hover:border-brand-border/20 transition-colors">
                    <div>
                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Group Directory</span>
                        <p className="text-3xl font-black text-gray-850 dark:text-white mt-1">{pubsCount}</p>
                    </div>
                    <button onClick={() => setActiveTab('pubs')} className="text-xs font-bold text-brand hover:underline text-left cursor-pointer">Manage Pubs →</button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3 hover:border-brand-border/20 transition-colors">
                    <div>
                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Active Members</span>
                        <p className="text-3xl font-black text-gray-850 dark:text-white mt-1">{membersCount}</p>
                    </div>
                    <button onClick={() => setActiveTab('members')} className="text-xs font-bold text-brand hover:underline text-left cursor-pointer">Manage Members →</button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3 hover:border-brand-border/20 transition-colors">
                    <div>
                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Join Requests</span>
                        <p className={`text-3xl font-black mt-1 ${pendingCount > 0 ? 'text-amber-605 dark:text-amber-500' : 'text-gray-850 dark:text-white'}`}>{pendingCount}</p>
                    </div>
                    {pendingCount > 0 ? (
                        <button onClick={() => setActiveTab('members')} className="text-xs font-black text-amber-605 dark:text-amber-500 animate-pulse hover:underline text-left cursor-pointer">Review Pending →</button>
                    ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">No approvals pending</span>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3 hover:border-brand-border/20 transition-colors">
                    <div>
                        <span className="text-[10px] font-bold text-gray-455 dark:text-gray-500 uppercase tracking-wider">Privacy Mode</span>
                        <p className="text-base font-bold text-gray-850 dark:text-white mt-2">
                            {currentGroup.isPublic ? '🌐 Public Directory' : '🔒 Private Circle'}
                        </p>
                    </div>
                    <button onClick={() => setActiveTab('settings')} className="text-xs font-bold text-brand hover:underline text-left cursor-pointer">Edit Settings →</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Quick share widget */}
                <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 flex flex-col items-center justify-between text-center gap-4">
                    <div className="w-full text-left">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Quick Invite</h4>
                        <p className="text-[10px] text-gray-450 uppercase tracking-wider mt-0.5">Share Link or QR Code</p>
                    </div>

                    <div id="admin-qr-canvas-overview" className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-200/50 flex items-center justify-center min-h-[140px] min-w-[140px] select-none" />

                    <div className="flex gap-1.5 w-full">
                        <button
                            onClick={handleCopyInvite}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-sm cursor-pointer ${
                                copyMessage ? 'bg-green-600 hover:bg-green-700' : 'bg-brand hover:bg-brand-hover active:bg-brand-active'
                            }`}
                        >
                            {copyMessage ? '✓ Link Copied!' : '📋 Copy Link'}
                        </button>
                        <button
                            onClick={handleDownloadQr}
                            className="px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-300 border border-gray-205 dark:border-gray-600 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
                            title="Download QR Code"
                        >
                            ⬇ QR
                        </button>
                    </div>
                </div>

                {/* Recent actions list */}
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Recent Admin Activity</h4>
                            <p className="text-[10px] text-gray-450 uppercase tracking-wider mt-0.5">Audit Log Overview</p>
                        </div>
                        <button onClick={() => setActiveTab('audit')} className="text-xs font-bold text-brand hover:underline cursor-pointer">View All →</button>
                    </div>

                    {loadingLogs ? (
                        <div className="space-y-3 flex-1">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-10 bg-gray-50 dark:bg-gray-750 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-gray-400 italic text-xs">
                            No recent admin actions recorded.
                        </div>
                    ) : (
                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {auditLogs.slice(0, 3).map(log => (
                                <div key={log.id} className="flex items-center justify-between gap-3 text-xs bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-150/40 dark:border-gray-750">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-805 dark:text-gray-200 truncate">{log.action}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">by {getUserLabel(log.adminId)}</p>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap shrink-0">{formatTimestamp(log.timestamp)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminPage({
    criteria, pubs, user, currentGroup, pubsRef, criteriaRef, groupRef, allUsers, db, featureFlags, scores = {}
}) {
    const { showToast } = useToast();
    const [confirmState, setConfirmState] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
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
        if (activeTab !== 'invites' && activeTab !== 'overview') return;

        const renderQr = () => {
            const container1 = document.getElementById('admin-qr-canvas-inline');
            const container2 = document.getElementById('admin-qr-canvas-overview');
            if (container1 && window.QRCode) {
                container1.innerHTML = '';
                new window.QRCode(container1, {
                    text: inviteUrl,
                    width: 180,
                    height: 180,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel?.H ?? 2,
                });
            }
            if (container2 && window.QRCode) {
                container2.innerHTML = '';
                new window.QRCode(container2, {
                    text: inviteUrl,
                    width: 130,
                    height: 130,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel?.H ?? 2,
                });
            }
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
    }, [activeTab, inviteUrl]);

    useEffect(() => {
        if (activeTab !== 'audit' && activeTab !== 'overview') return;
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
        try { await navigator.clipboard.writeText(inviteUrl); showToast('Invite link copied!', 'success'); }
        catch (e) { showToast('Could not copy link.', 'error'); }
    };

    const handleDownloadQr = () => {
        const canvas = document.querySelector('#admin-qr-canvas-inline canvas') || document.querySelector('#admin-qr-canvas-overview canvas');
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 relative cursor-pointer ${
                    isActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-gray-650 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-150'
                }`}
            >
                {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-full" />
                )}
                <AdminNavIcon type={item.id} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'members' && pendingMembers.length > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                        {pendingMembers.length}
                    </span>
                )}
                {item.id === 'members' && (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded-full border border-gray-150 dark:border-gray-700">{members.length}</span>
                )}
            </button>
        );
    };

    // ── Sidebar content ────────────────────────────────────────────────────────
    const SidebarContent = () => (
        <nav className="flex flex-col gap-5 p-4 bg-white dark:bg-gray-800">
            {/* Group identity */}
            <div className="px-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 select-none">Managing Group</p>
                <p className="text-sm font-bold text-brand truncate leading-tight">{currentGroup?.groupName}</p>
            </div>

            {NAV_GROUPS.map(group => (
                <div key={group.label} className="space-y-1">
                    <p className="px-3 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-550 select-none">
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

            {/* Page header */}
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-850 dark:text-white leading-tight">Group Administration</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Customise directory, moderate members, and configure leaderboard weight distributions.</p>
                </div>
            </div>

            {/* Mobile: top bar with hamburger */}
            <div className="flex items-center gap-3 mb-4 md:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-2xl shadow-sm">
                <button
                    onClick={() => setSidebarOpen(o => !o)}
                    className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-750 text-gray-650 dark:text-gray-300 transition cursor-pointer border border-gray-200 dark:border-gray-650"
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

            {/* Desktop: sidebar + content layout */}
            <div className="flex flex-col md:flex-row gap-6 items-start">

                {/* Sidebar — desktop only */}
                <aside className="hidden md:block w-52 shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm sticky top-20 overflow-hidden">
                    <SidebarContent />
                </aside>

                {/* Main content */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 min-h-[520px]">
                    {activeTab === 'overview' && (
                        <OverviewTab
                            currentGroup={currentGroup}
                            membersCount={members.length}
                            pubsCount={pubs.length}
                            pendingCount={pendingMembers.length}
                            inviteUrl={inviteUrl}
                            inviteCode={inviteCode}
                            copyMessage={copyMessage}
                            handleCopyInvite={handleCopyInvite}
                            handleDownloadQr={handleDownloadQr}
                            auditLogs={auditLogs}
                            loadingLogs={loadingLogs}
                            getUserLabel={getUserLabel}
                            setActiveTab={setActiveTab}
                        />
                    )}

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
                            handleDownloadQr={handleDownloadQr}
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
                        <PubsTab
                            pubs={pubs}
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
