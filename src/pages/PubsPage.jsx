import React, { useState, useEffect } from 'react';
import ImageUploader from '../components/ImageUploader';
import { LiveGoogleStatus } from './PubsToVisitPage'; 
import { firebase } from '../firebase'; // Need this for database arrays and timestamps

// --- NEW COMPONENT: INDIVIDUAL REVIEW CARD (WITH SOCIAL FEATURES) ---
function ReviewCard({ score, currentUser, groupRef, allUsers, canDelete, onDelete, featureFlags }) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if the current user is in the reactions array
    const hasReacted = score.reactions?.includes(currentUser.uid);

    // 1. CHEERS (REACTION) LOGIC
    const handleToggleReaction = async () => {
        const scoreRef = groupRef.collection("scores").doc(score.id);
        try {
            if (hasReacted) {
                await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
            } else {
                await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
            }
        } catch (e) { console.error("Error reacting", e); }
    };

    // 2. LIVE FETCH COMMENTS
    useEffect(() => {
        if (!showComments) return;
        const unsubscribe = groupRef.collection("scores").doc(score.id).collection("comments")
            .orderBy("createdAt", "asc")
            .onSnapshot(snap => {
                setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        return () => unsubscribe();
    }, [showComments, groupRef, score.id]);

// 3. POST NEW COMMENT
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await groupRef.collection("scores").doc(score.id).collection("comments").add({
                text: newComment.trim(),
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setNewComment(""); // Clears the box on success!
        } catch (e) { 
            console.error("Error adding comment", e); 
            alert("Failed to post comment: " + e.message); // <-- ADD THIS ALERT
        }
        setIsSubmitting(false);
    };

    const getUserName = (uid) => allUsers[uid]?.displayName || allUsers[uid]?.email || uid;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 relative transition-all">
            <p className="font-bold text-brand mb-1 text-sm">{score.userName}</p>
            <p className="text-gray-700 dark:text-gray-300 italic mb-1">"{score.value}"</p>

            {/* --- FEATURE FLAGS IN ACTION --- */}
            {(featureFlags?.enableReactions || featureFlags?.enableComments) && (
                <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    
                    {featureFlags?.enableReactions && (
                        <button onClick={handleToggleReaction} className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${hasReacted ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-400'}`}>
                            <span className={hasReacted ? 'scale-110 transition-transform' : ''}>🍻</span>
                            {score.reactions?.length || 0}
                        </button>
                    )}

                    {featureFlags?.enableComments && (
                        <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${showComments ? 'bg-brand text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-400'}`}>
                            💬 {comments.length > 0 ? comments.length : 'Reply'}
                        </button>
                    )}

                </div>
            )}

            {/* COMMENTS THREAD DROPDOWN */}
            {showComments && featureFlags?.enableComments && (
                <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg animate-fadeIn border border-gray-100 dark:border-gray-700">
                    {comments.length === 0 ? (
                        <p className="text-xs text-gray-400 italic mb-2">No replies yet. Be the first!</p>
                    ) : (
                        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2">
                            {comments.map(c => (
                                <div key={c.id} className="text-sm bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm">
                                    <span className="font-black text-gray-700 dark:text-gray-300 mr-2">{getUserName(c.userId)}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{c.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a reply..." className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand outline-none" />
                        <button type="submit" disabled={isSubmitting || !newComment.trim()} className="bg-brand text-white px-3 py-1.5 rounded-md text-sm font-bold disabled:opacity-50 hover:opacity-80 transition">Post</button>
                    </form>
                </div>
            )}

            {canDelete && (
                <button onClick={() => onDelete(score)} className="absolute top-3 right-3 text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider">Delete</button>
            )}
        </div>
    );
}

// --- MAIN PAGE ---
export default function PubsPage({ pubs, criteria, scores, onSelectPub, onSelectPubForEdit, canManageGroup, pubsRef, allUsers, currentUser, currentGroup, groupRef, featureFlags }) {
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [yesNoFilter, setYesNoFilter] = useState("");
    const [sortOption, setSortOption] = useState("highest");

    const handleDeleteScore = async (score) => {
        if (!groupRef || !score?.id) return;
        if (!window.confirm("Are you sure you want to delete this rating?")) return;
        try { await groupRef.collection("scores").doc(score.id).delete(); } 
        catch (e) { console.error("Error deleting score", e); }
    };

    const handleDeletePub = async (pubId) => {
        if (!pubsRef || !pubId) return;
        if (!window.confirm("Are you sure you want to delete this pub? This action cannot be undone.")) return;
        try { await pubsRef.doc(pubId).delete(); } 
        catch (e) { console.error("Error deleting pub", e); }
    };

    function canDeleteScore(score, user, currentGroup) {
        if (!user || !currentGroup) return false;
        return currentGroup.ownerUid === user.uid || currentGroup.managers?.includes(user.uid);
    }

    const getUserName = (userId) => {
        const u = allUsers[userId];
        return u ? (u.nickname || u.displayName || u.email) : "Unknown User";
    };

    const yesNoCriteria = criteria.filter((c) => c.type === "yes-no");

    const enrichedPubs = pubs.map(pub => {
        let totalScore = 0; let count = 0;
        criteria.filter(c => c.type === 'scale').forEach(c => {
            const cScores = scores[pub.id]?.[c.id] || [];
            cScores.forEach(s => { if (s.value != null && !isNaN(s.value)) { totalScore += s.value; count++; } });
        });
        const avg = count > 0 ? (totalScore / count) : 0; 
        
        let tierLabel = 'Unrated', color = 'bg-gray-400';
        if (count > 0) {
            if (avg >= 8.5) { tierLabel = 'God Tier'; color = 'bg-purple-500'; }
            else if (avg >= 7.0) { tierLabel = 'Great'; color = 'bg-blue-500'; }
            else if (avg >= 5.0) { tierLabel = 'Average'; color = 'bg-yellow-500'; }
            else { tierLabel = 'Avoid'; color = 'bg-red-500'; }
        }
        return { ...pub, avgScore: avg, tierLabel, color, ratingCount: count };
    });

    const filteredPubs = enrichedPubs.filter((pub) => {
        if (!pub.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (yesNoFilter) {
            const pubScores = scores[pub.id] ?? {};
            const criterionScores = pubScores[yesNoFilter] ?? [];
            return criterionScores.some(s => s.type === 'yes-no' && s.value === true);
        }
        return true;
    }).sort((a, b) => {
        if (sortOption === "highest") return b.avgScore - a.avgScore;
        if (sortOption === "google-highest") return (b.googleRating || 0) - (a.googleRating || 0);
        if (sortOption === "lowest") return a.avgScore - b.avgScore;
        if (sortOption === "alphabetical") return a.name.localeCompare(b.name);
        if (sortOption === "newest") return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        return 0;
    });

    let breakdown = null;
    if (selectedPubForDetail) {
        const pub = selectedPubForDetail;
        const b = {};
        const pubScores = scores[pub.id] ?? {};
        
        criteria.forEach((crit) => {
            const criterionScores = pubScores[crit.id] ?? [];
            const mappedScores = criterionScores.map((s) => ({
                id: s.id, value: s.value, userId: s.userId, userName: getUserName(s.userId), type: s.type, criterionId: s.criterionId,
                reactions: s.reactions || [] // <-- MAP THE REACTIONS FROM DB
            }));

            if (criterionScores.length === 0) {
                b[crit.id] = { name: crit.name, type: crit.type, scores: [], average: 0 };
            } else {
                const usable = criterionScores.filter((s) => s.value != null);
                const sum = usable.reduce((acc, s) => {
                    if (s.type === "scale") return acc + s.value;
                    if (s.type === "price") return acc + s.value / 2;
                    return acc;
                }, 0);
                b[crit.id] = { name: crit.name, type: crit.type, scores: mappedScores, average: usable.length ? sum / usable.length : 0 };
            }
        });
        breakdown = b;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Visited Pubs</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Every pint, properly documented.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 transition-colors duration-300">
                <input type="text" placeholder="Search pubs by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white outline-none" />
                
                {yesNoCriteria.length > 0 && (
                    <select value={yesNoFilter} onChange={(e) => setYesNoFilter(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold min-w-[200px] outline-none cursor-pointer">
                        <option value="">Filter: All Pubs</option>
                        {yesNoCriteria.map((c) => <option key={c.id} value={c.id}>Must have: {c.name}</option>)}
                    </select>
                )}
                
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none cursor-pointer">
                    <option value="highest">⭐ Highest Rated (Group)</option>
                    <option value="google-highest">🌟 Highest Rated (Google)</option>
                    <option value="lowest">📉 Lowest Rated</option>
                    <option value="newest">🆕 Newest Added</option>
                    <option value="alphabetical">🔤 Alphabetical (A-Z)</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPubs.map((pub) => (
                    <div key={pub.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col group relative">
                        <div className="h-48 relative bg-gray-200 dark:bg-gray-700 overflow-hidden cursor-pointer" onClick={() => setSelectedPubForDetail(pub)}>
                            {pub.photoURL ? (
                                <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl">🍺</div>
                            )}
                            
                            {pub.ratingCount > 0 && (
                                <div className={`absolute top-3 right-3 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg ${pub.color}`}>
                                    {pub.tierLabel}
                                </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-900 font-bold px-4 py-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg">
                                    View Full Reviews
                                </span>
                            </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1 truncate">{pub.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">📍 {pub.location || 'Unknown Location'}</p>
                            
                            <div className="flex justify-between items-center mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Group Score</p>
                                    <p className="font-black text-2xl text-brand leading-none">
                                        {pub.ratingCount > 0 ? pub.avgScore.toFixed(1) : '-'}
                                        <span className="text-sm text-gray-400 font-bold">/10</span>
                                    </p>
                                </div>
                                <div className="text-right border-l border-gray-200 dark:border-gray-600 pl-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Google</p>
                                    <p className="font-bold text-lg text-gray-700 dark:text-gray-300 leading-none">
                                        {pub.googleRating ? (
                                            <span className="flex items-center gap-1 justify-end">
                                                <span className="text-yellow-500 text-sm">★</span> {pub.googleRating}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400 font-medium">N/A</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={() => onSelectPub(pub)} className="flex-1 bg-brand text-white font-bold py-2 rounded-lg hover:opacity-80 transition">Rate</button>
                                {canManageGroup && (
                                    <>
                                        <button onClick={() => onSelectPubForEdit(pub)} className="px-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 font-bold rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition" title="Edit Pub">✏️</button>
                                        <button onClick={() => handleDeletePub(pub.id)} className="px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition" title="Delete Pub">🗑️</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPubs.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No pubs match your search criteria.
                </div>
            )}

            {/* DETAILED MODAL */}
            {selectedPubForDetail && breakdown && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto transition-opacity duration-300 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative transition-colors duration-300 border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setSelectedPubForDetail(null)} className="absolute top-4 right-4 text-gray-500 bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300 transition shadow-sm">✕</button>

                        <h2 className="text-3xl font-black mb-1 text-gray-800 dark:text-white">{selectedPubForDetail.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium flex items-center gap-2">📍 {selectedPubForDetail.location}</p>

                        <div className="mb-6"><LiveGoogleStatus pub={selectedPubForDetail} /></div>
            
                        <div className="flex items-center justify-between mb-8 p-6 bg-brand rounded-xl text-white shadow-lg">
                            <div>
                                <p className="text-sm uppercase font-bold tracking-wider mb-1 opacity-80">Overall Rating</p>
                                <p className="text-5xl font-black">{selectedPubForDetail.avgScore.toFixed(1)}<span className="text-2xl opacity-70">/10</span></p>
                            </div>
                            <div className="text-6xl opacity-50 drop-shadow-md">🍻</div>
                        </div>

                        {canManageGroup && (
                            <div className="mb-8 bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Pub Photo</h3>
                                <ImageUploader 
                                    groupId={currentGroup?.id}
                                    currentPhotoUrl={selectedPubForDetail.photoURL}
                                    onPhotoUploaded={async (url) => {
                                        try {
                                            await pubsRef.doc(selectedPubForDetail.id).update({ photoURL: url });
                                            setSelectedPubForDetail(prev => ({ ...prev, photoURL: url }));
                                        } catch (e) { console.error("Error updating photo", e); }
                                    }}
                                    onPhotoRemoved={async () => {
                                        try {
                                            await pubsRef.doc(selectedPubForDetail.id).update({ photoURL: "" });
                                            setSelectedPubForDetail(prev => ({ ...prev, photoURL: "" }));
                                        } catch (e) { console.error("Error removing photo", e); }
                                    }}
                                />
                            </div>
                        )}
                
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white border-b-2 border-gray-100 dark:border-gray-700 pb-2">Detailed Breakdown</h3>
                            
                            {Object.values(breakdown).map((data) => (
                                <div key={data.name} className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">{data.name}</h4>
                                        {data.scores.length > 0 && (data.type === 'scale' || data.type === 'price') && (
                                            <span className="text-xl font-black text-brand bg-brand/10 px-3 py-1 rounded-full">
                                                {data.average.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                        
                                    {data.scores.length === 0 ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No ratings yet</p>
                                    ) : (
                                        <div className="mt-3">
                                            {data.type === "text" ? (
                                                <div className="space-y-3">
                                                    {data.scores.map((s) => (
                                                        <ReviewCard 
                                                            key={s.id} 
                                                            score={s} 
                                                            currentUser={currentUser} 
                                                            groupRef={groupRef} 
                                                            allUsers={allUsers} 
                                                            canDelete={canDeleteScore(s, currentUser, currentGroup)} 
                                                            onDelete={handleDeleteScore}
                                                            featureFlags={featureFlags} 
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                                    {data.scores.map((s) => {
                                                        const hasReacted = s.reactions?.includes(currentUser.uid);
                                                        return (
                                                            <div key={s.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm transition-all hover:shadow-md">
                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                    <div className="flex gap-2">
                                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{s.userName}:</span>
                                                                        <span>
                                                                            {data.type === "yes-no" ? s.value ? "✅ Yes" : "❌ No" : data.type === "currency" ? `£${parseFloat(s.value).toFixed(2)}` : s.value}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* SIMPLIFIED REACTION FOR NON-TEXT SCORES */}
                                                                    {featureFlags?.enableReactions && (
                                                                        <button 
                                                                            onClick={async () => {
                                                                                const scoreRef = groupRef.collection("scores").doc(s.id);
                                                                                if (hasReacted) await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
                                                                                else await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
                                                                            }}
                                                                            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${hasReacted ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-400'}`}
                                                                        >
                                                                            <span className={hasReacted ? 'scale-110 transition-transform' : ''}>🍻</span> {s.reactions?.length || 0}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {canDeleteScore(s, currentUser, currentGroup) && (
                                                                    <button className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition" onClick={() => handleDeleteScore(s)}>Delete</button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}