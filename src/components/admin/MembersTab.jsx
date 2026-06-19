import React from 'react';

const ROLE_BADGE = {
    owner:   'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    manager: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    member:  'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
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
        <div className={`shrink-0 w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold select-none shadow-sm`}>
            {getInitials(label)}
        </div>
    );
}

function Card({ title, description, children, count, accent }) {
    const borderClass = accent 
        ? 'border-amber-200 dark:border-amber-800/40' 
        : 'border-gray-200/60 dark:border-gray-700';
    const headerBg = accent
        ? 'bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/20'
        : 'bg-gray-50/50 dark:bg-gray-700/20 border-b border-gray-150 dark:border-gray-700';
    const titleColor = accent
        ? 'text-amber-800 dark:text-amber-400'
        : 'text-gray-800 dark:text-gray-100';

    return (
        <div className={`rounded-2xl border ${borderClass} overflow-hidden bg-white dark:bg-gray-800 shadow-sm`}>
            <div className={`px-5 py-4 flex justify-between items-center ${headerBg}`}>
                <div>
                    <h4 className={`text-sm font-bold ${titleColor}`}>{title}</h4>
                    {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
                </div>
                {count !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        accent ? 'bg-amber-200 text-amber-900' : 'bg-gray-150 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                        {count}
                    </span>
                )}
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
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Members</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Manage member permissions, custom titles, and membership requests.
                </p>
            </div>

            {/* Pending approvals */}
            {pendingMembers.length > 0 && (
                <Card
                    title="Awaiting Approval"
                    description="Membership requests needing admin review."
                    count={pendingMembers.length}
                    accent
                >
                    {pendingMembers.map(uid => {
                        const label = getUserLabel(uid);
                        return (
                            <div key={uid} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-amber-50/20 dark:hover:bg-amber-900/5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar uid={uid} label={label} />
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{label}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleApproveMember(uid)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectMember(uid)}
                                        className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-700 transition-all cursor-pointer shadow-sm"
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
                description="List of active group members, their roles, and custom titles."
                count={allMemberIds.length}
            >
                {allMemberIds.length === 0 && (
                    <p className="px-5 py-8 text-sm text-gray-400 dark:text-gray-500 italic text-center">No active members found.</p>
                )}
                {allMemberIds.map(uid => {
                    const role = getRole(uid, currentGroup);
                    const label = getUserLabel(uid);
                    const title = memberTitles[uid] || '';
                    const isEditing = editingTitleId === uid;
                    const isSelf = uid === user?.uid;

                    return (
                        <div key={uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                            {/* Left: avatar + name + title */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Avatar uid={uid} label={label} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate leading-tight flex items-center gap-2">
                                        {label}
                                        {isSelf && <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">(you)</span>}
                                    </p>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <input
                                                autoFocus
                                                value={editingTitleText}
                                                onChange={e => setEditingTitleText(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveTitle(uid);
                                                    if (e.key === 'Escape') setEditingTitleId(null);
                                                }}
                                                className="text-xs px-2.5 py-1 border border-brand/50 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand shadow-inner min-w-[120px]"
                                                placeholder="e.g. Chief Taster"
                                            />
                                            <button onClick={() => handleSaveTitle(uid)} className="text-xs text-green-600 dark:text-green-400 font-bold hover:underline cursor-pointer">Save</button>
                                            <button onClick={() => setEditingTitleId(null)} className="text-xs text-gray-400 dark:text-gray-500 hover:underline cursor-pointer">Cancel</button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1 flex items-center gap-1">
                                            {title ? (
                                                <span className="font-semibold italic text-brand">“{title}”</span>
                                            ) : (
                                                <span className="italic text-gray-400/80">No title set</span>
                                            )}
                                            {canManageSettings && (
                                                <button
                                                    onClick={() => { setEditingTitleId(uid); setEditingTitleText(title); }}
                                                    className="text-blue-500 hover:text-blue-700 text-[10px] font-semibold hover:underline cursor-pointer ml-1"
                                                >
                                                    ✍ Edit
                                                </button>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right: role badge + controls */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${ROLE_BADGE[role]}`}>
                                    {role}
                                </span>

                                {isCurrentUserOwner && !isSelf && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={role}
                                            onChange={e => handleRoleChange(uid, e.target.value)}
                                            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer shadow-sm font-semibold"
                                        >
                                            <option value="member">Member</option>
                                            <option value="manager">Manager</option>
                                            <option value="owner">Transfer Ownership</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(uid)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                                            title="Remove member"
                                            aria-label="Remove member"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"/>
                                                <line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </Card>
        </div>
    );
}
