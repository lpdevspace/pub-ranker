import React, { useState } from 'react';

const STATUS_STYLES = {
    visited:    'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/60',
    'to-visit': 'bg-brand-subtle dark:bg-brand-highlight/25 text-brand border border-brand-border/40',
    skipped:    'bg-gray-50 dark:bg-gray-800 text-gray-550 dark:text-gray-450 border border-gray-200 dark:border-gray-700',
};

const STATUS_FILTER_LABELS = [
    { value: 'all',      label: 'All' },
    { value: 'visited',  label: 'Visited' },
    { value: 'to-visit', label: 'To Visit' },
    { value: 'skipped',  label: 'Skipped' },
];

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors shadow-sm';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 ml-1';

function SectionCard({ title, description, children }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h4>
                {description && <p className="text-xs text-gray-400 dark:text-gray-550 mt-0.5">{description}</p>}
            </div>
            <div className="p-5 flex-1 space-y-4">
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
        <div className="space-y-6">
            {/* Search global database */}
            <SectionCard
                title="Search Global Database"
                description="Find and import pubs already added to the global Pub Ranker registry."
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
                        className="px-5 py-2.5 bg-brand hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
                    >
                        Search Directory
                    </button>
                </form>

                {hasSearched && masterResults.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <span className="text-3xl block mb-2">🔍</span>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No pubs found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">Try typing a different name or city. If it's a new pub, you can add it manually below.</p>
                    </div>
                )}

                {masterResults.length > 0 && (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                        {masterResults.map(pub => (
                            <div key={pub.id} className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700 rounded-xl p-3 shadow-sm hover:border-brand-border/40 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    {pub.photoURL ? (
                                        <img src={pub.photoURL} alt={pub.name} className="w-11 h-11 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-750" />
                                    ) : (
                                        <div className="w-11 h-11 rounded-lg bg-brand-subtle dark:bg-brand-highlight shrink-0 flex items-center justify-center text-xl">🍺</div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{pub.name}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{pub.location}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => importPub(pub)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                                >
                                    Import
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Manual add — collapsible */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowManualForm(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20 hover:bg-gray-100/50 dark:hover:bg-gray-700/40 transition-colors"
                >
                    <div className="text-left">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Add Pub Manually</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Register a new venue that doesn't exist in the database.</p>
                    </div>
                    <svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-gray-400 transition-transform duration-200 ${showManualForm ? 'rotate-180' : ''}`}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                {showManualForm && (
                    <form onSubmit={handleAddPub} className="p-5 space-y-4 border-t border-gray-100 dark:border-gray-750">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Pub Name <span className="text-red-400">*</span></label>
                                <input type="text" value={newPubName} onChange={e => setNewPubName(e.target.value)} className={inputClass} placeholder="e.g. The Prince Albert" required />
                            </div>
                            <div>
                                <label className={labelClass}>Location / Address</label>
                                <input type="text" value={newPubLocation} onChange={e => setNewPubLocation(e.target.value)} className={inputClass} placeholder="e.g. 12 High Street, Wolverhampton" />
                            </div>
                            <div>
                                <label className={labelClass}>Latitude (Optional)</label>
                                <input type="number" step="any" value={newPubLat} onChange={e => setNewPubLat(e.target.value)} className={inputClass} placeholder="e.g. 52.586" />
                            </div>
                            <div>
                                <label className={labelClass}>Longitude (Optional)</label>
                                <input type="number" step="any" value={newPubLng} onChange={e => setNewPubLng(e.target.value)} className={inputClass} placeholder="e.g. -2.128" />
                            </div>
                            <div>
                                <label className={labelClass}>Photo Image URL</label>
                                <input type="url" value={newPubPhotoURL} onChange={e => setNewPubPhotoURL(e.target.value)} className={inputClass} placeholder="https://images.unsplash.com/..." />
                            </div>
                            <div>
                                <label className={labelClass}>Google Maps URL Link</label>
                                <input type="url" value={newPubGoogleLink} onChange={e => setNewPubGoogleLink(e.target.value)} className={inputClass} placeholder="https://maps.google.com/..." />
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                            <label className={labelClass}>Or Upload a Photo Directly</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                                className="text-sm text-gray-650 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-subtle file:text-brand hover:file:bg-brand-border/20 transition-all cursor-pointer"
                            />
                            {uploading && <p className="text-xs text-brand animate-pulse font-bold mt-1.5">Uploading image to storage…</p>}
                        </div>

                        {pubError && (
                            <p className="text-xs text-red-500 dark:text-red-400 font-bold">{pubError}</p>
                        )}

                        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="submit"
                                disabled={savingPub || uploading || !newPubName.trim()}
                                className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl transition-all shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingPub ? 'Saving Pub…' : '🍺 Register & Add Pub'}
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            {/* Header: search + filter pills */}
            <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20 border-b border-gray-100 dark:border-gray-700 space-y-4">
                <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Search pubs by name or location…"
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand transition-colors shadow-inner"
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTER_LABELS.map(({ value, label }) => {
                        const isActive = statusFilter === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setStatusFilter(value)}
                                className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-brand text-white border-brand shadow-sm'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-border/40'
                                }`}
                            >
                                {label}
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                                    isActive ? 'bg-black/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-450 dark:text-gray-400'
                                }`}>
                                    {counts[value]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Pub list */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[520px] overflow-y-auto">
                {filtered.length === 0 && (
                    <div className="px-5 py-12 text-center bg-white dark:bg-gray-800">
                        <span className="text-3xl block mb-2">🍺</span>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-350">
                            {filter || statusFilter !== 'all' ? 'No pubs match filters' : 'No pubs added yet'}
                        </p>
                        {!filter && statusFilter === 'all' && (
                            <p className="text-xs text-gray-450 dark:text-gray-500 mt-1">Switch to the "Add" tab to populate your group directory.</p>
                        )}
                    </div>
                )}
                {filtered.map(pub => (
                    <div key={pub.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors">
                        {pub.photoURL ? (
                            <img src={pub.photoURL} alt={pub.name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700 shadow-sm" />
                        ) : (
                            <div className="w-11 h-11 rounded-xl bg-brand-subtle dark:bg-brand-highlight shrink-0 flex items-center justify-center text-xl">🍺</div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{pub.name}</p>
                            <p className="text-xs text-gray-550 dark:text-gray-400 truncate mt-0.5">{pub.location}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                            STATUS_STYLES[pub.status] || STATUS_STYLES.skipped
                        }`}>
                            {pub.status}
                        </span>
                        <button
                            onClick={() => handleDeleteGroupPub(pub.id, pub.name)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 cursor-pointer border border-transparent hover:border-red-200/50 dark:hover:border-red-900/30"
                            title="Remove from group"
                            aria-label="Remove pub"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
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
        <div className="space-y-6">
            {/* Header + sub-view switcher */}
            <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Group Pubs Directory</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Import or manually register pubs to include in your rankings.
                    </p>
                </div>

                {/* Pill switcher */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-0.5 gap-0.5 shrink-0 border border-gray-200/40 dark:border-gray-600/30 shadow-sm">
                    <button
                        onClick={() => setView('add')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            view === 'add'
                                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Import / Add
                    </button>
                    <button
                        onClick={() => setView('manage')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            view === 'manage'
                                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                        Manage Directory
                        {pubs.length > 0 && (
                            <span className="bg-brand text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
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
