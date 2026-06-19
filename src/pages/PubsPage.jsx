import React, { useState, useEffect, useMemo } from 'react';
import ImageUploader from '../components/ImageUploader';
import { LiveGoogleStatus } from './PubsToVisitPage';
import { firebase } from '../firebase';

// ── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(date) {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const AVATAR_COLORS = ['#b45309','#7c3aed','#0369a1','#047857','#dc2626','#c2410c','#4338ca','#0f766e'];
function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function barColor(v) {
    if (v >= 8) return 'var(--color-brand)';
    if (v >= 6) return 'color-mix(in srgb, var(--color-brand) 70%, #000)';
    if (v >= 4) return '#6b7280';
    return '#dc2626';
}

function scoreChipColor(v) {
    if (v >= 8) return { bg: 'var(--color-brand-subtle)', text: 'var(--color-brand)', border: 'var(--color-brand-border)' };
    if (v >= 6) return { bg: 'color-mix(in srgb, var(--color-brand) 15%, transparent)', text: 'color-mix(in srgb, var(--color-brand) 85%, transparent)', border: 'color-mix(in srgb, var(--color-brand) 30%, transparent)' };
    if (v >= 4) return { bg: '#6b728018', text: '#6b7280', border: '#6b728033' };
    return            { bg: '#dc262618', text: '#dc2626', border: '#dc262633' };
}

// ── Weather hook ─────────────────────────────────────────────────────────────
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

