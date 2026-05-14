import React, { useState, useEffect, useMemo } from 'react';
import { getUserDisplayName, getUserAvatar } from '../utils/users';

/* ── helpers ─────────────────────────────────────────────────────────── */
function relativeTime(date) {
    if (!date) return 'Just now';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function scoreColor(v) {
    if (v >= 8) return { bg: '#b4530918', text: '#b45309', border: '#b4530933' };
    if (v >= 6) return { bg: '#d9770618', text: '#d97706', border: '#d9770633' };
    if (v >= 4) return { bg: '#6b728018', text: '#6b7280', border: '#6b728033' };
    return            { bg: '#dc262618', text: '#dc2626', border: '#dc262633' };
}

function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#b45309','#7c3aed','#0369a1','#047857','#dc2626','#c2410c','#4338ca','#0f766e'];
function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ── skeleton card ───────────────────────────────────────────────────── */
const shimmerStyle = {
    background: 'linear-gradient(90deg, var(--color-surface-offset) 25%, var(--color-surface-dynamic) 50%, var(--color-surface-offset) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
    borderRadius: 'var(--radius-sm)',
};
function SkeletonCard() {
    return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)' }}>
                <div style={{ ...shimmerStyle, width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ ...shimmerStyle, height: '12px', width: '40%' }} />
                    <div style={{ ...shimmerStyle, height: '10px', width: '60%' }} />
                </div>
                <div style={{ ...shimmerStyle, width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
            </div>
            <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {[70, 90, 80].map((w, i) => <div key={i} style={{ ...shimmerStyle, height: '26px', width: `${w}px`, borderRadius: 'var(--radius-full)' }} />)}
            </div>
        </div>
    );
}

/* ── live stats bar ──────────────────────────────────────────────────── */
function StatsBar({ activities }) {
    const stats = useMemo(() => {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        let todayRatings = 0, highestScore = null;
        const activeSet = new Set();
        activities.forEach(a => {
            const d = a.timestamp?.toDate ? a.timestamp.toDate() : null;
            const isToday = d && d >= todayStart;
            a.ratings.forEach(r => {
                if (r.type !== 'scale' || r.value == null) return;
                if (isToday) { todayRatings++; activeSet.add(a.userId); }
                if (highestScore === null || r.value > highestScore) highestScore = r.value;
            });
        });
        return { todayRatings, activeMembers: activeSet.size, highestScore };
    }, [activities]);

    const items = [
        { icon: '📊', label: 'Ratings today', value: stats.todayRatings },
        { icon: '👥', label: 'Active today',  value: stats.activeMembers },
        { icon: '⭐', label: 'Highest score', value: stats.highestScore !== null ? `${stats.highestScore}/10` : '—' },
    ];

    return (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {items.map(({ icon, label, value }) => (
                <div key={label} style={{
                    flex: '1 1 120px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-3) var(--space-4)',
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{icon}</span>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>{label}</p>
                        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-brand)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── top score hero ──────────────────────────────────────────────────── */
function TopScoreHero({ activities, pubs, allUsers }) {
    const top = useMemo(() => {
        let best = null;
        activities.forEach(a => {
            a.ratings.forEach(r => {
                if (r.type === 'scale' && r.value != null && (!best || r.value > best.score))
                    best = { score: r.value, pubId: a.pubId, userId: a.userId, timestamp: a.timestamp };
            });
        });
        return best;
    }, [activities]);

    if (!top || top.score < 8) return null;
    const pub  = pubs.find(p => p.id === top.pubId);
    const name = getUserDisplayName(top.userId, allUsers);

    return (
        <div style={{
            background: 'linear-gradient(135deg, #b45309ee, #d97706dd)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4) var(--space-5)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            boxShadow: '0 8px 24px #b4530933',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', right: '-2rem', top: '-2rem', width: '8rem', height: '8rem', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            <div style={{ fontSize: '2.5rem', lineHeight: 1, flexShrink: 0 }}>🏆</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top score in the feed</p>
                <p style={{ fontSize: 'var(--text-base)', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pub?.name || 'Unknown Pub'}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)' }}>by {name} · {relativeTime(top.timestamp)}</p>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{top.score}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>/ 10</p>
            </div>
        </div>
    );
}

/* ── activity card ───────────────────────────────────────────────────── */
function ActivityCard({ activity, pub, displayName, avatarUrl, criteria, index }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), index * 60); return () => clearTimeout(t); }, [index]);

    const scaleRatings = activity.ratings.filter(r => r.type === 'scale' && r.value != null);
    const overallAvg   = scaleRatings.length > 0 ? scaleRatings.reduce((a, b) => a + b.value, 0) / scaleRatings.length : null;
    const color        = avatarColor(displayName);
    const time         = relativeTime(activity.timestamp);
    const getCritName  = cid => criteria?.find(c => c.id === cid)?.name || 'Score';

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)' }}>
                {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                    : (
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                            background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 2px 6px ${color}44`,
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}>{initials(displayName)}</span>
                        </div>
                    )
                }

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>rated <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{pub.name}</span> · {time}</p>
                </div>

                {/* overall avg pill */}
                {overallAvg !== null && (() => {
                    const sc = scoreColor(overallAvg);
                    return (
                        <div style={{
                            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            background: sc.bg, border: `1.5px solid ${sc.border}`,
                            borderRadius: 'var(--radius-lg)', padding: 'var(--space-1) var(--space-3)',
                            minWidth: '3.5rem',
                        }}>
                            <span style={{ fontSize: '1.3rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: sc.text, lineHeight: 1, fontFamily: 'var(--font-display)' }}>{overallAvg.toFixed(1)}</span>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>avg</span>
                        </div>
                    );
                })()}

                {/* pub photo or fallback */}
                {pub.photoURL
                    ? <img src={pub.photoURL} alt={pub.name} style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} loading="lazy" />
                    : <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border)', fontSize: '1.4rem' }}>🍺</div>
                }
            </div>

            {/* score chips */}
            {scaleRatings.length > 0 && (
                <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', borderBottom: activity.textReview ? '1px solid var(--color-divider)' : 'none' }}>
                    {scaleRatings.map((r, i) => {
                        const sc = scoreColor(r.value);
                        return (
                            <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                background: sc.bg, border: `1px solid ${sc.border}`,
                                color: sc.text, fontSize: 'var(--text-xs)', fontWeight: 700,
                                padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)',
                            }}>
                                <span style={{ fontWeight: 500, opacity: 0.85 }}>{getCritName(r.criterionId)}</span>
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 900 }}>{r.value}</span>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* text review */}
            {activity.textReview && (
                <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)' }}>
                    <p style={{
                        fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)',
                        fontStyle: 'italic',
                        borderLeft: '3px solid var(--color-brand)',
                        paddingLeft: 'var(--space-3)',
                        margin: 0,
                    }}>"{activity.textReview}"</p>
                </div>
            )}
        </div>
    );
}

/* ── main ────────────────────────────────────────────────────────────── */
export default function TaproomPage({ db, groupId, pubs, allUsers, criteria }) {
    const [activities, setActivities] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [filter,     setFilter]     = useState('all');

    useEffect(() => {
        if (!db || !groupId) return;
        const unsubscribe = db.collectionGroup('scores')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .onSnapshot(snap => {
                const recentScores = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const grouped = {};
                recentScores.forEach(score => {
                    const timeKey = score.createdAt ? Math.floor(score.createdAt.toMillis() / 60000) : 'now';
                    const key = `${score.userId}_${score.pubId}_${timeKey}`;
                    if (!grouped[key]) grouped[key] = { id: key, userId: score.userId, pubId: score.pubId, timestamp: score.createdAt, ratings: [], textReview: null };
                    if (score.type === 'text' && score.value) grouped[key].textReview = score.value;
                    else grouped[key].ratings.push(score);
                });
                setActivities(Object.values(grouped).sort((a, b) => {
                    const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
                    const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
                    return tB - tA;
                }));
                setLoading(false);
            }, err => { console.error('Taproom error:', err); setLoading(false); });
        return () => unsubscribe();
    }, [db, groupId]);

    const safePubs     = pubs     || [];
    const safeUsers    = allUsers || {};
    const safeCriteria = criteria || [];
    const getPub       = pid => safePubs.find(p => p.id === pid) || { name: 'Unknown Pub', photoURL: '' };

    const filteredActivities = useMemo(() => {
        if (filter === 'reviews') return activities.filter(a => a.textReview);
        if (filter === 'tens')    return activities.filter(a => a.ratings.some(r => r.type === 'scale' && r.value === 10));
        return activities;
    }, [activities, filter]);

    const FILTERS = [{ id: 'all', label: 'All' }, { id: 'reviews', label: '💬 Reviews' }, { id: 'tens', label: '🔟 Perfect 10s' }];

    return (
        <>
            <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>

            <div style={{ maxWidth: '42rem', margin: '0 auto' }} className="space-y-6 animate-fadeIn pb-20">

                <div>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>🍺 The Taproom</h2>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Live activity and recent ratings from the group.</p>
                </div>

                {!loading && activities.length > 0 && <StatsBar activities={activities} />}
                {!loading && activities.length > 0 && <TopScoreHero activities={activities} pubs={safePubs} allUsers={safeUsers} />}

                {/* filter tabs */}
                {!loading && activities.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => (
                            <button key={f.id} onClick={() => setFilter(f.id)} style={{
                                padding: 'var(--space-1) var(--space-4)',
                                borderRadius: 'var(--radius-full)',
                                border: filter === f.id ? '2px solid var(--color-brand)' : '1.5px solid var(--color-border)',
                                background: filter === f.id ? 'var(--color-brand)' : 'var(--color-surface)',
                                color: filter === f.id ? '#fff' : 'var(--color-text-muted)',
                                fontFamily: 'var(--font-body)', fontWeight: 700,
                                fontSize: 'var(--text-xs)', cursor: 'pointer',
                                transition: 'all 180ms ease',
                            }}>{f.label}</button>
                        ))}
                    </div>
                )}

                {/* content */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                        {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-12) var(--space-8)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-3)' }}>
                            {filter === 'reviews' ? '💬' : filter === 'tens' ? '🔟' : '🦗'}
                        </span>
                        <p style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                            {filter === 'reviews' ? 'No written reviews yet — add one when rating a pub!' :
                             filter === 'tens'    ? 'No perfect 10s yet. Is any pub truly worthy?' :
                                                   'It\'s quiet in here. Go rate some pubs!'}
                        </p>
                        {filter !== 'all' && (
                            <button onClick={() => setFilter('all')} style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>Show all activity</button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                        {filteredActivities.map((activity, i) => (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                pub={getPub(activity.pubId)}
                                displayName={getUserDisplayName(activity.userId, safeUsers)}
                                avatarUrl={getUserAvatar(activity.userId, safeUsers)}
                                criteria={safeCriteria}
                                index={i}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
