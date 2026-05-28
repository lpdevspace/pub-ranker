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
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Add a Pub to Your Group</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Search the Global Master Database to save time and API quota, or manually create a new one.</p>

                {!showManualForm ? (
                    <div className="space-y-6">
                        <form onSubmit={searchMasterList} className="flex gap-2">
                            <input
                                type="text"
                                value={masterSearchTerm}
                                onChange={e => setMasterSearchTerm(e.target.value)}
                                placeholder="Search global database (e.g., The Red Lion)..."
                                className="flex-1 px-4 py-3 border dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white shadow-sm"
                                required
                            />
                            <button type="submit" disabled={savingPub} className="bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-md">
                                {savingPub ? 'Searching...' : '🔍 Search'}
                            </button>
                        </form>

                        {hasSearched && (
                            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 animate-fadeIn">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3">Search Results ({masterResults.length})</h4>

                                {masterResults.length === 0 ? (
                                    <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">No matching pubs found globally.</p>
                                        <button onClick={() => setShowManualForm(true)} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-sm">
                                            ➕ Create Custom Pub
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                        {masterResults.map(pub => (
                                            <div key={pub.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-300 transition group">
                                                <div className="flex items-center gap-4">
                                                    {pub.photoURL ? (
                                                        <img src={pub.photoURL} alt={pub.name} className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl shadow-sm">🍺</div>
                                                    )}
                                                    <div>
                                                        <h5 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-lg leading-tight">
                                                            {pub.name}
                                                            {pub.isLocked && (
                                                                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" title="Verified by Super Admin">🔒 Verified</span>
                                                            )}
                                                        </h5>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pub.location || 'Unknown Location'}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => importPub(pub)} className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm ml-4 whitespace-nowrap">
                                                    📥 Import
                                                </button>
                                            </div>
                                        ))}
                                        <div className="text-center pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Didn't find what you're looking for?</p>
                                            <button onClick={() => setShowManualForm(true)} className="text-brand font-bold hover:underline">
                                                ➕ Create a brand new pub
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleAddPub} className="space-y-4 animate-fadeIn">
                        <button type="button" onClick={() => setShowManualForm(false)} className="text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white mb-2 inline-flex items-center gap-1 transition-colors">
                            ← Back to Global Search
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pub Name *</label>
                                <input type="text" maxLength={50} value={newPubName} onChange={(e) => setNewPubName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Location / Area</label>
                                <input type="text" maxLength={50} value={newPubLocation} onChange={(e) => setNewPubLocation(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GPS Latitude</label>
                                <input type="text" value={newPubLat} onChange={(e) => setNewPubLat(e.target.value)} placeholder="e.g. 51.5074" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white font-mono" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GPS Longitude</label>
                                <input type="text" value={newPubLng} onChange={(e) => setNewPubLng(e.target.value)} placeholder="e.g. -0.1278" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white font-mono" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Pub Photo</label>
                            <div className="flex items-center gap-4">
                                <label className={`flex-1 flex flex-col items-center justify-center px-4 py-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                                    newPubPhotoURL
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-700/50'
                                }`}>
                                    {uploading ? (
                                        <svg className="animate-spin mb-1 h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <span className="text-2xl mb-1">📸</span>
                                    )}
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                        {uploading ? 'Uploading Image...' : newPubPhotoURL ? 'Change Photo' : 'Upload or Take Photo'}
                                    </span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                                </label>
                                {newPubPhotoURL && (
                                    <div className="relative w-20 h-20 group">
                                        <img src={newPubPhotoURL} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-md border-2 border-white dark:border-gray-600" />
                                        <button type="button" onClick={() => setNewPubPhotoURL('')} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition">✕</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={savingPub} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-60 shadow-md">
                            {savingPub ? 'Saving...' : '🍻 Create Global Pub & Import'}
                        </button>
                        {pubError && <p className="text-sm text-red-500 text-center font-bold">{pubError}</p>}
                    </form>
                )}
            </div>
        </div>
    );
}
