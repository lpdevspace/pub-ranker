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
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Invite Link</h3>

            <p className="text-sm text-gray-600 dark:text-gray-400">
                Share this link to invite people to your group.
                {requireApproval && (
                    <span className="ml-1 inline-block bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Approval required
                    </span>
                )}
            </p>

            <div className="flex items-center gap-2">
                <input
                    readOnly
                    value={inviteUrl}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-mono truncate"
                />
                <button
                    onClick={handleCopyInvite}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                    {copyMessage || '📋 Copy'}
                </button>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Group ID: <span className="font-mono">{inviteCode}</span></span>
                <button
                    onClick={() => setShowQr(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Show QR Code
                </button>
            </div>
        </div>
    );
}
