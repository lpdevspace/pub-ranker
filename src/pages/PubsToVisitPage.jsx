import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';
import ImageUploader from '../components/ImageUploader';

// --- NEW: GOOGLE PLACES API COMPONENT ---
export function LiveGoogleStatus({ pub }) {
    const [status, setStatus] = useState("loading"); 
    const [details, setDetails] = useState(null);

    useEffect(() => {
        // Gracefully hide if the Google Maps script isn't loaded yet
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            setStatus("unknown");
            return;
        }

        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        const request = {
            query: `${pub.name} ${pub.location || ''}`,
            fields: ['name', 'opening_hours', 'business_status', 'rating', 'user_ratings_total']
        };

        service.findPlaceFromQuery(request, (results, reqStatus) => {
            if (reqStatus === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                const place = results[0];
                if (place.business_status === 'CLOSED_TEMPORARILY' || place.business_status === 'CLOSED_PERMANENTLY') {
                    setStatus("permanently_closed");
                } else if (place.opening_hours) {
                    const isOpen = typeof place.opening_hours.isOpen === 'function' ? place.opening_hours.isOpen() : place.opening_hours.open_now;
                    setStatus(isOpen ? "open" : "closed");
                } else {
                    setStatus("no_hours");
                }
                setDetails(place);
            } else {
                setStatus("not_found");
            }
        });
    }, [pub.name, pub.location]);

    if (status === "loading") return <span className="text-xs text-gray-400 animate-pulse">Fetching live status...</span>;
    if (status === "unknown" || status === "not_found") return null;

    return (
        <div className="flex items-center gap-2 mt-3 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-600 inline-flex">
            {status === "open" && <span className="text-[10px] font-black bg-green-100 text-green-800 px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Open Now</span>}
            {status === "closed" && <span className="text-[10px] font-black bg-red-100 text-red-800 px-2 py-1 rounded-md uppercase tracking-wider">Closed</span>}
            {status === "no_hours" && <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider">Hours Unknown</span>}
            
            {details?.rating && (
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1 border-l border-gray-300 dark:border-gray-500 pl-2">
                    <span className="text-yellow-500 text-sm">★</span> {details.rating} <span className="text-[10px] font-normal opacity-70">({details.user_ratings_total})</span>
                </span>
            )}
        </div>
    );
}

export default function PubsToVisitPage({ pubs, canManageGroup, onPromotePub, onSelectPubForEdit, allUsers, pubsRef, currentGroup, currentUser }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("most-upvoted"); // NEW DEFAULT
    const [editingPhotoId, setEditingPhotoId] = useState(null);

    const getUserName = (userId) => {
        const u = allUsers && allUsers[userId];
        return u ? (u.nickname || u.displayName || u.email) : "Unknown User";
    };

    // --- NEW: UPVOTE LOGIC ---
    const handleToggleUpvote = async (pub) => {
        if (!pubsRef || !currentUser) return;
        const upvotes = pub.upvotes || [];
        const hasUpvoted = upvotes.includes(currentUser.uid);

        try {
            if (hasUpvoted) {
                await pubsRef.doc(pub.id).update({ upvotes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
            } else {
                await pubsRef.doc(pub.id).update({ upvotes: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
            }
        } catch (e) {
            console.error("Error upvoting", e);
        }
    };

    const filteredPubs = pubs.filter(pub => 
        pub.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (sortOption === "most-upvoted") {
            const votesA = a.upvotes?.length || 0;
            const votesB = b.upvotes?.length || 0;
            if (votesB !== votesA) return votesB - votesA;
            // Tie-breaker: newest
            return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        }
        if (sortOption === "alphabetical") return a.name.localeCompare(b.name);
        if (sortOption === "newest") return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        return 0;
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white transition-colors">The Hit List</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vote on the pubs we need to visit next.</p>
                </div>
            </div>
        
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 transition-colors duration-300">
                <input type="text" placeholder="Search the hit list..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" />
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold cursor-pointer">
                    <option value="most-upvoted">🔥 Most Upvoted</option>
                    <option value="newest">🆕 Newest Added</option>
                    <option value="alphabetical">🔤 Alphabetical (A-Z)</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPubs.map((pub) => {
                    const upvotes = pub.upvotes || [];
                    const hasUpvoted = currentUser && upvotes.includes(currentUser.uid);

                    return (
                        <div key={pub.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group relative">
                            
                            <div className="h-40 relative bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                {pub.photoURL ? (
                                    <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.style.display = "none"; }} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-50 grayscale">🍻</div>
                                )}
                                <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                                    Not Visited
                                </div>
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <h3 className="text-xl font-black text-gray-800 dark:text-white truncate leading-tight">{pub.name}</h3>
                                    
                                    {/* --- THE UPVOTE BUTTON --- */}
                                    <button 
                                        onClick={() => handleToggleUpvote(pub)} 
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition-all shadow-sm text-sm flex-shrink-0 ${hasUpvoted ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                                    >
                                        <span className={hasUpvoted ? 'scale-110 transform transition' : ''}>👍</span> {upvotes.length}
                                    </button>
                                </div>
                                
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate font-semibold mb-2">📍 {pub.location || 'Unknown Location'}</p>
                                
                                {/* NEW: STATIC GOOGLE RATING */}
                                {pub.googleRating && (
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-yellow-500 text-lg leading-none">★</span>
                                        <span className="font-black text-gray-700 dark:text-gray-200">{pub.googleRating}</span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">Google</span>
                                    </div>
                                )}

                                {/* LIVE GOOGLE STATUS INTEGRATION */}
                                <LiveGoogleStatus pub={pub} />
                                
                                <div className="mt-auto pt-4 mb-4">
                                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">
                                        Added by: <span className="text-gray-600 dark:text-gray-300">{pub.addedBy ? getUserName(pub.addedBy) : 'The Group'}</span>
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <a 
                                        href={pub.googleLink || `https://maps.google.com/?q=${pub.lat && pub.lng ? `${pub.lat},${pub.lng}` : encodeURIComponent(pub.name + ' ' + pub.location)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition text-center text-sm"
                                    >🗺️ Map</a>
                                    
                                    {canManageGroup && (
                                        <>
                                            <button onClick={() => setEditingPhotoId(editingPhotoId === pub.id ? null : pub.id)} className="px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition" title="Update Photo">📸</button>
                                            <button onClick={() => onSelectPubForEdit(pub)} className="px-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 font-bold rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition" title="Edit Pub">✏️</button>
                                            <button onClick={() => onPromotePub(pub.id)} className="flex-1 bg-green-500 text-white px-3 py-2 rounded-xl font-black hover:bg-green-600 transition shadow-sm text-sm whitespace-nowrap">✅ Visited</button>
                                        </>
                                    )}
                                </div>

                                {/* INLINE IMAGE UPLOADER */}
                                {editingPhotoId === pub.id && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
                                        <ImageUploader 
                                            groupId={currentGroup?.id || 'unknown'}
                                            currentPhotoUrl={pub.photoURL}
                                            onPhotoUploaded={async (url) => {
                                                if (pubsRef) {
                                                    try { await pubsRef.doc(pub.id).update({ photoURL: url }); setEditingPhotoId(null); } 
                                                    catch (e) { console.error("Error updating photo:", e); }
                                                }
                                            }}
                                            onPhotoRemoved={async () => {
                                                if (pubsRef) { try { await pubsRef.doc(pub.id).update({ photoURL: "" }); } catch (e) { console.error("Error removing photo:", e); } }
                                            }}
                                        />
                                        <button onClick={() => setEditingPhotoId(null)} className="w-full mt-3 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 font-bold">Close Uploader</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredPubs.length === 0 && (
                <div className="text-center py-16 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
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