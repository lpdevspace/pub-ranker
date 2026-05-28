import React from 'react';

export default function InvitesTab({
    inviteUrl,
    inviteCode,
    requireApproval,
    copyMessage,
    handleCopyInvite,
    setShowQr,
}) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Invite Friends</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Share this link or code so friends can join your group.{' '}
                    {requireApproval
                        ? 'Since your group is private, they will need your approval to enter.'
                        : 'Anyone with the link can join instantly.'}
                </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Direct Invite Link</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        readOnly
                        value={inviteUrl}
                        className="flex-1 px-4 py-3 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white font-mono shadow-inner outline-none"
                    />
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
    );
}
