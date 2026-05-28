import React from 'react';

const ROLE_BADGE = {
    owner:   'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
    manager: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    member:  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
};

const AVATAR_COLORS = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

function getRole(uid, currentGroup) {
    if (currentGroup?.ownerUid === uid) return 'owner';
    if (currentGroup?.managers?.includes(uid)) return 'manager';
    return 'member';
}

function getInitials(label) {
    return (label || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
}

function Avatar({ uid, label }) {
    const color = AVATAR_COLORS[(uid?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
    return (
        <div className={`shrink-0 w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold select-none`}>
            {getInitials(label)}
        </div>
    );
}

function Card({ title, description, children, accent }) {
    const headerBg = accent
        ? 'bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700'
        : 'bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700';
    const titleColor = accent
        ? 'text-orange-700 dark:text-orange-300'
        : 'text-gray-800 dark:text-gray-100';
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
            <div className={`px-5 pt-4 pb-3 rounded-t-xl ${headerBg}`}>
                <h4 className={`text-sm font-bold ${titleColor}`}>{title}</h4>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {children}
            </div>
        </div>
    );
}

export default function MembersTab({
    members, managers, pendingMembers, memberTitles,
    editingTitleId, setEditingTitleId,
    editingTitleText, setEditingTitleText,
    user, currentGroup,
    isCurrentUserOwner, canManageSettings,
    getUserLabel,
    handleApproveMember, handleRejectMember,
    handleSaveTitle, handleRoleChange, handleRemoveMember,
}) {
    const allMemberIds = [...new Set([currentGroup?.ownerUid, ...managers, ...members].filter(Boolean))];

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Members</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {allMemberIds.length} member{allMemberIds.length !== 1 ? 's' : ''}
                    {pendingMembers.length > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-semibold">
                            {pendingMembers.length} pending
                        </span>
                    )}
                </p>
            </div>

            {/* Pending approvals */}
            {pendingMembers.length > 0 && (
                <Card
                    title={`Awaiting Approval — ${pendingMembers.length}`}
                    description="These users have requested to join the group."
                    accent
                >
                    {pendingMembers.map(uid => {
                        const label = getUserLabel(uid);
                        return (
                            <div key={uid} className="flex items-center justify-between gap-3 px-5 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar uid={uid} label={label} />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{label}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleApproveMember(uid)}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectMember(uid)}
                                        className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-200 dark:border-red-700 transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </Card>
            )}

            {/* Active members */}
            <Card
                title="Active Members"
                description="Manage roles and titles for current members."
            >
                {allMemberIds.length === 0 && (
                    <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 italic text-center">No members yet.</p>
                )}
                {allMemberIds.map(uid => {
                    const role = getRole(uid, currentGroup);
                    const label = getUserLabel(uid);
                    const title = memberTitles[uid] || '';
                    const isEditing = editingTitleId === uid;
                    const isSelf = uid === user?.uid;

                    return (
                        <div key={uid} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                            {/* Left: avatar + name + title */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Avatar uid={uid} label={label} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                                        {label}
                                        {isSelf && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}
                                    </p>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                autoFocus
                                                value={editingTitleText}
                                                onChange={e => setEditingTitleText(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveTitle(uid);
                                                    if (e.key === 'Escape') setEditingTitleId(null);
                                                }}
                                                className="text-xs px-2 py-1 border border-blue-400 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="e.g. Chief Taster"
                                            />
                                            <button onClick={() => handleSaveTitle(uid)} className="text-xs text-green-600 dark:text-green-400 font-bold">Save</button>
                                            <button onClick={() => setEditingTitleId(null)} className="text-xs text-gray-400">Cancel</button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                                            {title || <span className="italic text-gray-400">No title</span>}
                                            {canManageSettings && (
                                                <button
                                                    onClick={() => { setEditingTitleId(uid); setEditingTitleText(title); }}
                                                    className="ml-1.5 text-blue-500 hover:text-blue-700 text-xs"
                                                >
                                                    edit
                                                </button>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right: role badge + controls */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${ROLE_BADGE[role]}`}>
                                    {role}
                                </span>

                                {isCurrentUserOwner && !isSelf && (
                                    <>
                                        <select
                                            value={role}
                                            onChange={e => handleRoleChange(uid, e.target.value)}
                                            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="member">Member</option>
                                            <option value="manager">Manager</option>
                                            <option value="owner">Transfer Ownership</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(uid)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Remove member"
                                            aria-label="Remove member"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </Card>
        </div>
    );
}
