import React from 'react';

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
    const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
    const labelClass = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Add Pubs</h3>

            {/* Search master database */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">🔍 Search Global Database</h4>
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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                    >
                        {savingPub ? '…' : 'Search'}
                    </button>
                </form>

                {hasSearched && masterResults.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No matching pubs in the global database.</p>
                )}

                {masterResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {masterResults.map(pub => (
                            <div key={pub.id} className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    {pub.photoURL && (
                                        <img src={pub.photoURL} alt={pub.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{pub.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.location}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => importPub(pub)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                                >
                                    Import
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Manual add toggle */}
            <button
                onClick={() => setShowManualForm(v => !v)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
                {showManualForm ? '▲ Hide manual form' : '+ Add pub manually'}
            </button>

            {showManualForm && (
                <form onSubmit={handleAddPub} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Pub Name *</label>
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

                    {/* Image upload */}
                    <div>
                        <label className={labelClass}>Or upload a photo</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploading}
                            className="text-sm text-gray-600 dark:text-gray-400"
                        />
                        {uploading && <p className="text-xs text-blue-500 animate-pulse mt-1">Uploading…</p>}
                    </div>

                    {pubError && <p className="text-xs text-red-500">{pubError}</p>}

                    <button
                        type="submit"
                        disabled={savingPub || uploading}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                    >
                        {savingPub ? 'Adding…' : '🍺 Add Pub'}
                    </button>
                </form>
            )}
        </div>
    );
}
