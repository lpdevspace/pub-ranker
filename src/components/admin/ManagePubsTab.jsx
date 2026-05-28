import React, { useState } from 'react';

export default function ManagePubsTab({ pubs, handleDeleteGroupPub }) {
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = pubs
        .filter(p => statusFilter === 'all' || p.status === statusFilter)
        .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || (p.location || '').toLowerCase().includes(filter.toLowerCase()));

    const STATUS_COLOURS = {
        visited:    'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
        'to-visit': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
        skipped:    'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Manage Pubs ({pubs.length})</h3>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <input
                    type="text"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Search pubs…"
                    className="flex-1 min-w-[180px] px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                />
                {['all', 'visited', 'to-visit', 'skipped'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full capitalize border transition-colors ${
                            statusFilter === s
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }`}
                    >
                        {s === 'all' ? 'All' : s}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filtered.length === 0 && (
                    <p className="text-sm text-gray-400 italic py-4 text-center">No pubs match your filters.</p>
                )}
                {filtered.map(pub => (
                    <div key={pub.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5">
                        {pub.photoURL && (
                            <img src={pub.photoURL} alt={pub.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{pub.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.location}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${STATUS_COLOURS[pub.status] || STATUS_COLOURS.skipped}`}>
                            {pub.status}
                        </span>
                        <button
                            onClick={() => handleDeleteGroupPub(pub.id, pub.name)}
                            className="text-red-400 hover:text-red-600 text-lg font-bold ml-1 flex-shrink-0 transition-colors"
                            title="Remove from group"
                        >×</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