// ── WeatherBadge ─────────────────────────────────────────────────────────────
function WeatherBadge({ weather, loading, tags = [], compact = false }) {
    if (loading) return <div className={`text-xs text-gray-400 animate-pulse font-bold uppercase tracking-wider ${compact ? 'mb-3' : 'mt-2'}`}>Checking skies...</div>;
    if (!weather) return null;
    const hasBeerGarden = Array.isArray(tags) && tags.includes('🍺 Beer Garden');
    const isGoodWeather = weather.temp >= 15 && !['Rain','Snow','Thunderstorm','Drizzle'].includes(weather.condition);
    return (
        <div className={`flex flex-col gap-2 animate-fadeIn ${compact ? 'mb-3' : 'mt-4'}`}>
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

// ── ReviewCard ────────────────────────────────────────────────────────────────
function ReviewCard({ score, currentUser = {}, groupRef, allUsers = {}, canDelete, onDelete, onReport, featureFlags }) {
    const [showComments, setShowComments] = useState(false);
    const [comments,     setComments]     = useState([]);
    const [newComment,   setNewComment]   = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hasReacted = score.reactions?.includes(currentUser.uid);
    const color = avatarColor(score.userName);

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
                text: newComment.trim(), userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setNewComment('');
        } catch (e) { alert('Failed to post comment: ' + e.message); }
        setIsSubmitting(false);
    };

    const getUserName = uid => allUsers[uid]?.displayName || allUsers[uid]?.email || uid;

    return (
        <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
            {/* header row */}
            <div className="flex items-center gap-3 p-3 px-4 border-b border-divider">
                <div 
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm"
                    style={{
                        background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                        boxShadow: `0 2px 6px ${color}44`,
                    }}
                >
                    <span className="text-[10px] font-black text-white">{initials(score.userName)}</span>
                </div>
                <div className="flex-1">
                    <p className="font-bold text-text text-sm leading-none">{score.userName}</p>
                    {score.createdAt && <p className="text-[11px] text-text-faint mt-0.5">{relativeTime(score.createdAt)}</p>}
                </div>
                <div className="flex gap-2 items-center">
                    {currentUser.uid !== score.userId && onReport && (
                        <button 
                            onClick={() => onReport('review', score)} 
                            className="text-sm opacity-30 hover:opacity-100 bg-none border-none cursor-pointer p-1 transition-opacity" 
                            title="Report Review"
                        >
                            🚩
                        </button>
                    )}
                    {canDelete && (
                        <button 
                            onClick={() => onDelete(score)} 
                            className="text-[10px] text-red-600 font-bold uppercase tracking-wider bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 rounded-md px-2 py-1 cursor-pointer transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
            {/* quote */}
            <div className="p-3 px-4">
                <p className="text-sm text-text-muted italic border-l-3 border-brand pl-3 m-0">"{score.value}"</p>
            </div>
            {/* reactions + comments */}
            {(featureFlags?.enableReactions || featureFlags?.enableComments) && (
                <div className="flex gap-2 px-4 pb-3 flex-wrap">
                    {featureFlags?.enableReactions && (
                        <button 
                            onClick={handleToggleReaction} 
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer border transition-all ${
                                hasReacted 
                                    ? 'bg-brand-subtle border-brand-border text-brand' 
                                    : 'bg-surface-offset border-border text-text-muted hover:bg-surface-2'
                            }`}
                        >
                            <span className={`inline-block transition-transform duration-150 ${hasReacted ? 'scale-110' : 'scale-100'}`}>🍻</span> {score.reactions?.length || 0}
                        </button>
                    )}
                    {featureFlags?.enableComments && (
                        <button 
                            onClick={() => setShowComments(!showComments)} 
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer border transition-all ${
                                showComments 
                                    ? 'bg-brand border-brand text-white' 
                                    : 'bg-surface-offset border-border text-text-muted hover:bg-surface-2'
                            }`}
                        >
                            💬 {comments.length > 0 ? comments.length : 'Reply'}
                        </button>
                    )}
                </div>
            )}
            {showComments && featureFlags?.enableComments && (
                <div className="mx-4 mb-4 bg-surface-offset rounded-lg p-3 border border-divider">
                    {comments.length === 0
                        ? <p className="text-xs text-text-faint italic mb-2">No replies yet. Be the first!</p>
                        : <div className="flex flex-col gap-2 mb-3 max-h-[160px] overflow-y-auto pr-1 scroll-x-clean">
                            {comments.map(c => (
                                <div key={c.id} className="bg-surface border border-border rounded-md p-2 px-3 text-xs flex justify-between gap-2">
                                    <span>
                                        <span className="font-bold text-text">{getUserName(c.userId)}</span>{' '}
                                        <span className="text-text-muted">{c.text}</span>
                                    </span>
                                    {currentUser.uid !== c.userId && onReport && (
                                        <button 
                                            onClick={() => onReport('comment', { id: c.id, value: c.text, scoreId: score.id })} 
                                            className="text-xs opacity-30 hover:opacity-100 bg-none border-none cursor-pointer flex-shrink-0 transition-opacity"
                                        >
                                            🚩
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    }
                    <form onSubmit={handleAddComment} className="flex gap-2">
                        <input 
                            type="text" 
                            value={newComment} 
                            onChange={e => setNewComment(e.target.value)} 
                            placeholder="Write a reply..." 
                            className="flex-1 px-3 py-1.5 text-xs border border-border rounded-md bg-surface text-text outline-none focus:ring-1 focus:ring-brand focus:border-brand" 
                        />
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !newComment.trim()} 
                            className={`bg-brand text-white border-none rounded-md px-3.5 py-1.5 font-bold text-xs cursor-pointer transition-opacity ${
                                (!newComment.trim() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:opacity-90'
                            }`}
                        >
                            Post
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

// ── Tier ─────────────────────────────────────────────────────────────────────
function getTier(avg, count) {
    if (count === 0) return { tierLabel: 'Unrated', color: 'bg-gray-400' };
    if (avg >= 8.5)  return { tierLabel: 'God Tier', color: 'bg-brand' };
    if (avg >= 7.0)  return { tierLabel: 'Great',    color: 'bg-brand-light' };
    if (avg >= 5.0)  return { tierLabel: 'Average',  color: 'bg-yellow-500' };
    return              { tierLabel: 'Avoid',    color: 'bg-red-500' };
}

// ── CriteriaBar ───────────────────────────────────────────────────────────────
function CriteriaBar({ name, average, scores: scoreList, type, allUsers, currentUser, groupRef, onDelete, onReport, canDelete, featureFlags }) {
    const [animated, setAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t); }, []);

    if (type === 'text') {
        return (
            <div>
                <p className="font-bold text-sm text-text mb-3">{name}</p>
                {scoreList.length === 0
                    ? <p className="text-xs text-text-faint italic">No reviews yet</p>
                    : <div className="flex flex-col gap-3">
                        {scoreList.map(s => (
                            <ReviewCard key={s.id} score={s} currentUser={currentUser} groupRef={groupRef} allUsers={allUsers}
                                canDelete={canDelete(s)} onDelete={onDelete} onReport={onReport} featureFlags={featureFlags} />
                        ))}
                    </div>
                }
            </div>
        );
    }

    const pct = type === 'scale' || type === 'price' ? Math.min((average / 10) * 100, 100) : 0;
    const color = barColor(average);

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-sm text-text">{name}</p>
                {(type === 'scale' || type === 'price') && scoreList.length > 0 && (
                    <span className="font-black text-base tabular-nums" style={{ color }}>{average.toFixed(1)}</span>
                )}
            </div>

            {/* fill bar */}
            {(type === 'scale' || type === 'price') && (
                <div className="h-2 bg-surface-offset rounded-full overflow-hidden mb-2">
                    <div 
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                            background: `linear-gradient(90deg, ${color}cc, ${color})`,
                            width: animated ? `${pct}%` : '0%',
                            transition: 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            boxShadow: `0 0 8px ${color}66`,
                        }} 
                    />
                </div>
            )}

            {/* score distribution pills */}
            {scoreList.length > 0 && (type === 'scale' || type === 'price' || type === 'yes-no' || type === 'currency') && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {scoreList.map((s, i) => {
                        const displayVal = type === 'yes-no' ? (s.value ? '✅' : '❌') : type === 'currency' ? `£${parseFloat(s.value).toFixed(2)}` : s.value;
                        const sc = (type === 'scale' || type === 'price') ? scoreChipColor(s.value) : { bg: 'var(--color-surface-offset)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };
                        const uname = allUsers[s.userId]?.nickname || allUsers[s.userId]?.displayName || 'Unknown';
                        return (
                            <span 
                                key={i} 
                                title={uname} 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full cursor-default border transition-all animate-fadeIn"
                                style={{
                                    backgroundColor: sc.bg, 
                                    borderColor: sc.border, 
                                    color: sc.text,
                                }}
                            >
                                <span className="text-[9px] opacity-70 font-normal">{initials(uname)}</span>
                                <span className="tabular-nums">{displayVal}</span>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── MemberStrip ───────────────────────────────────────────────────────────────
function MemberStrip({ raterIds, allUsers }) {
    if (!raterIds || raterIds.length === 0) return null;
    const MAX_SHOW = 7;
    const shown = raterIds.slice(0, MAX_SHOW);
    const extra = raterIds.length - MAX_SHOW;
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Rated by</p>
            <div className="flex -space-x-1.5">
                {shown.map((uid, i) => {
                    const name = allUsers[uid]?.nickname || allUsers[uid]?.displayName || 'User';
                    const color = avatarColor(name);
                    return (
                        <div 
                            key={uid} 
                            title={name} 
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-surface relative shadow-sm"
                            style={{
                                background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                                zIndex: shown.length - i,
                            }}
                        >
                            <span className="text-[9px] font-black text-white">{initials(name)}</span>
                        </div>
                    );
                })}
                {extra > 0 && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-offset border-2 border-surface relative z-0 shadow-sm">
                        <span className="text-[9px] font-black text-text-muted">+{extra}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── PubDetailModal ────────────────────────────────────────────────────────────
function PubDetailModal({ pub, breakdown, allUsers, currentUser, currentGroup, groupRef, pubsRef, featureFlags, pageWeather, weatherLoading, onClose, canManageGroup, db }) {

    const [deals, setDeals] = useState([]);
    const [loadingDeals, setLoadingDeals] = useState(false);
    const [claimedDealId, setClaimedDealId] = useState(null);

    useEffect(() => {
        if (!db || !pub?.id) return;
        setLoadingDeals(true);
        db.collection('deals')
            .where('pubId', '==', pub.id)
            .where('active', '==', true)
            .get()
            .then(snap => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const now = new Date();
                const activeList = list.filter(d => {
                    if (d.expiresAt && typeof d.expiresAt.toDate === 'function') {
                        return d.expiresAt.toDate() > now;
                    }
                    return true;
                });
                setDeals(activeList);
            })
            .catch(err => {
                console.error('Failed to load deals for pub:', err);
            })
            .finally(() => {
                setLoadingDeals(false);
            });
    }, [db, pub?.id]);

    const userCheckinCount = useMemo(() => {
        if (!currentUser?.uid || !breakdown) return 0;
        const scoreIds = new Set();
        Object.values(breakdown).forEach(critData => {
            if (Array.isArray(critData.scores)) {
                critData.scores.forEach(s => {
                    if (s.userId === currentUser.uid) {
                        if (s.id) scoreIds.add(s.id);
                        else if (s.createdAt) scoreIds.add(s.createdAt.seconds || s.createdAt);
                        else scoreIds.add(JSON.stringify(s));
                    }
                });
            }
        });
        return scoreIds.size;
    }, [breakdown, currentUser?.uid]);

    const handleDeleteScore = async (score) => {
        if (!groupRef || !score?.id) return;
        if (!window.confirm('Delete this rating?')) return;
        try { await groupRef.collection('scores').doc(score.id).delete(); }
        catch (e) { console.error(e); }
    };

    const handleReport = async (type, item) => {
        if (!window.confirm(`Report this ${type}?`)) return;
        // handled in parent; kept as no-op here since parent passes its own handleReport
    };

    const canDeleteScore = (s) => !!(currentUser && currentGroup && (currentGroup.ownerUid === currentUser.uid || currentGroup.managers?.includes(currentUser.uid)));

    // collect unique rater UIDs across all criteria
    const raterIds = useMemo(() => {
        const set = new Set();
        Object.values(breakdown).forEach(d => d.scores.forEach(s => set.add(s.userId)));
        return [...set];
    }, [breakdown]);

    const mapsUrl = pub.googlePlaceId
        ? `https://www.google.com/maps/place/?q=place_id:${pub.googlePlaceId}`
        : `https://www.google.com/maps/search/${encodeURIComponent(`${pub.name} ${pub.location || ''}`)}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="bg-surface rounded-xl shadow-lg w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-border relative scroll-x-clean">

                {/* ── hero banner ── */}
                <div className="relative h-[200px] bg-surface-offset rounded-t-xl overflow-hidden flex-shrink-0">
                    {pub.photoURL
                        ? <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-8xl bg-surface-offset">🍺</div>
                    }
                    {/* gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    {/* close button */}
                    <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 text-base flex items-center justify-center font-bold cursor-pointer backdrop-blur-xs transition-colors border-none">✕</button>
                    {/* tier badge */}
                    {pub.ratingCount > 0 && (
                        <div 
                            className="absolute top-3 left-3 text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md"
                            style={{ background: pub.avgScore >= 8.5 ? 'var(--color-brand)' : pub.avgScore >= 7 ? 'color-mix(in srgb, var(--color-brand) 75%, #000)' : pub.avgScore >= 5 ? '#6b7280' : '#dc2626' }}
                        >
                            {pub.tierLabel}
                        </div>
                    )}
                    {/* pub name + location over gradient */}
                    <div className="absolute bottom-0 inset-x-0 p-4">
                        <h2 className="text-xl font-black text-white leading-tight font-display drop-shadow-md m-0">{pub.name}</h2>
                        {pub.location && <p className="text-xs text-white/80 mt-0.5">📍 {pub.location}</p>}
                    </div>
                </div>

                {/* ── body ── */}
                <div className="p-5 md:p-6 flex flex-col gap-5">

                    {/* tags */}
                    {Array.isArray(pub.tags) && pub.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {pub.tags.map(tag => (
                                <span key={tag} className="text-xs bg-brand-subtle text-brand border border-brand-border px-2.5 py-0.5 rounded-full font-bold">{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* score + google stat block */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* group score */}
                        <div className="bg-surface-2 border border-border rounded-xl p-4 text-center">
                            <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Group Score</p>
                            <p 
                                className="text-4xl md:text-5xl font-black tabular-nums leading-none font-display mt-1 mb-0"
                                style={{ color: barColor(pub.avgScore) }}
                            >
                                {pub.ratingCount > 0 ? pub.avgScore.toFixed(1) : '—'}
                            </p>
                            <p className="text-[11px] text-text-faint mt-0.5">{pub.ratingCount} rating{pub.ratingCount !== 1 ? 's' : ''}</p>
                        </div>
                        {/* google score */}
                        <div className="bg-surface-2 border border-border rounded-xl p-4 text-center">
                            <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Google Rating</p>
                            <p className="text-4xl md:text-5xl font-black text-text tabular-nums leading-none font-display mt-1 mb-0">
                                {pub.googleRating ? <span className="flex items-center justify-center gap-1"><span className="text-yellow-500 text-2xl md:text-3xl">★</span>{pub.googleRating}</span> : '—'}
                            </p>
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand font-bold hover:underline mt-1 block no-underline">View on Maps ↗</a>
                        </div>
                    </div>

                    {/* weather + live status */}
                    <div className="flex flex-wrap gap-3 items-start">
                        <LiveGoogleStatus pub={pub} featureFlags={featureFlags} />
                        <WeatherBadge weather={pageWeather} loading={weatherLoading} tags={pub.tags} />
                    </div>

                    {/* member strip */}
                    <MemberStrip raterIds={raterIds} allUsers={allUsers} />

                    {/* Active Deals & Exclusive Promotions */}
                    {deals.length > 0 && (
                        <div className="bg-surface-2 border border-border rounded-xl p-4">
                            <p className="font-extrabold text-[10px] text-text-muted uppercase tracking-wider mb-3">🎁 Active Deals & Promotions</p>
                            <div className="flex flex-col gap-3">
                                {deals.map(deal => {
                                    const isEligible = userCheckinCount >= (deal.minCheckinsRequired || 0);
                                    const isClaimed = claimedDealId === deal.id;
                                    return (
                                        <div key={deal.id} className="flex flex-col gap-2 p-3 bg-surface border border-divider rounded-lg">
                                            <div className="flex justify-between items-center flex-wrap gap-2">
                                                <span className="font-extrabold text-sm text-text">{deal.title}</span>
                                                {deal.minCheckinsRequired > 0 && (
                                                    <span className="text-[10px] bg-brand-subtle text-brand px-2 py-0.5 rounded-full font-bold">
                                                        🔑 {deal.minCheckinsRequired}+ Check-ins Required ({userCheckinCount} check-in{userCheckinCount !== 1 ? 's' : ''})
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted m-0">{deal.description}</p>
                                            
                                            {isClaimed ? (
                                                <div className="bg-brand-subtle border border-dashed border-brand rounded-md p-2.5 text-center mt-1">
                                                    <p className="text-[10px] font-extrabold text-brand uppercase m-0">Redemption Code</p>
                                                    <p className="text-base font-black text-text tracking-widest my-0.5">{deal.code}</p>
                                                    <p className="text-[9px] text-text-muted m-0">Show this screen to bartender to redeem.</p>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        if (!isEligible) return;
                                                        try {
                                                            await db.collection('deals').doc(deal.id).update({
                                                                claimedCount: firebase.firestore.FieldValue.increment(1)
                                                             });
                                                            setClaimedDealId(deal.id);
                                                        } catch (e) {
                                                            console.error(e);
                                                        }
                                                    }}
                                                    disabled={!isEligible}
                                                    className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-opacity self-start mt-1 border-none text-white ${
                                                        isEligible ? 'bg-brand cursor-pointer hover:opacity-90' : 'bg-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {isEligible ? 'Claim Offer' : 'Not Eligible'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* photo uploader (managers only) */}
                    {canManageGroup && (
                        <div className="bg-surface-2 border border-border rounded-xl p-4">
                            <p className="font-bold text-sm text-text mb-3">Pub Photo</p>
                            <ImageUploader
                                groupId={currentGroup?.id}
                                currentPhotoUrl={pub.photoURL}
                                onPhotoUploaded={async (url) => {
                                    try { await pubsRef.doc(pub.id).update({ photoURL: url }); }
                                    catch (e) { console.error(e); }
                                }}
                                onPhotoRemoved={async () => {
                                    try { await pubsRef.doc(pub.id).update({ photoURL: '' }); }
                                    catch (e) { console.error(e); }
                                }}
                            />
                        </div>
                    )}

                    {/* criteria breakdown */}
                    <div>
                        <h3 className="text-base font-black text-text mb-4 pb-3 border-b border-divider">Detailed Breakdown</h3>
                        <div className="flex flex-col gap-5">
                            {Object.values(breakdown).map(data => (
                                <CriteriaBar
                                    key={data.name}
                                    name={data.name} average={data.average} scores={data.scores} type={data.type}
                                    allUsers={allUsers} currentUser={currentUser} groupRef={groupRef}
                                    onDelete={handleDeleteScore} onReport={handleReport}
                                    canDelete={canDeleteScore} featureFlags={featureFlags}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── PubsPage ──────────────────────────────────────────────────────────────────
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
    const { weather: pageWeather, loading: weatherLoading } = useSingleWeather(firstPubWithCoords?.lat, firstPubWithCoords?.lng);

    const handleDeletePub = async (pubId) => {
        if (!pubsRef || !pubId) return;
        if (!window.confirm('Delete this pub? This cannot be undone.')) return;
        try {
            await pubsRef.doc(pubId).delete();
            if (db && currentGroup?.id) await db.collection('groups').doc(currentGroup.id).update({ pubCount: firebase.firestore.FieldValue.increment(-1) });
        } catch (e) { console.error(e); }
    };

    const handleReport = async (type, item) => {
        if (!db) return alert('Database connection error.');
        if (!window.confirm(`Report this ${type} to the moderation team?`)) return;
        try {
            await db.collection('reports').add({
                type, targetId: item.id,
                targetName: type === 'pub' ? item.name : (item.value || 'Written Review'),
                reportedBy: currentUser.uid, groupId: currentGroup.id,
                scoreId: item.scoreId || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolved: false,
            });
            alert('Report submitted successfully.');
        } catch (e) { alert('Failed to submit report.'); console.error(e); }
    };

    const getUserName = userId => {
        const u = allUsers[userId];
        return u ? (u.nickname || u.displayName || u.email) : 'Unknown User';
    };

    const yesNoCriteria = Array.isArray(criteria) ? criteria.filter(c => c.type === 'yes-no') : [];

    const enrichedPubs = useMemo(() => Array.isArray(pubs) ? pubs.map(pub => {
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
    }) : [], [pubs, criteria, scores]);

    const filteredPubs = useMemo(() => enrichedPubs.filter(pub => {
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
    }), [enrichedPubs, searchTerm, tagFilter, yesNoFilter, sortOption, scores]);

    // Build breakdown for selected pub
    const breakdown = useMemo(() => {
        if (!selectedPubForDetail) return null;
        const b = {};
        const pubScores = scores[selectedPubForDetail.id] ?? {};
        if (Array.isArray(criteria)) {
            criteria.forEach(crit => {
                const criterionScores = pubScores[crit.id] ?? [];
                const mappedScores = criterionScores.map(s => ({
                    id: s.id, value: s.value, userId: s.userId,
                    userName: getUserName(s.userId), type: s.type,
                    criterionId: s.criterionId, reactions: s.reactions || [],
                    createdAt: s.createdAt,
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
        return b;
    }, [selectedPubForDetail, scores, criteria, allUsers]);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Visited Pubs</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Every pint, properly documented.</p>
                </div>
            </div>

            {/* filter bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
                <input type="text" placeholder="Search pubs by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white outline-none" />
                <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none cursor-pointer">
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
                    <select value={yesNoFilter} onChange={e => setYesNoFilter(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none cursor-pointer">
                        <option value="">✅ Filter by Rating</option>
                        {yesNoCriteria.map(c => <option key={c.id} value={c.id}>Has: {c.name}</option>)}
                    </select>
                )}
                <select value={sortOption} onChange={e => setSortOption(e.target.value)} className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none cursor-pointer">
                    <option value="highest">⭐ Highest Rated</option>
                    <option value="google-highest">🌟 Highest Google</option>
                    <option value="lowest">📉 Lowest Rated</option>
                    <option value="newest">🆕 Newest Added</option>
                    <option value="alphabetical">🔤 Alphabetical</option>
                </select>
            </div>

            {/* pub card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPubs.map(pub => (
                    <div key={pub.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col group relative">
                        <div className="h-48 relative bg-gray-200 dark:bg-gray-700 overflow-hidden cursor-pointer" onClick={() => setSelectedPubForDetail(pub)}>
                            {pub.photoURL
                                ? <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                                : <div className="w-full h-full flex items-center justify-center text-5xl">🍺</div>
                            }
                            {pub.ratingCount > 0 && (
                                <div className={`absolute top-3 right-3 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg ${pub.color}`}>{pub.tierLabel}</div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-900 font-bold px-4 py-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg">View Full Reviews</span>
                            </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1 relative">
                            <button onClick={e => { e.stopPropagation(); handleReport('pub', pub); }} className="absolute top-4 right-4 text-lg opacity-20 hover:opacity-100 transition hover:scale-110" title="Report Pub Name">🚩</button>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1 pr-6 truncate">{pub.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">📍 {pub.location || 'Unknown Location'}</p>
                            {Array.isArray(pub.tags) && pub.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {pub.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[10px] bg-brand-subtle text-brand px-2 py-0.5 rounded font-bold whitespace-nowrap border border-brand-border">{tag}</span>
                                    ))}
                                    {pub.tags.length > 3 && <span className="text-[10px] bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded font-bold">+{pub.tags.length - 3}</span>}
                                </div>
                            )}
                            <WeatherBadge weather={pageWeather} loading={weatherLoading} tags={pub.tags} compact />
                            <div className="flex justify-between items-center mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 mt-auto">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Group Score</p>
                                    <p className="font-black text-2xl text-brand leading-none">
                                        {pub.ratingCount > 0 ? pub.avgScore.toFixed(1) : '-'}<span className="text-sm text-gray-400 font-bold">/10</span>
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
                            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={() => onSelectPub(pub)} className="flex-1 bg-brand hover:bg-brand-hover text-white font-bold py-2 rounded-lg transition">Rate</button>
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
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">No pubs match your search criteria.</div>
            )}

            {/* detail modal */}
            {selectedPubForDetail && breakdown && (
                <PubDetailModal
                    pub={selectedPubForDetail}
                    breakdown={breakdown}
                    allUsers={allUsers}
                    currentUser={currentUser}
                    currentGroup={currentGroup}
                    groupRef={groupRef}
                    pubsRef={pubsRef}
                    featureFlags={featureFlags}
                    pageWeather={pageWeather}
                    weatherLoading={weatherLoading}
                    canManageGroup={canManageGroup}
                    db={db}
                    onClose={() => setSelectedPubForDetail(null)}
                />
            )}
        </div>
    );
}
