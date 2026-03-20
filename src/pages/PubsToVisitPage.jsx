import React, { useState } from 'react';
import ImageUploader from '../components/ImageUploader'; // <-- New Import

// IMPORTANT: We added `pubsRef` and `currentGroup` to the props here!
export default function PubsToVisitPage({ pubs, canManageGroup, onPromotePub, onSelectPubForEdit, allUsers, pubsRef, currentGroup }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("newest");
    const [editingPhotoId, setEditingPhotoId] = useState(null); // Tracks which card has the uploader open

    const getUserName = (userId) => {
        const u = allUsers && allUsers[userId];
        return u ? (u.nickname || u.displayName || u.email) : "Unknown User";
    };

    const filteredPubs = pubs.filter(pub => 
        pub.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (sortOption === "alphabetical") return a.name.localeCompare(b.name);
        if (sortOption === "newest") {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
        }
        return 0;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">The Hit List</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pubs we need to visit next.</p>
                </div>
            </div>
        
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 transition-colors duration-300">
                <input type="text" placeholder="Search the hit list..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" />
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold">
                    <option value="newest">🆕 Newest Added</option>
                    <option value="alphabetical">🔤 Alphabetical (A-Z)</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPubs.map((pub) => (
                    <div key={pub.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group relative">
                        
                        <div className="h-40 relative bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            {pub.photoURL ? (
                                <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl opacity-50 grayscale">🍻</div>
                            )}
                            <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-600">
                                Not Visited
                            </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1 truncate">{pub.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate flex items-center gap-1">📍 {pub.location || 'Unknown Location'}</p>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 mb-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Added by:</span> {pub.addedBy ? getUserName(pub.addedBy) : 'The Group'}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <a 
                                    href={pub.googleLink || `https://maps.google.com/?q=${pub.lat && pub.lng ? `${pub.lat},${pub.lng}` : encodeURIComponent(pub.name + ' ' + pub.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition text-center text-sm"
                                >
                                    🗺️ Map
                                </a>
                                
                                {canManageGroup && (
                                    <>
                                        {/* NEW: Camera Toggle Button */}
                                        <button onClick={() => setEditingPhotoId(editingPhotoId === pub.id ? null : pub.id)} className="px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition" title="Update Photo">📸</button>
                                        <button onClick={() => onSelectPubForEdit(pub)} className="px-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 font-bold rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition" title="Edit Pub">✏️</button>
                                        <button onClick={() => onPromotePub(pub.id)} className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-green-600 transition shadow-sm text-sm whitespace-nowrap">✅ Mark Visited</button>
                                    </>
                                )}
                            </div>

                            {/* --- NEW: INLINE IMAGE UPLOADER --- */}
                            {editingPhotoId === pub.id && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
                                    <ImageUploader 
                                        groupId={currentGroup?.id || 'unknown'}
                                        currentPhotoUrl={pub.photoURL}
                                        onPhotoUploaded={async (url) => {
                                            if (pubsRef) {
                                                try {
                                                    await pubsRef.doc(pub.id).update({ photoURL: url });
                                                    setEditingPhotoId(null);
                                                } catch (e) { console.error("Error updating photo:", e); }
                                            } else {
                                                alert("Error: pubsRef not passed to PubsToVisitPage in MainApp.jsx!");
                                            }
                                        }}
                                        onPhotoRemoved={async () => {
                                            if (pubsRef) {
                                                try { await pubsRef.doc(pub.id).update({ photoURL: "" }); } 
                                                catch (e) { console.error("Error removing photo:", e); }
                                            }
                                        }}
                                    />
                                    <button onClick={() => setEditingPhotoId(null)} className="w-full mt-3 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 font-bold">Close Uploader</button>
                                </div>
                            )}
                            {/* --- END UPLOADER --- */}
                        </div>
                    </div>
                ))}
            </div>

            {filteredPubs.length === 0 && (
                <div className="text-center py-16 px-4 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                    <span className="text-6xl mb-4 block">🍻</span>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Hit List Empty!</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        You have visited every pub on your wishlist, or no one has added any new ones yet. Time to click "Add Pub" and start planning the next night out!
                    </p>
                </div>
            )}
        </div>
    );
}