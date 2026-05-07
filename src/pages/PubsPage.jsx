import React, { useState, useEffect } from 'react';
import ImageUploader from '../components/ImageUploader';
import { LiveGoogleStatus } from './PubsToVisitPage';
import { firebase } from '../firebase';

// ── Weather hook (fetch once for the page, share via props) ──────────────────
function useSingleWeather(lat, lng) {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lat || !lng) return;
        setLoading(true);
        (async () => {
            try {
                const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
                if (!apiKey) return;
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`);
                if (!res.ok) throw new Error('Weather API Error');
                const data = await res.json();
                if (data.main) setWeather({
                    temp: Math.round(data.main.temp),
                    condition: data.weather[0].main,
                    description: data.weather[0].description,
                    icon: data.weather[0].icon,
                });
            } catch (e) { console.error('Weather fetch error', e); }
            finally { setLoading(false); }
        })();
    }, [lat, lng]);

    return { weather, loading };
}

// ── Weather badge ────────────────────────────────────────────────────────────
function WeatherBadge({ weather, loading, tags = [], compact = false }) {
    if (loading) return (
        <div className={`text-xs text-gray-400 animate-pulse font-bold uppercase tracking-wider ${compact ? 'mb-3' : 'mt-2'}`}>
            Checking skies...
        </div>
    );
    if (!weather) return null;

    const hasBeerGarden = Array.isArray(tags) && tags.includes('🍺 Beer Garden');
    const isGoodWeather = weather.temp >= 15 && !['Rain', 'Snow', 'Thunderstorm', 'Drizzle'].includes(weather.condition);

    return (
        <div className={`flex flex-col gap-2 animate-fadeIn ${compact ? 'mb-3' : 'mt-4'}`}>
            {/* Temp badge — sky colours kept intentionally (weather context) */}
            <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/20 rounded-xl border border-sky-100 dark:border-sky-800 shadow-sm w-fit ${compact ? 'p-1 pr-3' : 'p-2 pr-5'}`}>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-0.5 shadow-sm border border-sky-50 dark:border-sky-700">
                    <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt={weather.condition} className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} drop-shadow-sm`} loading="lazy" />
                </div>
                <div>
                    <p className={`${compact ? 'text-sm' : 'text-lg'} font-black text-sky-900 dark:text-sky-100 leading-none`}>{weather.temp}°C</p>
                    {!compact && <p className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider mt-1">{weather.description}</p>}
                </div>
            </div>
            {hasBeerGarden && isGoodWeather && (
                <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 dark:from-amber-900/40 dark:to-yellow-900/30 dark:text-amber-400 rounded-xl border border-amber-300 dark:border-amber-700/50 font-black uppercase tracking-wider shadow-sm w-fit transform hover:scale-105 transition-transform ${compact ? 'px-2 py-1 text-[9px]' : 'px-4 py-2 text-xs'}`}>
                    <span className={`${compact ? 'text-sm' : 'text-xl'} filter drop-shadow-sm`}>☀️</span>
                    {compact ? 'Beer Garden Weather' : 'Prime Beer Garden Weather!'}
                </div>
            )}
        </div>
    );
}

