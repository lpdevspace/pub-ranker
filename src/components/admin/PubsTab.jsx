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

const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5';

function SectionCard({ title, description, children }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
            <div className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h4>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
            <div className="px-5 py-5">
                {children}
            </div>
        </div>
    );
}

function AddView({
    showManualForm, setShowManualForm,
    masterSearchTerm, setMasterSearchTerm,
    masterResults, hasSearched, savingPub,
    newPubName, setNewPubName,
    newPubLocation, setNewPubLocation,
    newPubLat, setNewPubLat,
    newPubLng, setNewPubLng,
    newPubPhotoURL, setNewPubPhotoURL,
    newPubGoogleLink, setNewPubGoogleLink,
    pubError, uploading,
    searchMasterList, importPub, handleAddPub, handleImageUpload,
}) {
    return (
        <div className="space-y-4">
            {/* Search global database */}
            <SectionCard
                title="Search Global Database"
                description="Find and import pubs already in the Pub Ranker database."
            >
                <form onSubmit={searchMasterList} className="flex gap-2">
                    <input
                        type="text"
                        value={masterSearchTerm}
                        onChange={e => setMasterSearchTerm(e.target.value)}
                        className={inputClass}
                        placeholder="Search by name or location…"
                    />
                    <button
                        type="submit"
                        disabled={savingPub || !masterSearchTerm.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    >
                        Search
                    </button>
                </form>

                {hasSearched && masterResults.length === 0 && (
                    <div className="mt-4 text-center py-6">
                        <p className="text-2xl mb-1">🔍</p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No pubs found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Try a different search term, or add the pub manually below.</p>
                    </div>
                )}

                {masterResults.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-64 overflow-y-auto -mx-1 px-1">
                        {masterResults.map(pub => (
                            <div key={pub.id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    {pub.photoURL
                                        ? <img src={pub.photoURL} alt={pub.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                        : <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 shrink-0 flex items-center justify-center text-lg">🍺</div>
                                    }
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{pub.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.location}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => importPub(pub)}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm"
                                >
                                    Import
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Manual add — collapsible */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
                <button
                    type="button"
                    onClick={() => setShowManualForm(v => !v)}
                    className="w-full flex items-center justify-between px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="text-left">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Add Manually</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pub not in the database? Add it yourself.</p>
                    </div>
                    <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-gray-400 transition-transform duration-200 ${showManualForm ? 'rotate-180' : ''}`}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                {showManualForm && (
                    <form onSubmit={handleAddPub} className="px-5 py-5 space-y-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Pub Name <span className="text-red-400">*</span></label>
                                <input type="text" value={newPubName} onChange={e => setNewPubName(e.target.value)} className={inputClass} placeholder="The Royal Oak" />
                            </div>
                            <div>
                                <label className={labelClass}>Location</label>
                                <input type="text" value={newPubLocation} onChange={e => setNewPubLocation(e.target.value)} className={inputClass} placeholder="Wolverhampton" />
                            </div>
                            <div>
                                <label className={labelClass}>Latitude</label>
                                <input type="number" step="any" value={newPubLat} onChange={e => setNewPubLat(e.target.value)} className={inputClass} placeholder="52.5855" />
                            </div>
                            <div>
                                <label className={labelClass}>Longitude</label>
                                <input type="number" step="any" value={newPubLng} onChange={e => setNewPubLng(e.target.value)} className={inputClass} placeholder="-2.1239" />
                            </div>
                            <div>
                                <label className={labelClass}>Photo URL</label>
                                <input type="url" value={newPubPhotoURL} onChange={e => setNewPubPhotoURL(e.target.value)} className={inputClass} placeholder="https://…" />
                            </div>
                            <div>
                                <label className={labelClass}>Google Maps Link</label>
                                <input type="url" value={newPubGoogleLink} onChange={e => setNewPubGoogleLink(e.target.value)} className={inputClass} placeholder="https://maps.google.com/…" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Or Upload a Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                                className="text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100"
                            />
                            {uploading && <p className="text-xs text-blue-500 animate-pulse mt-1">Uploading…</p>}
                        </div>

                        {pubError && (
                            <p className="text-xs text-red-500 dark:text-red-400 font-medium">{pubError}</p>
                        )}

                        <div className="flex justify-end pt-1">
                            <button
                                type="submit"
                                disabled={savingPub || uploading}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                            >
                                {savingPub ? 'Adding…' : '🍺 Add Pub'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

function ManageView({ pubs, handleDeleteGroupPub }) {
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = pubs
        .filter(p => statusFilter === 'all' || p.status === statusFilter)
        .filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            (p.location || '').toLowerCase().includes(filter.toLowerCase())
        );

    const counts = {
        all:        pubs.length,
        visited:    pubs.filter(p => p.status === 'visited').length,
        'to-visit': pubs.filter(p => p.status === 'to-visit').length,
        skipped:    pubs.filter(p => p.status === 'skipped').length,
    };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
            {/* Header: search + filter pills */}
            <div className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 rounded-t-xl space-y-3">
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

            {/* Pub list */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[520px] overflow-y-auto">
                {filtered.length === 0 && (
                    <div className="px-5 py-10 text-center">
                        <p className="text-2xl mb-2">🍺</p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {filter || statusFilter !== 'all' ? 'No pubs match your filters' : 'No pubs yet'}
                        </p>
                        {!filter && statusFilter === 'all' && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Switch to Add to get started.</p>
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
    );
}

export default function PubsTab(props) {
    const { pubs } = props;
    const [view, setView] = useState('add');

    return (
        <div className="space-y-5">
            {/* Header + sub-view switcher */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Pubs</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {pubs.length} pub{pubs.length !== 1 ? 's' : ''} in this group
                    </p>
                </div>

                {/* Pill switcher */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5 shrink-0">
                    <button
                        onClick={() => setView('add')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            view === 'add'
                                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add
                    </button>
                    <button
                        onClick={() => setView('manage')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            view === 'manage'
                                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                        Manage
                        {pubs.length > 0 && (
                            <span className="bg-gray-200 dark:bg-gray-500 text-gray-600 dark:text-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {pubs.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Active view */}
            {view === 'add'
                ? <AddView {...props} />
                : <ManageView pubs={pubs} handleDeleteGroupPub={props.handleDeleteGroupPub} />
            }
        </div>
    );
}
