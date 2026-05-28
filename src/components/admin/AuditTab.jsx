import React from 'react';

function formatTimestamp(ts) {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AuditTab({ auditLogs, loadingLogs, getUserLabel }) {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Audit Logs</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">The 50 most recent admin actions in this group.</p>

            {loadingLogs && (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    ))}
                </div>
            )}

            {!loadingLogs && auditLogs.length === 0 && (
                <p className="text-sm text-gray-400 italic py-4 text-center">No audit logs yet.</p>
            )}

            {!loadingLogs && auditLogs.length > 0 && (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {auditLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{log.action}</p>
                                {log.details && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{log.details}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                    by <span className="font-medium">{getUserLabel(log.adminId)}</span>
                                </p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{formatTimestamp(log.timestamp)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
