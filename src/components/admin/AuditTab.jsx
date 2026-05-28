import React from 'react';

export default function AuditTab({ auditLogs, loadingLogs, getUserLabel }) {
    return (
        <div className="space-y-4 animate-fadeIn">
            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Audit Log</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">A record of the last 50 admin actions in this group.</p>
            </div>

            {loadingLogs ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic py-8 text-center">Loading logs...</p>
            ) : auditLogs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic py-8 text-center">No audit logs yet.</p>
            ) : (
                <div className="space-y-2">
                    {auditLogs.map(log => (
                        <div key={log.id} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                            <div className="flex-1">
                                <p className="font-bold text-gray-800 dark:text-white text-sm">{log.action}</p>
                                {log.details && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.details}</p>}
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">by {getUserLabel(log.adminId)}</p>
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap pt-0.5">
                                {log.timestamp?.toDate
                                    ? log.timestamp.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : '—'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
