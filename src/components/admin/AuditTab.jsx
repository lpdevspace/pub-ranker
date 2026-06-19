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
        return { dot: 'bg-red-500 ring-red-100 dark:ring-red-950/40', text: 'text-red-700 dark:text-red-400', card: 'bg-red-50/10 dark:bg-red-950/5' };
    if (a.includes('approv') || a.includes('add') || a.includes('creat') || a.includes('join'))
        return { dot: 'bg-green-500 ring-green-100 dark:ring-green-950/40', text: 'text-green-700 dark:text-green-400', card: 'bg-green-50/10 dark:bg-green-950/5' };
    if (a.includes('update') || a.includes('edit') || a.includes('chang') || a.includes('role') || a.includes('weight') || a.includes('setting'))
        return { dot: 'bg-blue-500 ring-blue-100 dark:ring-blue-950/40', text: 'text-blue-700 dark:text-blue-400', card: 'bg-blue-50/10 dark:bg-blue-950/5' };
    if (a.includes('transfer') || a.includes('owner'))
        return { dot: 'bg-yellow-500 ring-yellow-100 dark:ring-yellow-950/40', text: 'text-yellow-750 dark:text-yellow-400', card: 'bg-yellow-50/10 dark:bg-yellow-950/5' };
    return { dot: 'bg-gray-400 ring-gray-100 dark:ring-gray-800', text: 'text-gray-700 dark:text-gray-300', card: 'bg-gray-50/20 dark:bg-gray-900/10' };
}

export default function AuditTab({ auditLogs, loadingLogs, getUserLabel }) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Audit Logs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Review recent administrative actions performed within this group.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Activity Timeline</h4>
                    {!loadingLogs && auditLogs.length > 0 && (
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-full select-none uppercase tracking-wider">
                            Latest {auditLogs.length} logs
                        </span>
                    )}
                </div>

                {/* Loading skeletons */}
                {loadingLogs && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-750 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    <div className="h-2.5 w-1/2 bg-gray-100 dark:bg-gray-750 rounded animate-pulse" />
                                </div>
                                <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-750 rounded animate-pulse shrink-0" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loadingLogs && auditLogs.length === 0 && (
                    <div className="px-5 py-12 text-center bg-white dark:bg-gray-800">
                        <span className="text-3xl block mb-2">📋</span>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-350">No activity recorded</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">Events will populate automatically as admins modify settings, members, or directory pubs.</p>
                    </div>
                )}

                {/* Log rows */}
                {!loadingLogs && auditLogs.length > 0 && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[540px] overflow-y-auto">
                        {auditLogs.map(log => {
                            const style = getActionStyle(log.action);
                            return (
                                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors">
                                    {/* Action Dot indicator */}
                                    <span className={`mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full ring-4 ${style.dot}`} />

                                    {/* Log description */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <p className={`text-sm font-bold leading-none ${style.text}`}>{log.action}</p>
                                            <span className="text-[10px] text-gray-450 dark:text-gray-500">
                                                by <span className="font-semibold text-gray-600 dark:text-gray-400">{getUserLabel(log.adminId)}</span>
                                            </span>
                                        </div>
                                        {log.details && (
                                            <div className={`mt-2 p-2.5 rounded-xl border border-gray-205/40 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 font-medium ${style.card} leading-relaxed`}>
                                                {log.details}
                                            </div>
                                        )}
                                    </div>

                                    {/* Time */}
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-0.5 select-none bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-700 px-2 py-0.5 rounded">
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
