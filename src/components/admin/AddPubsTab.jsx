import React from 'react';

const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5';

function Card({ title, description, children }) {
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

export default function AddPubsTab({
    showManualForm, setShowManualForm,
    masterSearchTerm, setMasterSearchTerm,
    masterResults,
    hasSearched,
    savingPub,
    newPubName, setNewPubName,
    newPubLocation, setNewPubLocation,
    newPubLat, setNewPubLat,
    newPubLng, setNewPubLng,
    newPubPhotoURL, setNewPubPhotoURL,
    newPubGoogleLink, setNewPubGoogleLink,
    pubError,
    uploading,
    searchMasterList,
    importPub,
    handleAddPub,
    handleImageUpload,
}) {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Pubs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Search the global database or add a pub manually.</p>
            </div>

            {/* ── Search global database ─────────────────────────── */}
            <Card title="Search Global Database" description="Find and import pubs already in the Pub Ranker database.">
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
            </Card>

            {/* ── Manual add ─────────────────────────────────────── */}
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
