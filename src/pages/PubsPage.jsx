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
    if (v >= 8) return '#b45309';
    if (v >= 6) return '#d97706';
    if (v >= 4) return '#6b7280';
    return '#dc2626';
}

function scoreChipColor(v) {
    if (v >= 8) return { bg: '#b4530918', text: '#b45309', border: '#b4530933' };
    if (v >= 6) return { bg: '#d9770618', text: '#d97706', border: '#d9770633' };
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
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            {/* header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-divider)' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 2px 6px ${color}44`,
                }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#fff' }}>{initials(score.userName)}</span>
                </div>
                <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)', lineHeight: 1 }}>{score.userName}</p>
                    {score.createdAt && <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '2px' }}>{relativeTime(score.createdAt)}</p>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    {currentUser.uid !== score.userId && onReport && (
                        <button onClick={() => onReport('review', score)} style={{ fontSize: '14px', opacity: 0.3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title="Report Review" onMouseEnter={e => e.target.style.opacity=1} onMouseLeave={e => e.target.style.opacity=0.3}>🚩</button>
                    )}
                    {canDelete && (
                        <button onClick={() => onDelete(score)} style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#dc262610', border: '1px solid #dc262630', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer' }}>Delete</button>
                    )}
                </div>
            </div>
            {/* quote */}
            <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic', borderLeft: '3px solid var(--color-brand)', paddingLeft: 'var(--space-3)', margin: 0 }}>"{score.value}"</p>
            </div>
            {/* reactions + comments */}
            {(featureFlags?.enableReactions || featureFlags?.enableComments) && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '0 var(--space-4) var(--space-3)', flexWrap: 'wrap' }}>
                    {featureFlags?.enableReactions && (
                        <button onClick={handleToggleReaction} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                            background: hasReacted ? '#b4530920' : 'var(--color-surface-offset)', border: hasReacted ? '1px solid #b4530940' : '1px solid var(--color-border)',
                            color: hasReacted ? '#b45309' : 'var(--color-text-muted)',
                        }}>
                            <span style={{ transform: hasReacted ? 'scale(1.1)' : 'scale(1)', transition: 'transform 150ms' }}>🍻</span> {score.reactions?.length || 0}
                        </button>
                    )}
                    {featureFlags?.enableComments && (
                        <button onClick={() => setShowComments(!showComments)} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                            background: showComments ? 'var(--color-brand)' : 'var(--color-surface-offset)', border: showComments ? '1px solid var(--color-brand)' : '1px solid var(--color-border)',
                            color: showComments ? '#fff' : 'var(--color-text-muted)',
                        }}>
                            💬 {comments.length > 0 ? comments.length : 'Reply'}
                        </button>
                    )}
                </div>
            )}
            {showComments && featureFlags?.enableComments && (
                <div style={{ margin: '0 var(--space-4) var(--space-4)', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', border: '1px solid var(--color-divider)' }}>
                    {comments.length === 0
                        ? <p style={{ fontSize: '12px', color: 'var(--color-text-faint)', fontStyle: 'italic', marginBottom: 'var(--space-2)' }}>No replies yet. Be the first!</p>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', maxHeight: '160px', overflowY: 'auto' }}>
                            {comments.map(c => (
                                <div key={c.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                                    <span><span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{getUserName(c.userId)}</span> <span style={{ color: 'var(--color-text-muted)' }}>{c.text}</span></span>
                                    {currentUser.uid !== c.userId && onReport && (
                                        <button onClick={() => onReport('comment', { id: c.id, value: c.text, scoreId: score.id })} style={{ fontSize: '12px', opacity: 0.3, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={e => e.target.style.opacity=1} onMouseLeave={e => e.target.style.opacity=0.3}>🚩</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    }
                    <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a reply..." style={{ flex: 1, padding: '6px 12px', fontSize: '13px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }} />
                        <button type="submit" disabled={isSubmitting || !newComment.trim()} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: (!newComment.trim() || isSubmitting) ? 0.5 : 1 }}>Post</button>
                    </form>
                </div>
            )}
        </div>
    );
}

// ── Tier ─────────────────────────────────────────────────────────────────────
function getTier(avg, count) {
    if (count === 0) return { tierLabel: 'Unrated', color: 'bg-gray-400' };
    if (avg >= 8.5)  return { tierLabel: 'God Tier', color: 'bg-amber-600' };
    if (avg >= 7.0)  return { tierLabel: 'Great',    color: 'bg-amber-400' };
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
                <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>{name}</p>
                {scoreList.length === 0
                    ? <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic' }}>No reviews yet</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{name}</p>
                {(type === 'scale' || type === 'price') && scoreList.length > 0 && (
                    <span style={{ fontWeight: 900, fontSize: 'var(--text-base)', color, fontVariantNumeric: 'tabular-nums' }}>{average.toFixed(1)}</span>
                )}
            </div>

            {/* fill bar */}
            {(type === 'scale' || type === 'price') && (
                <div style={{ height: '8px', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 'var(--space-2)' }}>
                    <div style={{
                        height: '100%', borderRadius: 'var(--radius-full)',
                        background: `linear-gradient(90deg, ${color}cc, ${color})`,
                        width: animated ? `${pct}%` : '0%',
                        transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                        boxShadow: `0 0 8px ${color}66`,
                    }} />
                </div>
            )}

            {/* score distribution pills */}
            {scoreList.length > 0 && (type === 'scale' || type === 'price' || type === 'yes-no' || type === 'currency') && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
                    {scoreList.map((s, i) => {
                        const displayVal = type === 'yes-no' ? (s.value ? '✅' : '❌') : type === 'currency' ? `£${parseFloat(s.value).toFixed(2)}` : s.value;
                        const sc = (type === 'scale' || type === 'price') ? scoreChipColor(s.value) : { bg: 'var(--color-surface-offset)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };
                        const uname = allUsers[s.userId]?.nickname || allUsers[s.userId]?.displayName || 'Unknown';
                        return (
                            <span key={i} title={uname} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                fontSize: '11px', fontWeight: 700,
                                padding: '2px 8px', borderRadius: 'var(--radius-full)', cursor: 'default',
                            }}>
                                <span style={{ fontSize: '9px', opacity: 0.7, fontWeight: 500 }}>{initials(uname)}</span>
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{displayVal}</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rated by</p>
            <div style={{ display: 'flex', gap: '0' }}>
                {shown.map((uid, i) => {
                    const name = allUsers[uid]?.nickname || allUsers[uid]?.displayName || 'User';
                    const color = avatarColor(name);
                    return (
                        <div key={uid} title={name} style={{
                            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                            background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--color-surface)',
                            marginLeft: i === 0 ? 0 : '-6px',
                            zIndex: shown.length - i,
                            position: 'relative',
                        }}>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>{initials(name)}</span>
                        </div>
                    );
                })}
                {extra > 0 && (
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'var(--color-surface-offset)', border: '2px solid var(--color-surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginLeft: '-6px', position: 'relative',
                    }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--color-text-muted)' }}>+{extra}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── PubDetailModal ────────────────────────────────────────────────────────────
function PubDetailModal({ pub, breakdown, allUsers, currentUser, currentGroup, groupRef, pubsRef, featureFlags, pageWeather, weatherLoading, onClose, canManageGroup }) {

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
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', overflowY: 'auto', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--color-border)', position: 'relative' }}>

                {/* ── hero banner ── */}
                <div style={{ position: 'relative', height: '200px', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', overflow: 'hidden', flexShrink: 0 }}>
                    {pub.photoURL
                        ? <img src={pub.photoURL} alt={pub.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🍺</div>
                    }
                    {/* gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
                    {/* close button */}
                    <button onClick={onClose} style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, backdropFilter: 'blur(4px)' }}>✕</button>
                    {/* tier badge */}
                    {pub.ratingCount > 0 && (
                        <div style={{ position: 'absolute', top: 'var(--space-3)', left: 'var(--space-3)', background: pub.avgScore >= 8.5 ? '#b45309' : pub.avgScore >= 7 ? '#d97706' : pub.avgScore >= 5 ? '#6b7280' : '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 'var(--radius-full)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                            {pub.tierLabel}
                        </div>
                    )}
                    {/* pub name + location over gradient */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'var(--space-4)' }}>
                        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: '#fff', lineHeight: 1.2, fontFamily: 'var(--font-display)', textShadow: '0 1px 4px rgba(0,0,0,0.5)', margin: 0 }}>{pub.name}</h2>
                        {pub.location && <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>📍 {pub.location}</p>}
                    </div>
                </div>

                {/* ── body ── */}
                <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

                    {/* tags */}
                    {Array.isArray(pub.tags) && pub.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            {pub.tags.map(tag => (
                                <span key={tag} style={{ fontSize: 'var(--text-xs)', background: '#b4530912', color: '#b45309', border: '1px solid #b4530930', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* score + google stat block */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        {/* group score */}
                        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', textAlign: 'center' }}>
                            <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Group Score</p>
                            <p style={{ fontSize: '2.8rem', fontWeight: 900, color: barColor(pub.avgScore), fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontFamily: 'var(--font-display)', margin: '4px 0 0' }}>
                                {pub.ratingCount > 0 ? pub.avgScore.toFixed(1) : '—'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '2px' }}>{pub.ratingCount} rating{pub.ratingCount !== 1 ? 's' : ''}</p>
                        </div>
                        {/* google score */}
                        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', textAlign: 'center' }}>
                            <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Google Rating</p>
                            <p style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontFamily: 'var(--font-display)', margin: '4px 0 0' }}>
                                {pub.googleRating ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><span style={{ color: '#f59e0b', fontSize: '1.4rem' }}>★</span>{pub.googleRating}</span> : '—'}
                            </p>
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--color-brand)', fontWeight: 700, textDecoration: 'none', marginTop: '4px', display: 'block' }}>View on Maps ↗</a>
                        </div>
                    </div>

                    {/* weather + live status */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                        <LiveGoogleStatus pub={pub} featureFlags={featureFlags} />
                        <WeatherBadge weather={pageWeather} loading={weatherLoading} tags={pub.tags} />
                    </div>

                    {/* member strip */}
                    <MemberStrip raterIds={raterIds} allUsers={allUsers} />

                    {/* photo uploader (managers only) */}
                    {canManageGroup && (
                        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)' }}>
                            <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>Pub Photo</p>
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
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-divider)' }}>Detailed Breakdown</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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
                    className="flex-1 min-w-[200px] px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none" />
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
                                        <span key={tag} className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded font-bold whitespace-nowrap border border-amber-100 dark:border-amber-800">{tag}</span>
                                    ))}
                                    {pub.tags.length > 3 && <span className="text-[10px] bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded font-bold">+{pub.tags.length - 3}</span>}
                                </div>
                            )}
                            <WeatherBadge weather={pageWeather} loading={weatherLoading} tags={pub.tags} compact />
                            <div className="flex justify-between items-center mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 mt-auto">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Group Score</p>
                                    <p className="font-black text-2xl text-amber-700 dark:text-amber-400 leading-none">
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
                    onClose={() => setSelectedPubForDetail(null)}
                />
            )}
        </div>
    );
}