// ── ReviewCard ───────────────────────────────────────────────────────────────
function ReviewCard({ score, currentUser = {}, groupRef, allUsers = {}, canDelete, onDelete, onReport, featureFlags }) {
    const [showComments, setShowComments] = useState(false);
    const [comments,     setComments]     = useState([]);
    const [newComment,   setNewComment]   = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasReacted = score.reactions?.includes(currentUser.uid);

    const handleToggleReaction = async () => {
        const scoreRef = groupRef.collection('scores').doc(score.id);
        try {
            if (hasReacted) await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
            else            await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
        } catch (e) { console.error('Error reacting', e); }
    };

    useEffect(() => {
        if (!showComments) return;
        const unsub = groupRef.collection('scores').doc(score.id).collection('comments')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [showComments, groupRef, score.id]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await groupRef.collection('scores').doc(score.id).collection('comments').add({
                text: newComment.trim(),
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setNewComment('');
        } catch (e) { alert('Failed to post comment: ' + e.message); }
        setIsSubmitting(false);
    };

    const getUserName = uid => allUsers[uid]?.displayName || allUsers[uid]?.email || uid;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 relative transition-all">
            <div className="absolute top-3 right-3 flex gap-2 items-center">
                {currentUser.uid !== score.userId && onReport && (
                    <button onClick={() => onReport('review', score)} className="text-sm opacity-30 hover:opacity-100 transition" title="Report Review">🚩</button>
                )}
                {canDelete && (
                    <button onClick={() => onDelete(score)} className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Delete</button>
                )}
            </div>
            <p className="font-bold text-amber-700 dark:text-amber-400 mb-1 text-sm pr-16">{score.userName}</p>
            <p className="text-gray-700 dark:text-gray-300 italic mb-1 pr-16">"{score.value}"</p>
            {(featureFlags?.enableReactions || featureFlags?.enableComments) && (
                <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {featureFlags?.enableReactions && (
                        <button
                            onClick={handleToggleReaction}
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                                hasReacted
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-400'
                            }`}
                        >
                            <span className={hasReacted ? 'scale-110 transition-transform' : ''}>🍻</span> {score.reactions?.length || 0}
                        </button>
                    )}
                    {featureFlags?.enableComments && (
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                                showComments
                                    ? 'bg-amber-600 text-white shadow-md'
                                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-400'
                            }`}
                        >
                            💬 {comments.length > 0 ? comments.length : 'Reply'}
                        </button>
                    )}
                </div>
            )}
            {showComments && featureFlags?.enableComments && (
                <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg animate-fadeIn border border-gray-100 dark:border-gray-700">
                    {comments.length === 0 ? (
                        <p className="text-xs text-gray-400 italic mb-2">No replies yet. Be the first!</p>
                    ) : (
                        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2">
                            {comments.map(c => (
                                <div key={c.id} className="text-sm bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm flex justify-between items-start gap-2">
                                    <div>
                                        <span className="font-black text-gray-700 dark:text-gray-300 mr-2">{getUserName(c.userId)}</span>
                                        <span className="text-gray-600 dark:text-gray-400">{c.text}</span>
                                    </div>
                                    {currentUser.uid !== c.userId && onReport && (
                                        <button onClick={() => onReport('comment', { id: c.id, value: c.text, scoreId: score.id })} className="text-xs opacity-30 hover:opacity-100 transition shrink-0 mt-0.5" title="Report Comment">🚩</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                        <input
                            type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <button type="submit" disabled={isSubmitting || !newComment.trim()} className="bg-amber-600 text-white px-3 py-1.5 rounded-md text-sm font-bold disabled:opacity-50 hover:bg-amber-700 transition">Post</button>
                    </form>
                </div>
            )}
        </div>
    );
}

// ── Tier label + dot colour ──────────────────────────────────────────────────
function getTier(avg, count) {
    if (count === 0) return { tierLabel: 'Unrated', color: 'bg-gray-400' };
    if (avg >= 8.5)  return { tierLabel: 'God Tier', color: 'bg-amber-600' };   // was purple-500
    if (avg >= 7.0)  return { tierLabel: 'Great',    color: 'bg-amber-400' };   // was blue-500
    if (avg >= 5.0)  return { tierLabel: 'Average',  color: 'bg-yellow-500' };
    return              { tierLabel: 'Avoid',    color: 'bg-red-500' };
}

// ── PubsPage ─────────────────────────────────────────────────────────────────
export default function PubsPage({
    pubs = [], criteria = [], scores = {},
    onSelectPub, onSelectPubForEdit,
    canManageGroup, pubsRef, allUsers = {},
    currentUser = {}, currentGroup = {},
    groupRef, featureFlags = {}, db,
}) {
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);
    const [searchTerm,  setSearchTerm]  = useState('');
    const [yesNoFilter, setYesNoFilter] = useState('');
    const [sortOption,  setSortOption]  = useState('highest');
    const [tagFilter,   setTagFilter]   = useState('');

    const firstPubWithCoords = pubs.find(p => p.lat && p.lng);
    const { weather: pageWeather, loading: weatherLoading } = useSingleWeather(
        firstPubWithCoords?.lat, firstPubWithCoords?.lng
    );

    const handleDeleteScore = async (score) => {
        if (!groupRef || !score?.id) return;
        if (!window.confirm('Are you sure you want to delete this rating?')) return;
        try { await groupRef.collection('scores').doc(score.id).delete(); }
        catch (e) { console.error('Error deleting score', e); }
    };

    const handleDeletePub = async (pubId) => {
        if (!pubsRef || !pubId) return;
        if (!window.confirm('Are you sure you want to delete this pub? This action cannot be undone.')) return;
        try {
            await pubsRef.doc(pubId).delete();
            if (db && currentGroup?.id) {
                await db.collection('groups').doc(currentGroup.id).update({
                    pubCount: firebase.firestore.FieldValue.increment(-1),
                });
            }
        } catch (e) { console.error('Error deleting pub', e); }
    };

    const handleReport = async (type, item) => {
        if (!db) return alert('Database connection error. Try refreshing the page.');
        if (!window.confirm(`Are you sure you want to report this ${type} to the moderation team?`)) return;
        try {
            await db.collection('reports').add({
                type, targetId: item.id,
                targetName: type === 'pub' ? item.name : (item.value || 'Written Review'),
                reportedBy: currentUser.uid, groupId: currentGroup.id,
                scoreId: item.scoreId || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolved: false,
            });
            alert('Report submitted successfully. Our team will review it shortly.');
        } catch (e) { alert('Failed to submit report.'); console.error(e); }
    };

    const canDeleteScore = (score, user, group) =>
        !!(user && group && (group.ownerUid === user.uid || group.managers?.includes(user.uid)));

    const getUserName = userId => {
        const u = allUsers[userId];
        return u ? (u.nickname || u.displayName || u.email) : 'Unknown User';
    };

    const yesNoCriteria = Array.isArray(criteria) ? criteria.filter(c => c.type === 'yes-no') : [];

    const enrichedPubs = Array.isArray(pubs) ? pubs.map(pub => {
        let totalScore = 0, count = 0;
        if (Array.isArray(criteria)) {
            criteria.filter(c => c.type === 'scale').forEach(c => {
                (scores[pub.id]?.[c.id] || []).forEach(s => {
                    if (s.value != null && !isNaN(s.value)) { totalScore += s.value; count++; }
                });
            });
        }
        const avg = count > 0 ? totalScore / count : 0;
        const { tierLabel, color } = getTier(avg, count);
        return { ...pub, avgScore: avg, tierLabel, color, ratingCount: count };
    }) : [];

    const filteredPubs = enrichedPubs.filter(pub => {
        if (!(pub.name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (tagFilter && (!Array.isArray(pub.tags) || !pub.tags.includes(tagFilter))) return false;
        if (yesNoFilter) {
            const criterionScores = scores[pub.id]?.[yesNoFilter] ?? [];
            return criterionScores.some(s => s.type === 'yes-no' && s.value === true);
        }
        return true;
    }).sort((a, b) => {
        if (sortOption === 'highest')        return (b.avgScore    || 0) - (a.avgScore    || 0);
        if (sortOption === 'google-highest') return (b.googleRating || 0) - (a.googleRating || 0);
        if (sortOption === 'lowest')         return (a.avgScore    || 0) - (b.avgScore    || 0);
        if (sortOption === 'alphabetical')   return (a.name || '').localeCompare(b.name || '');
        if (sortOption === 'newest')         return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        return 0;
    });

    // Build breakdown for selected pub detail modal
    let breakdown = null;
    if (selectedPubForDetail) {
        const b = {};
        const pubScores = scores[selectedPubForDetail.id] ?? {};
        if (Array.isArray(criteria)) {
            criteria.forEach(crit => {
                const criterionScores = pubScores[crit.id] ?? [];
                const mappedScores = criterionScores.map(s => ({
                    id: s.id, value: s.value, userId: s.userId,
                    userName: getUserName(s.userId), type: s.type,
                    criterionId: s.criterionId, reactions: s.reactions || [],
                }));
                const usable = criterionScores.filter(s => s.value != null);
                const sum = usable.reduce((acc, s) => {
                    if (s.type === 'scale')  return acc + s.value;
                    if (s.type === 'price')  return acc + s.value / 2;
                    return acc;
                }, 0);
                b[crit.id] = { name: crit.name, type: crit.type, scores: mappedScores, average: usable.length ? sum / usable.length : 0 };
            });
        }
        breakdown = b;
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Visited Pubs</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Every pint, properly documented.</p>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
                <input
                    type="text" placeholder="Search pubs by name..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none"
                />
                <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none cursor-pointer">
                    <option value="">🏷️ All Amenities</option>
                    <option value="🍺 Beer Garden">🍺 Beer Garden</option>
                    <option value="🐕 Dog Friendly">🐕 Dog Friendly</option>
                    <option value="🎱 Pool Table">🎱 Pool Table</option>
                    <option value="📺 Live Sports">📺 Live Sports</option>
                    <option value="🎵 Live Music">🎵 Live Music</option>
                    <option value="🍔 Food Served">🍔 Food Served</option>
                    <option value="🎯 Darts">🎯 Darts</option>
                    <option value="🍷 Cocktails">🍷 Cocktails</option>
                    <option value="🔥 Open Fire">🔥 Open Fire</option>
                </select>
                {yesNoCriteria.length > 0 && (
                    <select value={yesNoFilter} onChange={e => setYesNoFilter(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none cursor-pointer">
                        <option value="">✅ Filter by Rating</option>
                        {yesNoCriteria.map(c => <option key={c.id} value={c.id}>Has: {c.name}</option>)}
                    </select>
                )}
                <select value={sortOption} onChange={e => setSortOption(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none cursor-pointer">
                    <option value="highest">⭐ Highest Rated</option>
                    <option value="google-highest">🌟 Highest Google</option>
                    <option value="lowest">📉 Lowest Rated</option>
                    <option value="newest">🆕 Newest Added</option>
                    <option value="alphabetical">🔤 Alphabetical</option>
                </select>
            </div>

            {/* ── Pub card grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPubs.map(pub => (
                    <div key={pub.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col group relative">
                        {/* Pub image */}
                        <div className="h-48 relative bg-gray-200 dark:bg-gray-700 overflow-hidden cursor-pointer" onClick={() => setSelectedPubForDetail(pub)}>
                            {pub.photoURL ? (
                                <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
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

                        {/* Card body */}
                        <div className="p-5 flex flex-col flex-1 relative">
                            <button onClick={e => { e.stopPropagation(); handleReport('pub', pub); }} className="absolute top-4 right-4 text-lg opacity-20 hover:opacity-100 transition hover:scale-110" title="Report Pub Name">🚩</button>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1 pr-6 truncate">{pub.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">📍 {pub.location || 'Unknown Location'}</p>

                            {/* Tags — amber instead of blue */}
                            {Array.isArray(pub.tags) && pub.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {pub.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded font-bold whitespace-nowrap border border-amber-100 dark:border-amber-800">
                                            {tag}
                                        </span>
                                    ))}
                                    {pub.tags.length > 3 && (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded font-bold">+{pub.tags.length - 3}</span>
                                    )}
                                </div>
                            )}

                            <WeatherBadge weather={pageWeather} loading={weatherLoading} tags={pub.tags} compact />

                            {/* Score row */}
                            <div className="flex justify-between items-center mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 mt-auto">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Group Score</p>
                                    <p className="font-black text-2xl text-amber-700 dark:text-amber-400 leading-none">
                                        {pub.ratingCount > 0 ? pub.avgScore.toFixed(1) : '-'}
                                        <span className="text-sm text-gray-400 font-bold">/10</span>
                                    </p>
                                </div>
                                <div className="text-right border-l border-gray-200 dark:border-gray-600 pl-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Google</p>
                                    <p className="font-bold text-lg text-gray-700 dark:text-gray-300 leading-none">
                                        {pub.googleRating
                                            ? <span className="flex items-center gap-1 justify-end"><span className="text-yellow-500 text-sm">★</span> {pub.googleRating}</span>
                                            : <span className="text-sm text-gray-400 font-medium">N/A</span>
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={() => onSelectPub(pub)} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg transition">Rate</button>
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

            {/* ── Pub detail modal ── */}
            {selectedPubForDetail && breakdown && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setSelectedPubForDetail(null)} className="absolute top-4 right-4 text-gray-500 bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300 transition shadow-sm">✕</button>
                        <h2 className="text-3xl font-black mb-1 text-gray-800 dark:text-white pr-8">{selectedPubForDetail.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium flex items-center gap-2">📍 {selectedPubForDetail.location}</p>

                        {/* Tags in modal — amber */}
                        {Array.isArray(selectedPubForDetail.tags) && selectedPubForDetail.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedPubForDetail.tags.map(tag => (
                                    <span key={tag} className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 rounded-full font-bold border border-amber-100 dark:border-amber-800">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mb-6 flex flex-col sm:flex-row gap-3">
                            <LiveGoogleStatus pub={selectedPubForDetail} featureFlags={featureFlags} />
                            <WeatherBadge weather={pageWeather} loading={weatherLoading} tags={selectedPubForDetail.tags} />
                        </div>

                        {/* Overall rating banner — amber */}
                        <div className="flex items-center justify-between mb-8 p-6 bg-amber-600 rounded-xl text-white shadow-lg">
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
                                        } catch (e) { console.error('Error updating photo', e); }
                                    }}
                                    onPhotoRemoved={async () => {
                                        try {
                                            await pubsRef.doc(selectedPubForDetail.id).update({ photoURL: '' });
                                            setSelectedPubForDetail(prev => ({ ...prev, photoURL: '' }));
                                        } catch (e) { console.error('Error removing photo', e); }
                                    }}
                                />
                            </div>
                        )}

                        {/* Detailed breakdown */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white border-b-2 border-gray-100 dark:border-gray-700 pb-2">Detailed Breakdown</h3>
                            {Object.values(breakdown).map(data => (
                                <div key={data.name} className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">{data.name}</h4>
                                        {data.scores.length > 0 && (data.type === 'scale' || data.type === 'price') && (
                                            <span className="text-xl font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                                {data.average.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    {data.scores.length === 0 ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No ratings yet</p>
                                    ) : (
                                        <div className="mt-3">
                                            {data.type === 'text' ? (
                                                <div className="space-y-3">
                                                    {data.scores.map(s => (
                                                        <ReviewCard
                                                            key={s.id} score={s} currentUser={currentUser}
                                                            groupRef={groupRef} allUsers={allUsers}
                                                            canDelete={canDeleteScore(s, currentUser, currentGroup)}
                                                            onDelete={handleDeleteScore} onReport={handleReport}
                                                            featureFlags={featureFlags}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                                    {data.scores.map(s => {
                                                        const hasReacted = s.reactions?.includes(currentUser.uid);
                                                        return (
                                                            <div key={s.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all">
                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                    <div className="flex gap-2">
                                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{s.userName}:</span>
                                                                        <span>
                                                                            {data.type === 'yes-no'   ? (s.value ? '✅ Yes' : '❌ No')
                                                                           : data.type === 'currency' ? `£${parseFloat(s.value).toFixed(2)}`
                                                                           : s.value}
                                                                        </span>
                                                                    </div>
                                                                    {featureFlags?.enableReactions && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                const scoreRef = groupRef.collection('scores').doc(s.id);
                                                                                if (hasReacted) await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
                                                                                else            await scoreRef.update({ reactions: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
                                                                            }}
                                                                            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                                                                hasReacted
                                                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                                                                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-400'
                                                                            }`}
                                                                        >
                                                                            <span className={hasReacted ? 'scale-110 transition-transform' : ''}>🍻</span> {s.reactions?.length || 0}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {currentUser.uid !== s.userId && (
                                                                        <button onClick={() => handleReport('review', s)} className="text-xs opacity-30 hover:opacity-100 transition" title="Report this rating">🚩</button>
                                                                    )}
                                                                    {canDeleteScore(s, currentUser, currentGroup) && (
                                                                        <button className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition" onClick={() => handleDeleteScore(s)}>Delete</button>
                                                                    )}
                                                                </div>
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
