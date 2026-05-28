import React from 'react';

export default function MembersTab({
    members,
    managers,
    pendingMembers,
    memberTitles,
    editingTitleId, setEditingTitleId,
    editingTitleText, setEditingTitleText,
    user,
    currentGroup,
    isCurrentUserOwner,
    canManageSettings,
    getUserLabel,
    handleApproveMember,
    handleRejectMember,
    handleSaveTitle,
    handleRoleChange,
    handleRemoveMember,
}) {
    return (
        <div className="space-y-6 animate-fadeIn">
            {pendingMembers.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-orange-800 dark:text-orange-400 mb-3 flex items-center gap-2">
                        ⏳ Pending Join Requests
                        <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingMembers.length}</span>
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
                                            {getUserLabel(uid)}
                                            {uid === user.uid && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full ml-1 uppercase">You</span>}
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
                                                        {memberTitles[uid] || 'No Title'}
                                                    </span>
                                                    {canManageSettings && (
                                                        <button
                                                            onClick={() => { setEditingTitleId(uid); setEditingTitleText(memberTitles[uid] || ''); }}
                                                            className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 text-xs transition"
                                                        >✏️</button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                                isGroupOwner
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                    : isManager
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                                {isGroupOwner ? 'Owner' : isManager ? 'Manager' : 'Member'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {isCurrentUserOwner && !isGroupOwner && (
                                                <div className="flex justify-end gap-2">
                                                    <select
                                                        value={isManager ? 'manager' : 'member'}
                                                        onChange={(e) => handleRoleChange(uid, e.target.value)}
                                                        className="px-2 py-1 border dark:border-gray-600 rounded text-xs font-semibold bg-white dark:bg-gray-700 dark:text-white cursor-pointer"
                                                    >
                                                        <option value="member">Member</option>
                                                        <option value="manager">Manager</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handleRemoveMember(uid)}
                                                        className="px-3 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-bold transition border border-red-100 dark:border-red-800"
                                                    >Kick</button>
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
    );
}
