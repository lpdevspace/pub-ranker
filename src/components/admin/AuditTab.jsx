import React from 'react';

function formatTimestamp(ts) {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

// Colour-code log rows by action keyword
function getActionStyle(action = '') {
    const a = action.toLowerCase();
    if (a.includes('remov') || a.includes('delet') || a.includes('kick') || a.includes('reject'))
        return { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' };
    if (a.includes('approv') || a.includes('add') || a.includes('creat') || a.includes('join'))
        return { dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400' };
    if (a.includes('update') || a.includes('edit') || a.includes('chang') || a.includes('role') || a.includes('weight') || a.includes('setting'))
        return { dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' };
    if (a.includes('transfer') || a.includes('owner'))
        return { dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' };
    return { dot: 'bg-gray-400', text: 'text-gray-600 dark:text-gray-400' };
}

export default function AuditTab({ auditLogs, loadingLogs, getUserLabel }) {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Audit Logs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">The 50 most recent admin actions in this group.</p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
                {/* Card header */}
                <div className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 rounded-t-xl flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Activity</h4>
                    {!loadingLogs && auditLogs.length > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{auditLogs.length} entr{auditLogs.length === 1 ? 'y' : 'ies'}</span>
                    )}
                </div>

                {/* Loading skeletons */}
                {loadingLogs && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 w-2/5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    <div className="h-2.5 w-3/5 bg-gray-100 dark:bg-gray-700/60 rounded animate-pulse" />
                                </div>
                                <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-700/60 rounded animate-pulse shrink-0" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loadingLogs && auditLogs.length === 0 && (
                    <div className="px-5 py-10 text-center">
                        <p className="text-2xl mb-2">📋</p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No activity yet</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Admin actions will appear here as they happen.</p>
                    </div>
                )}

                {/* Log rows */}
                {!loadingLogs && auditLogs.length > 0 && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[520px] overflow-y-auto">
                        {auditLogs.map(log => {
                            const style = getActionStyle(log.action);
                            return (
                                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    {/* Colour dot */}
                                    <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${style.dot}`} />

                                    {/* Action + details + actor */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold leading-tight ${style.text}`}>{log.action}</p>
                                        {log.details && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{log.details}</p>
                                        )}
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            by <span className="font-medium text-gray-500 dark:text-gray-400">{getUserLabel(log.adminId)}</span>
                                        </p>
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-0.5">
                                        {formatTimestamp(log.timestamp)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
