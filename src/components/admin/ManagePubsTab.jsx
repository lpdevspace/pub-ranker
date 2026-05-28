import React, { useState } from 'react';

const STATUS_STYLES = {
    visited:    'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700',
    'to-visit': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    skipped:    'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600',
};

const STATUS_FILTER_LABELS = [
    { value: 'all',      label: 'All' },
    { value: 'visited',  label: 'Visited' },
    { value: 'to-visit', label: 'To Visit' },
    { value: 'skipped',  label: 'Skipped' },
];

export default function ManagePubsTab({ pubs, handleDeleteGroupPub }) {
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = pubs
        .filter(p => statusFilter === 'all' || p.status === statusFilter)
        .filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            (p.location || '').toLowerCase().includes(filter.toLowerCase())
        );

    const counts = {
        all:       pubs.length,
        visited:   pubs.filter(p => p.status === 'visited').length,
        'to-visit': pubs.filter(p => p.status === 'to-visit').length,
        skipped:   pubs.filter(p => p.status === 'skipped').length,
    };

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Manage Pubs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pubs.length} pub{pubs.length !== 1 ? 's' : ''} in this group.</p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
                {/* Card header with search + filters */}
                <div className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 rounded-t-xl space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Search pubs…"
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        />
                    </div>
                    {/* Status filter pills */}
                    <div className="flex flex-wrap gap-1.5">
                        {STATUS_FILTER_LABELS.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setStatusFilter(value)}
                                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                                    statusFilter === value
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400'
                                }`}
                            >
                                {label}
                                <span className={`ml-1.5 ${
                                    statusFilter === value ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    {counts[value]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pub rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[520px] overflow-y-auto">
                    {filtered.length === 0 && (
                        <div className="px-5 py-10 text-center">
                            <p className="text-2xl mb-2">🍺</p>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {filter || statusFilter !== 'all' ? 'No pubs match your filters' : 'No pubs yet'}
                            </p>
                            {!filter && statusFilter === 'all' && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add pubs from the Add Pubs tab.</p>
                            )}
                        </div>
                    )}
                    {filtered.map(pub => (
                        <div key={pub.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            {pub.photoURL
                                ? <img src={pub.photoURL} alt={pub.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                : <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center text-lg">🍺</div>
                            }
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{pub.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.location}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap shrink-0 ${
                                STATUS_STYLES[pub.status] || STATUS_STYLES.skipped
                            }`}>
                                {pub.status}
                            </span>
                            <button
                                onClick={() => handleDeleteGroupPub(pub.id, pub.name)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                                title="Remove from group"
                                aria-label="Remove pub"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
