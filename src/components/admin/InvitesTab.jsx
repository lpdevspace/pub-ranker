import React from 'react';

export default function InvitesTab({
    inviteUrl,
    inviteCode,
    requireApproval,
    copyMessage,
    handleCopyInvite,
    handleDownloadQr,
}) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Invite Link</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Share this unique link or QR code to invite new members to your group.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invite Actions Card */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Group Invite URL</span>
                            {requireApproval ? (
                                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800 uppercase tracking-wide">
                                    Approval Required
                                </span>
                            ) : (
                                <span className="px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800 uppercase tracking-wide">
                                    Auto-Join Enabled
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={inviteUrl}
                                className="flex-1 min-w-0 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-mono focus:outline-none"
                            />
                            <button
                                onClick={handleCopyInvite}
                                className={`px-5 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-sm flex-shrink-0 cursor-pointer ${
                                    copyMessage
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-brand hover:bg-brand-hover active:bg-brand-active'
                                }`}
                            >
                                {copyMessage ? '✓ Copied!' : '📋 Copy Link'}
                            </button>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-gray-200/50 dark:border-gray-700/50 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Invite Code / Group ID:</span>
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 select-all">
                                {inviteCode}
                            </span>
                        </div>
                    </div>

                    <div className="bg-brand-subtle/50 dark:bg-brand-highlight/20 p-4 rounded-xl border border-brand-border/30 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        <strong className="text-brand font-bold block mb-1">How invites work:</strong>
                        {requireApproval ? (
                            <span>When people click this link or scan the QR code, they can request to join. You will be notified and can approve or deny their requests inside the <strong>Members</strong> tab.</span>
                        ) : (
                            <span>Anyone who scans the code or visits the link will join your group directory immediately without waiting for admin approval.</span>
                        )}
                    </div>
                </div>

                {/* Inline QR Code Card */}
                <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 text-center gap-4">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">QR Code invite</span>
                    
                    <div 
                        id="admin-qr-canvas-inline" 
                        className="bg-white p-3 rounded-xl shadow-sm border border-gray-200/50 flex items-center justify-center min-h-[180px] min-w-[180px] select-none"
                    />

                    <button
                        onClick={handleDownloadQr}
                        className="w-full py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
                    >
                        ⬇ Download QR Code Image
                    </button>
                </div>
            </div>
        </div>
    );
}
