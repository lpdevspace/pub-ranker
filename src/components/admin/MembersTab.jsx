import React from 'react';

const ROLE_BADGE = {
    owner:   'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    manager: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    member:  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

function getRole(uid, currentGroup) {
    if (currentGroup?.ownerUid === uid) return 'owner';
    if (currentGroup?.managers?.includes(uid)) return 'manager';
    return 'member';
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
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Members ({allMemberIds.length})</h3>

            {/* Pending approvals */}
            {pendingMembers.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">⏳ Awaiting Approval ({pendingMembers.length})</h4>
                    {pendingMembers.map(uid => (
                        <div key={uid} className="flex items-center justify-between gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-2.5">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{getUserLabel(uid)}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleApproveMember(uid)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                                >✓ Approve</button>
                                <button
                                    onClick={() => handleRejectMember(uid)}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                                >✗ Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Member list */}
            <div className="space-y-2">
                {allMemberIds.map(uid => {
                    const role = getRole(uid, currentGroup);
                    const title = memberTitles[uid] || '';
                    const isEditing = editingTitleId === uid;
                    const isSelf = uid === user?.uid;

                    return (
                        <div key={uid} className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                        {getUserLabel(uid)}{isSelf && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                                    </p>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                autoFocus
                                                value={editingTitleText}
                                                onChange={e => setEditingTitleText(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(uid); if (e.key === 'Escape') setEditingTitleId(null); }}
                                                className="text-xs px-2 py-1 border border-blue-400 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                                                placeholder="e.g. Chief Taster"
                                            />
                                            <button onClick={() => handleSaveTitle(uid)} className="text-xs text-green-600 font-bold">Save</button>
                                            <button onClick={() => setEditingTitleId(null)} className="text-xs text-gray-400">Cancel</button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {title || <span className="italic">No title</span>}
                                            {canManageSettings && (
                                                <button
                                                    onClick={() => { setEditingTitleId(uid); setEditingTitleText(title); }}
                                                    className="ml-2 text-blue-500 hover:underline"
                                                >edit</button>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[role]}`}>{role}</span>

                                {isCurrentUserOwner && !isSelf && (
                                    <>
                                        <select
                                            value={role}
                                            onChange={e => handleRoleChange(uid, e.target.value)}
                                            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                        >
                                            <option value="member">Member</option>
                                            <option value="manager">Manager</option>
                                            <option value="owner">Transfer Ownership</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(uid)}
                                            className="text-xs text-red-500 hover:text-red-700 font-bold"
                                            title="Kick member"
                                        >✕</button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
