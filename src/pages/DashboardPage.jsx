import React, { useState, useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const scoreTierLabel = (score) => {
    if (score >= 8.5) return { label: 'Legendary', color: 'var(--color-primary)' };
    if (score >= 7)   return { label: 'Great',     color: 'var(--color-gold, #b07a00)' };
    if (score >= 5)   return { label: 'Decent',    color: 'var(--color-warning)' };
    return             { label: 'Avoid',            color: 'var(--color-error)' };
};

const MEDAL = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

/* ─── badge definitions ──────────────────────────────────────────────────────── */

const BADGE_DEFS = [
    { id: 'first_pint',       emoji: '\uD83C\uDF7A', label: 'First Pint',       desc: 'Someone in the group submitted their very first rating.',            check: ({ totalRatings }) => totalRatings >= 1 },
    { id: 'the_regulars',     emoji: '\uD83D\uDC65', label: 'The Regulars',     desc: 'Group has 5 or more members.',                                       check: ({ memberCount }) => memberCount >= 5 },
    { id: 'pub_scholar',      emoji: '\uD83C\uDF93', label: 'Pub Scholar',      desc: 'Group has rated 10 pubs.',                                           check: ({ visitedCount }) => visitedCount >= 10 },
    { id: 'centurion',        emoji: '\uD83D\uDEE1\uFE0F', label: 'Centurion', desc: '100 pubs visited. Absolute legends.',                                check: ({ visitedCount }) => visitedCount >= 100 },
    { id: 'crawl_commander',  emoji: '\uD83D\uDDFA\uFE0F', label: 'Crawl Commander', desc: 'Group has 5 visited pubs — a true pub crawl veteran.',           check: ({ visitedCount }) => visitedCount >= 5 },
    { id: 'critic_crew',      emoji: '\u2B50',        label: 'Critic Crew',     desc: 'Group has rated at least 3 different criteria.',                     check: ({ criteriaCount }) => criteriaCount >= 3 },
    { id: 'pint_economist',   emoji: '\uD83D\uDCB0',  label: 'Pint Economist',  desc: 'Group has tracked pint prices in at least one pub.',                 check: ({ hasPrices }) => hasPrices },
    { id: 'high_standards',   emoji: '\uD83C\uDFC6',  label: 'High Standards',  desc: 'Group average score is 8.0 or above.',                              check: ({ overallAvg }) => overallAvg >= 8.0 },
    { id: 'tough_crowd',      emoji: '\uD83D\uDE44',  label: 'Tough Crowd',     desc: 'Group average score is below 5.0 — very picky.',                    check: ({ overallAvg, visitedCount }) => visitedCount >= 3 && overallAvg < 5.0 },
    { id: 'pub_explorer',     emoji: '\uD83E\uDDED',  label: 'Pub Explorer',    desc: '20 pubs on the to-visit list.',                                      check: ({ toVisitCount }) => toVisitCount >= 20 },
    { id: 'local_hero',       emoji: '\uD83C\uDFD8\uFE0F', label: 'Local Hero', desc: 'Group has 3+ pubs in the same area.',                               check: ({ topAreaCount }) => topAreaCount >= 3 },
    { id: 'live_and_kicking', emoji: '\uD83D\uDCCD',  label: 'Live & Kicking',  desc: 'Someone set a live pub location.',                                   check: ({ hasLiveLocation }) => hasLiveLocation },
];

/* ─── BadgesStrip ────────────────────────────────────────────────────────── */

function BadgesStrip({ badges }) {
    const [tooltip, setTooltip] = useState(null);
    const unlocked = badges.filter(b => b.unlocked);
    const ordered  = [...unlocked, ...badges.filter(b => !b.unlocked)];

    return (
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-label">🏆 Group Badges</p>
                <span className="text-xs font-bold text-brand bg-brand-highlight px-3 py-0.5 rounded-full tabular-nums">
                    {unlocked.length} / {badges.length} unlocked
                </span>
            </div>

            <div
                className="flex gap-4 pb-1"
                style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {ordered.map(badge => (
                    <div
                        key={badge.id}
                        onMouseEnter={() => setTooltip(badge.id)}
                        onMouseLeave={() => setTooltip(null)}
                        className="relative flex-shrink-0 flex flex-col items-center gap-1.5 w-[4.5rem] cursor-default select-none"
                    >
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200"
                            style={badge.unlocked ? {
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                                boxShadow: '0 2px 8px oklch(from var(--color-primary) l c h / 0.35)',
                                border: '2px solid oklch(from var(--color-primary) l c h / 0.25)',
                            } : {
                                background: 'var(--color-surface-offset)',
                                border: '2px solid var(--color-border)',
                                opacity: 0.3,
                                filter: 'grayscale(1)',
                            }}
                        >
                            {badge.emoji}
                        </div>
                        <p className={`text-[10px] font-bold text-center leading-tight ${
                            badge.unlocked ? 'text-text' : 'text-text-faint'
                        }`}>
                            {badge.label}
                        </p>

                        {tooltip === badge.id && (
                            <div
                                className="absolute z-50 pointer-events-none leading-relaxed"
                                style={{
                                    bottom: 'calc(100% + 8px)',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--color-text)',
                                    color: 'var(--color-bg)',
                                    fontSize: '0.625rem',
                                    fontWeight: 600,
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: 'var(--radius-lg)',
                                    boxShadow: 'var(--shadow-lg)',
                                    maxWidth: '14rem',
                                    textAlign: 'center',
                                    whiteSpace: 'normal',
                                }}
                            >
                                {badge.unlocked ? badge.desc : `🔒 ${badge.desc}`}
                                <div style={{
                                    position: 'absolute', top: '100%', left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0, height: 0,
                                    borderLeft: '5px solid transparent',
                                    borderRight: '5px solid transparent',
                                    borderTop: '5px solid var(--color-text)',
                                }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── ScoreTrendSparkline ────────────────────────────────────────────────── */

function ScoreTrendSparkline({ points }) {
    const [hovered, setHovered] = useState(null);

    if (!points || points.length < 2) {
        return (
            <div className="text-center py-8" style={{ opacity: 0.4 }}>
                <span className="text-3xl block mb-2">📈</span>
                <p className="text-muted text-xs italic">Rate at least 2 pubs to see your group's trend.</p>
            </div>
        );
    }

    const W = 480, H = 100, PAD_X = 8, PAD_Y = 10;
    const minScore = Math.max(0,  Math.min(...points.map(p => p.score)) - 1);
    const maxScore = Math.min(10, Math.max(...points.map(p => p.score)) + 1);
    const range    = maxScore - minScore || 1;

    const toX = i => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
    const toY = s => PAD_Y + (1 - (s - minScore) / range) * (H - PAD_Y * 2);

    const linePts  = points.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ');
    const areaPath = [
        `M ${toX(0)},${toY(points[0].score)}`,
        ...points.slice(1).map((p, i) => `L ${toX(i + 1)},${toY(p.score)}`),
        `L ${toX(points.length - 1)},${H - PAD_Y}`,
        `L ${toX(0)},${H - PAD_Y}`,
        'Z',
    ].join(' ');

    const first = points[0].score;
    const last  = points[points.length - 1].score;
    const diff  = last - first;
    const trendEmoji = diff > 0.5 ? '📈' : diff < -0.5 ? '📉' : '➡️';
    const trendLabel = diff > 0.5 ? 'Trending up' : diff < -0.5 ? 'Trending down' : 'Holding steady';
    const trendColor = diff > 0.5 ? 'var(--color-success)' : diff < -0.5 ? 'var(--color-error)' : 'var(--color-text-muted)';

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-label">📈 Group Score Trend</p>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{trendEmoji}</span>
                    <span className="text-xs font-bold font-body tabular-nums" style={{ color: trendColor }}>{trendLabel}</span>
                    <span
                        className="text-xs font-bold font-body tabular-nums"
                        style={{
                            color: 'var(--color-text-faint)',
                            background: 'var(--color-surface-offset)',
                            padding: '0.125rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                        }}
                    >
                        Last {points.length} pubs
                    </span>
                </div>
            </div>

            <div className="relative">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 overflow-visible" aria-label="Group score trend chart">
                    <defs>
                        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {[5, 7.5].map(s =>
                        s >= minScore && s <= maxScore ? (
                            <line key={s} x1={PAD_X} y1={toY(s)} x2={W - PAD_X} y2={toY(s)}
                                stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
                        ) : null
                    )}

                    <path d={areaPath} fill="url(#spark-fill)" />

                    <polyline points={linePts} fill="none"
                        stroke="var(--color-primary)" strokeWidth="2.5"
                        strokeLinejoin="round" strokeLinecap="round" />

                    {points.map((p, i) => (
                        <g key={i}>
                            <circle cx={toX(i)} cy={toY(p.score)} r="12" fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(null)} />
                            <circle cx={toX(i)} cy={toY(p.score)} r={hovered === i ? 5 : 3.5}
                                fill={hovered === i ? 'var(--color-primary)' : 'var(--color-surface)'}
                                stroke="var(--color-primary)" strokeWidth="2"
                                style={{ transition: 'r 150ms ease' }} />
                        </g>
                    ))}
                </svg>

                {hovered !== null && (() => {
                    const p   = points[hovered];
                    const pct = hovered / (points.length - 1);
                    return (
                        <div
                            className="absolute top-0 text-[10px] font-semibold leading-normal whitespace-nowrap z-10 pointer-events-none"
                            style={{
                                background: 'var(--color-text)',
                                color: 'var(--color-bg)',
                                padding: '0.375rem 0.75rem',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-lg)',
                                left: `clamp(0px, calc(${(pct * 100).toFixed(1)}% - 4rem), calc(100% - 8rem))`,
                            }}
                        >
                            <div className="font-extrabold">{p.name}</div>
                            <div style={{ opacity: 0.8 }}>{p.score.toFixed(1)} / 10</div>
                        </div>
                    );
                })()}
            </div>

            <div className="flex justify-between mt-2" style={{ paddingInline: `${PAD_X}px` }}>
                {points.map((p, i) => (
                    <span
                        key={i}
                        className="text-[9px] font-semibold font-body text-center overflow-hidden text-ellipsis whitespace-nowrap cursor-default"
                        style={{
                            maxWidth: `${Math.floor(100 / points.length) - 2}%`,
                            color: hovered === i ? 'var(--color-primary)' : 'var(--color-text-faint)',
                            transition: 'color 150ms ease',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        {p.name}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ─── StatCard ───────────────────────────────────────────────────────────── */

export function StatCard({ title, value, subValue, onClick, icon }) {
    return (
        <div
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? e => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
            className="card-warm p-5 flex flex-col justify-between transition-all duration-200"
            style={{
                minHeight: '7rem',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <div className="flex justify-between items-start gap-2">
                <p className="text-label" style={{ color: onClick ? 'var(--color-primary)' : undefined }}>
                    {title}{onClick && ' ↗'}
                </p>
                {icon && <span className="text-lg" style={{ opacity: 0.55, lineHeight: 1 }}>{icon}</span>}
            </div>
            <div>
                <p className="text-kpi mt-2 tabular-nums">{value}</p>
                {subValue && <p className="text-muted mt-1 font-semibold text-xs">{subValue}</p>}
            </div>
        </div>
    );
}

/* ─── main component ──────────────────────────────────────────────────────── */

export default function DashboardPage({ user, userProfile, pubs, newPubs, criteria, users, scores, db, groupId, setPage, allUsers, groupData }) {
    const pubsArray     = Array.isArray(pubs)     ? pubs     : Object.values(pubs     || {});
    const newPubsArray  = Array.isArray(newPubs)  ? newPubs  : Object.values(newPubs  || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj     = scores || {};
    const usersSize     = users && typeof users.size === 'number' ? users.size : 0;
    const groupName     = groupData?.name || null;

    const isOwnerOrManager = useMemo(() => {
        if (!user?.uid || !groupData) return false;
        return (
            groupData.ownerUid === user.uid ||
            (Array.isArray(groupData.managers) && groupData.managers.includes(user.uid))
        );
    }, [user?.uid, groupData]);

    const [livePubId,      setLivePubId]      = useState('');
    const [recentCrawls,   setRecentCrawls]   = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [locationError,  setLocationError]  = useState('');

    const getUserName = (userId) => {
        const u = allUsers && allUsers[userId];
        return u ? (u.nickname || u.displayName || u.email) : 'A member';
    };

    const hasCompletedFirstQuest = useMemo(() =>
        scoresObj && Object.values(scoresObj).some(pubScores =>
            Object.values(pubScores).some(critScores =>
                Array.isArray(critScores) && critScores.some(s => s.userId === user?.uid)
            )
        )
    , [scoresObj, user?.uid]);

    useEffect(() => {
        if (!db || !groupId) return;
        const unsubSettings = db.collection('groups').doc(groupId).onSnapshot(doc => {
            if (doc.exists) setLivePubId(doc.data().livePubId || '');
        });
        const unsubCrawls = db.collection('crawls')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snap => setRecentCrawls(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubEvents = db.collection('events')
            .where('groupId', '==', groupId)
            .orderBy('date', 'asc')
            .onSnapshot(snap => {
                const now = new Date().toISOString().split('T')[0];
                setUpcomingEvents(
                    snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.date >= now).slice(0, 5)
                );
            });
        return () => { unsubSettings(); unsubCrawls(); unsubEvents(); };
    }, [db, groupId]);

    const handleSetLiveLocation = async (e) => {
        if (!isOwnerOrManager) {
            setLocationError('Only the group owner or a manager can change the live location.');
            return;
        }
        setLocationError('');
        try {
            await db.collection('groups').doc(groupId).update({ livePubId: e.target.value });
        } catch (err) {
            console.error('Error updating location:', err);
            setLocationError('Failed to update location. You may not have permission.');
        }
    };

    /* ── price data ── */
    const { cheapestPint, priciestPint } = useMemo(() => {
        const currencyCriteria = criteriaArray.filter(c => c.type === 'currency').map(c => c.id);
        if (!currencyCriteria.length) return { cheapestPint: null, priciestPint: null };
        const pubPrices = [];
        pubsArray.forEach(pub => {
            let total = 0, count = 0;
            currencyCriteria.forEach(cid => {
                (scoresObj[pub.id]?.[cid] || []).forEach(s => {
                    if (s.value != null && !isNaN(s.value)) { total += s.value; count++; }
                });
            });
            if (count > 0) pubPrices.push({ pub, avgPrice: total / count });
        });
        if (!pubPrices.length) return { cheapestPint: null, priciestPint: null };
        pubPrices.sort((a, b) => a.avgPrice - b.avgPrice);
        return { cheapestPint: pubPrices[0], priciestPint: pubPrices[pubPrices.length - 1] };
    }, [pubsArray, scoresObj, criteriaArray]);

    /* ── weighted rankings ── */
    const effectiveWeights = useMemo(() => {
        const map = {};
        criteriaArray.forEach(c => { map[c.id] = c.weight ?? 1; });
        return map;
    }, [criteriaArray]);

    const weightedRankedPubs = useMemo(() => {
        return pubsArray.filter(p => p.status === 'visited').map(pub => {
            let totalScore = 0, totalWeight = 0;
            const memberScores = {};
            Object.entries(scoresObj[pub.id] ?? {}).forEach(([cid, cs]) => {
                const w = effectiveWeights[cid] ?? 1;
                (cs || []).forEach(s => {
                    if (s.type === 'scale' && s.value != null) {
                        totalScore += s.value * w; totalWeight += w;
                        if (!memberScores[s.userId]) memberScores[s.userId] = { total: 0, weight: 0 };
                        memberScores[s.userId].total  += s.value * w;
                        memberScores[s.userId].weight += w;
                    } else if (s.type === 'price' && s.value != null) {
                        totalScore += (s.value * 2) * w; totalWeight += w;
                    }
                });
            });
            const memberAvgs = Object.values(memberScores).map(m => m.weight > 0 ? m.total / m.weight : 0);
            const avg = totalWeight > 0 ? totalScore / totalWeight : 0;
            let variance = 0;
            if (memberAvgs.length > 1) {
                const mean = memberAvgs.reduce((a, b) => a + b, 0) / memberAvgs.length;
                variance = memberAvgs.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / memberAvgs.length;
            }
            return { ...pub, avgScore: avg, variance, ratingCount: Object.values(memberScores).length };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [pubsArray, scoresObj, effectiveWeights]);

    const spotlightPub = weightedRankedPubs[0];

    const biggestDebatePub = useMemo(() => {
        const eligible = weightedRankedPubs.filter(p => p.ratingCount >= 2);
        if (!eligible.length) return null;
        return [...eligible].sort((a, b) => b.variance - a.variance)[0];
    }, [weightedRankedPubs]);

    const darkHorsePub = useMemo(() => {
        const eligible = weightedRankedPubs.filter(p => p.ratingCount === 1);
        return eligible[0] || null;
    }, [weightedRankedPubs]);

    const memberLeaderboard = useMemo(() => {
        const counts = {};
        pubsArray.forEach(pub => {
            Object.values(scoresObj[pub.id] ?? {}).forEach(cs => {
                (cs || []).forEach(s => { if (s.userId) counts[s.userId] = (counts[s.userId] || 0) + 1; });
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([uid, count]) => ({ name: getUserName(uid), count, isMe: uid === user?.uid }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pubsArray, scoresObj, allUsers, user?.uid]);

    const myRatedCount = useMemo(() => {
        if (!user?.uid) return 0;
        const rated = new Set();
        pubsArray.forEach(pub => {
            if (Object.values(scoresObj[pub.id] ?? {}).some(cs => (cs || []).some(s => s.userId === user.uid)))
                rated.add(pub.id);
        });
        return rated.size;
    }, [pubsArray, scoresObj, user?.uid]);

    const daysSinceLastVisit = useMemo(() => {
        const visited = pubsArray.filter(p => p.status === 'visited' && p.createdAt?.toMillis);
        if (!visited.length) return null;
        return Math.floor((Date.now() - Math.max(...visited.map(p => p.createdAt.toMillis()))) / 86_400_000);
    }, [pubsArray]);

    const missionPub = useMemo(() => {
        const unvisited = newPubsArray.filter(p => p.status !== 'visited');
        if (!unvisited.length) return null;
        const now = new Date();
        const week = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 604_800_000);
        return unvisited[(now.getFullYear() * 100 + week) % unvisited.length];
    }, [newPubsArray]);

    const overallAvgNum = weightedRankedPubs.length > 0
        ? weightedRankedPubs.reduce((s, p) => s + p.avgScore, 0) / weightedRankedPubs.length
        : 0;

    const badges = useMemo(() => {
        const totalRatings = Object.values(scoresObj).reduce((sum, ps) =>
            sum + Object.values(ps).reduce((s2, cs) => s2 + (Array.isArray(cs) ? cs.length : 0), 0), 0);
        const hasPrices = criteriaArray.filter(c => c.type === 'currency')
            .some(c => pubsArray.some(p => (scoresObj[p.id]?.[c.id] || []).length > 0));
        const areaCounts = {};
        pubsArray.forEach(p => {
            const loc = (p.location || '').trim().toLowerCase();
            if (loc) areaCounts[loc] = (areaCounts[loc] || 0) + 1;
        });
        const stats = {
            totalRatings,
            memberCount:     usersSize,
            visitedCount:    pubsArray.filter(p => p.status === 'visited').length,
            toVisitCount:    newPubsArray.length,
            criteriaCount:   criteriaArray.length,
            hasPrices,
            overallAvg:      overallAvgNum,
            topAreaCount:    Math.max(0, ...Object.values(areaCounts)),
            hasLiveLocation: !!livePubId,
        };
        return BADGE_DEFS.map(def => ({ ...def, unlocked: def.check(stats) }));
    }, [pubsArray, newPubsArray, scoresObj, criteriaArray, usersSize, overallAvgNum, livePubId]);

    const scoreTrendPoints = useMemo(() =>
        weightedRankedPubs
            .filter(p => p.createdAt?.toMillis && p.avgScore > 0)
            .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
            .slice(-10)
            .map(p => ({ name: p.name, score: p.avgScore }))
    , [weightedRankedPubs]);

    const groupedTimeline = useMemo(() => {
        const items = [];
        pubsArray.forEach(p => {
            if (p.createdAt?.toMillis) {
                const addedBy = p.addedBy ? getUserName(p.addedBy) : 'Someone';
                items.push({ id: `pub_${p.id}`, emoji: '\uD83C\uDF7A', title: 'New Pub Added', text: `${addedBy} added ${p.name} to the list.`, time: p.createdAt.toMillis(), dateLabel: new Date(p.createdAt.toMillis()).toLocaleDateString() });
            }
        });
        recentCrawls.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crawl_${c.id}`, emoji: '\uD83D\uDDFA\uFE0F', title: 'Crawl Planned', text: `${c.creatorName} planned: ${c.name}`, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        criteriaArray.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crit_${c.id}`, emoji: '\uD83D\uDCCB', title: 'Rules Updated', text: `New rating category: ${c.name}`, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        upcomingEvents.forEach(e => {
            if (e.createdAt?.toMillis) items.push({ id: `event_${e.id}`, emoji: '\uD83D\uDCC5', title: 'Event Scheduled', text: `${e.title} was added to the calendar.`, time: e.createdAt.toMillis(), dateLabel: new Date(e.createdAt.toMillis()).toLocaleDateString() });
        });
        const sorted = items.sort((a, b) => b.time - a.time).slice(0, 20);
        const today   = new Date(); today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const groups  = {};
        sorted.forEach(item => {
            const d = new Date(item.time); d.setHours(0, 0, 0, 0);
            const key = d.getTime() === today.getTime() ? 'Today' : d >= weekAgo ? 'This Week' : 'Earlier';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pubsArray, recentCrawls, criteriaArray, upcomingEvents, allUsers]);

    const overallAvg = overallAvgNum.toFixed(1);
    const livePub    = pubsArray.find(p => p.id === livePubId);

    /* ── progress bar width ── */
    const progressPct = pubsArray.length > 0 ? Math.min(100, (myRatedCount / pubsArray.length) * 100) : 0;

    return (
        <div className="animate-fadeIn pb-20" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {/* ── First Quest Banner ── */}
            {user && !hasCompletedFirstQuest && (
                <div
                    className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                        border: '1px solid oklch(from var(--color-primary) l c h / 0.15)',
                    }}
                >
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="heading-ui text-base sm:text-lg flex items-center gap-2 mb-1">
                                <span className="animate-bounce text-xl">🏆</span> Your First Quest
                            </h3>
                            <p className="text-xs sm:text-sm font-medium font-body max-w-lg" style={{ opacity: 0.9 }}>
                                Welcome to the crew! Head to the Directory and drop your first rating to unlock the 'First Pint' badge.
                            </p>
                        </div>
                        <button
                            onClick={() => setPage('pubs')}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs self-start sm:self-auto transition-all shadow-md"
                            style={{
                                background: 'white',
                                color: 'var(--color-primary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            Start Rating →
                        </button>
                    </div>
                    <div className="absolute right-[-2.5rem] top-[-2.5rem] w-40 h-40 rounded-full blur-2xl pointer-events-none" style={{ background: 'white', opacity: 0.08 }} />
                </div>
            )}

            {/* ── Page heading ── */}
            <div className="flex justify-between items-end flex-wrap" style={{ gap: 'var(--space-4)' }}>
                <div>
                    <h2 className="text-page-title">{groupName ? `${groupName} Dashboard` : 'Group Dashboard'}</h2>
                    <p className="text-muted mt-1">{groupName ? `${groupName}'s drinking analytics.` : 'Your group's drinking analytics.'}</p>
                </div>

                {memberLeaderboard.length > 0 && (
                    <div
                        className="flex items-center flex-wrap"
                        style={{
                            gap: 'var(--space-2)',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xl)',
                            padding: 'var(--space-2)',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        <span className="text-xs mr-1" style={{ opacity: 0.6 }}>🏆</span>
                        {memberLeaderboard.map((member, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-body tabular-nums"
                                style={member.isMe ? {
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    boxShadow: 'var(--shadow-sm)',
                                } : {
                                    background: 'var(--color-surface-offset)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text)',
                                }}
                            >
                                <span className="text-xs leading-none">{MEDAL[i]}</span>
                                <span className="max-w-[7rem] overflow-hidden text-ellipsis whitespace-nowrap">{member.name}</span>
                                <span style={{ opacity: member.isMe ? 0.8 : 0.5 }}>{member.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Badges Strip ── */}
            <BadgesStrip badges={badges} />

            {/* ══ HERO ROW ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-5)', alignItems: 'stretch' }}>

                {/* Pub of the Month */}
                <div
                    onClick={() => setPage('pubs')}
                    className="relative overflow-hidden rounded-2xl shadow-sm group cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                    style={{
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-offset)',
                        minHeight: '16rem',
                        aspectRatio: '3 / 2',
                    }}
                >
                    {spotlightPub?.photoURL ? (
                        <img
                            src={spotlightPub.photoURL}
                            alt={spotlightPub.name}
                            loading="lazy"
                            width="600"
                            height="400"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--color-primary-hover), var(--color-primary))' }} />
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)' }} />
                    <div className="relative z-10 h-full flex flex-col justify-between p-5">
                        <div>
                            <span
                                className="inline-block text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider"
                                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
                            >
                                🔥 Pub of the Month
                            </span>
                        </div>
                        {spotlightPub ? (
                            <div>
                                <p className="text-white font-display text-xl leading-snug mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                                    {spotlightPub.name}
                                </p>
                                <p className="text-xs font-bold font-body mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                    📍 {spotlightPub.location}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="px-3 py-1 rounded-full font-extrabold text-sm font-body tabular-nums shadow-sm"
                                        style={{ background: 'var(--color-primary)', color: 'white' }}
                                    >
                                        {spotlightPub.avgScore.toFixed(1)}/10
                                    </span>
                                    <span className="text-xs font-semibold font-body" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        {scoreTierLabel(spotlightPub.avgScore).label}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center my-auto">
                                <span className="text-3xl">👑</span>
                                <p className="text-xs italic mt-2 font-body" style={{ color: 'rgba(255,255,255,0.7)' }}>Rate a pub to crown it here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-5)' }}>
                    <StatCard title="Visited Pubs"    value={pubsArray.length}    onClick={() => setPage('pubs')}    icon="🍺" />
                    <StatCard title="Pubs to Visit"   value={newPubsArray.length} onClick={() => setPage('toVisit')} icon="📋" />
                    <StatCard title="Total Members"   value={usersSize}                                               icon="👥" />
                    <StatCard title="Overall Average" value={overallAvg}          subValue="Group wide"              icon="⭐" />

                    {user && (
                        <div
                            className="col-span-1 sm:col-span-2 card-warm p-4 flex items-center"
                            style={{ gap: 'var(--space-4)' }}
                        >
                            <div style={{ flex: 1 }}>
                                <p className="text-label mb-2">My Rating Progress</p>
                                <div
                                    className="h-2 rounded-full overflow-hidden"
                                    style={{ background: 'var(--color-surface-offset)' }}
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${progressPct}%`,
                                            background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-hover))',
                                            transition: 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-xs font-bold font-body tabular-nums whitespace-nowrap self-end mb-0.5" style={{ color: 'var(--color-primary)' }}>
                                {myRatedCount} / {pubsArray.length} pubs
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ ROW 2: Live Location + Guinness Index ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-5)' }}>

                {/* Live Location */}
                <div className="card-warm p-6 relative overflow-hidden">
                    {livePubId && (
                        <div
                            className="absolute inset-0 pointer-events-none animate-pulse"
                            style={{ background: 'oklch(from var(--color-primary) l c h / 0.06)' }}
                        />
                    )}
                    <div className="relative z-10 flex flex-col justify-between h-full" style={{ gap: 'var(--space-4)' }}>
                        <div>
                            <p className="text-label mb-3">📍 Current Group Location</p>
                            {livePubId ? (
                                <div className="flex items-center mb-4" style={{ gap: 'var(--space-4)' }}>
                                    {livePub?.photoURL ? (
                                        <img
                                            src={livePub.photoURL}
                                            alt={livePub.name}
                                            loading="lazy"
                                            width="56"
                                            height="56"
                                            className="rounded-xl object-cover flex-shrink-0"
                                            style={{ width: '3.5rem', height: '3.5rem', border: '2px solid oklch(from var(--color-primary) l c h / 0.3)', boxShadow: 'var(--shadow-sm)' }}
                                        />
                                    ) : (
                                        <div className="text-3xl animate-bounce">📍</div>
                                    )}
                                    <p className="text-page-title leading-tight font-bold" style={{ color: 'var(--color-primary)' }}>
                                        {livePub?.name || 'Unknown Pub'}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-section-heading mb-4 font-normal" style={{ opacity: 0.5 }}>Not currently at a pub.</p>
                            )}
                        </div>

                        {isOwnerOrManager ? (
                            <>
                                <select
                                    value={livePubId}
                                    onChange={handleSetLiveLocation}
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer outline-none"
                                    style={{
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface-2)',
                                        color: 'var(--color-text)',
                                        fontFamily: 'var(--font-body)',
                                        boxShadow: 'var(--shadow-sm)',
                                    }}
                                >
                                    <option value="">🏠 Everyone went home</option>
                                    <optgroup label="Active Pubs">
                                        {pubsArray.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </optgroup>
                                </select>
                                {locationError && <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--color-error)' }}>{locationError}</p>}
                            </>
                        ) : (
                            <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                                Only the group owner or a manager can change the live location.
                            </p>
                        )}
                    </div>
                </div>

                {/* Guinness Index */}
                {(cheapestPint || priciestPint) ? (
                    <div
                        className="card-warm p-6 flex flex-col justify-between"
                        style={{ border: '1px solid oklch(from var(--color-primary) l c h / 0.2)' }}
                    >
                        <div className="flex items-center mb-5" style={{ gap: 'var(--space-3)' }}>
                            <span className="text-3xl">🍺</span>
                            <div>
                                <h3 className="text-section-heading font-display font-normal uppercase tracking-wider text-base">The Guinness Index</h3>
                                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Tracking the exact price of a pint</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
                            {cheapestPint && (
                                <div
                                    className="rounded-xl p-4 flex flex-col"
                                    style={{
                                        gap: 'var(--space-2)',
                                        background: 'oklch(from var(--color-success) l c h / 0.06)',
                                        border: '1px solid oklch(from var(--color-success) l c h / 0.18)',
                                    }}
                                >
                                    {cheapestPint.pub.photoURL && (
                                        <img src={cheapestPint.pub.photoURL} alt={cheapestPint.pub.name}
                                            loading="lazy" width="48" height="48"
                                            className="rounded-lg object-cover mb-1"
                                            style={{ width: '3rem', height: '3rem', border: '1px solid oklch(from var(--color-success) l c h / 0.15)', boxShadow: 'var(--shadow-sm)' }} />
                                    )}
                                    <p className="text-label" style={{ color: 'var(--color-success)' }}>💚 Cheapest Pint</p>
                                    <p className="text-kpi text-lg tabular-nums">£{cheapestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-[10px] font-bold overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{cheapestPint.pub.name}</p>
                                </div>
                            )}
                            {priciestPint && (
                                <div
                                    className="rounded-xl p-4 flex flex-col"
                                    style={{
                                        gap: 'var(--space-2)',
                                        background: 'oklch(from var(--color-error) l c h / 0.06)',
                                        border: '1px solid oklch(from var(--color-error) l c h / 0.18)',
                                    }}
                                >
                                    {priciestPint.pub.photoURL && (
                                        <img src={priciestPint.pub.photoURL} alt={priciestPint.pub.name}
                                            loading="lazy" width="48" height="48"
                                            className="rounded-lg object-cover mb-1"
                                            style={{ width: '3rem', height: '3rem', border: '1px solid oklch(from var(--color-error) l c h / 0.15)', boxShadow: 'var(--shadow-sm)' }} />
                                    )}
                                    <p className="text-label" style={{ color: 'var(--color-error)' }}>❤️ Priciest Pint</p>
                                    <p className="text-kpi text-lg tabular-nums">£{priciestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-[10px] font-bold overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{priciestPint.pub.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="card-warm p-6 flex items-center justify-center" style={{ opacity: 0.4, minHeight: '12rem' }}>
                        <p className="text-muted text-xs italic text-center">No pint prices logged yet.</p>
                    </div>
                )}
            </div>

            {/* ══ ROW 3: Biggest Debate + Dark Horse ══ */}
            {(biggestDebatePub || darkHorsePub) && (
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-5)' }}>
                    {biggestDebatePub && (
                        <div
                            onClick={() => setPage('pubs')}
                            className="card-warm p-4 flex items-center cursor-pointer transition-all duration-200"
                            style={{ gap: 'var(--space-4)' }}
                        >
                            {biggestDebatePub.photoURL ? (
                                <img src={biggestDebatePub.photoURL} alt={biggestDebatePub.name}
                                    loading="lazy" width="64" height="64"
                                    className="rounded-xl object-cover flex-shrink-0"
                                    style={{ width: '4rem', height: '4rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }} />
                            ) : (
                                <div className="rounded-xl flex-shrink-0 flex items-center justify-center text-3xl"
                                    style={{ width: '4rem', height: '4rem', background: 'var(--color-surface-offset)' }}>⚡</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="text-label mb-1" style={{ color: 'var(--color-warning)' }}>⚡ Biggest Debate</p>
                                <p className="text-card-title text-sm overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">{biggestDebatePub.name}</p>
                                <p className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                                    Variance: {biggestDebatePub.variance.toFixed(2)} · avg {biggestDebatePub.avgScore.toFixed(1)}/10
                                </p>
                            </div>
                            <span className="text-lg font-black flex-shrink-0 font-body tabular-nums" style={{ color: 'var(--color-primary)' }}>
                                {biggestDebatePub.avgScore.toFixed(1)}
                            </span>
                        </div>
                    )}
                    {darkHorsePub && (
                        <div
                            onClick={() => setPage('pubs')}
                            className="card-warm p-4 flex items-center cursor-pointer transition-all duration-200"
                            style={{ gap: 'var(--space-4)' }}
                        >
                            {darkHorsePub.photoURL ? (
                                <img src={darkHorsePub.photoURL} alt={darkHorsePub.name}
                                    loading="lazy" width="64" height="64"
                                    className="rounded-xl object-cover flex-shrink-0"
                                    style={{ width: '4rem', height: '4rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }} />
                            ) : (
                                <div className="rounded-xl flex-shrink-0 flex items-center justify-center text-3xl"
                                    style={{ width: '4rem', height: '4rem', background: 'var(--color-surface-offset)' }}>🌑</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="text-label mb-1" style={{ color: 'var(--color-purple, #7a39bb)' }}>🌑 Dark Horse</p>
                                <p className="text-card-title text-sm overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">{darkHorsePub.name}</p>
                                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>High rating, only 1 reviewer</p>
                            </div>
                            <span className="text-lg font-black flex-shrink-0 font-body tabular-nums" style={{ color: 'var(--color-primary)' }}>
                                {darkHorsePub.avgScore.toFixed(1)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ══ ROW 3.5: Last Pub Night + This Week's Mission ══ */}
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-5)' }}>

                {/* Last Pub Night */}
                <div className="card-warm p-5 sm:p-6 flex items-center relative overflow-hidden" style={{ gap: 'var(--space-5)' }}>
                    <div className="absolute right-[-1rem] top-[-1rem] text-8xl pointer-events-none select-none" style={{ opacity: 0.05 }}>🍻</div>
                    <div
                        className="flex-shrink-0 flex items-center justify-center rounded-2xl shadow-md"
                        style={{
                            width: 'var(--space-20)',
                            height: 'var(--space-20)',
                            background: daysSinceLastVisit === null
                                ? 'var(--color-surface-offset)'
                                : daysSinceLastVisit <= 7
                                    ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))'
                                    : daysSinceLastVisit <= 14
                                        ? 'linear-gradient(135deg, #ca8a04, #d97706)'
                                        : 'linear-gradient(135deg, var(--color-error), #9f1239)',
                            color: daysSinceLastVisit === null ? 'var(--color-text-muted)' : 'white',
                            border: daysSinceLastVisit === null ? '1px solid var(--color-border)' : 'none',
                        }}
                    >
                        <span
                            className="font-body font-black tabular-nums"
                            style={{ fontSize: daysSinceLastVisit !== null && daysSinceLastVisit >= 100 ? '1rem' : '1.5rem' }}
                        >
                            {daysSinceLastVisit !== null ? daysSinceLastVisit : '?'}
                        </span>
                    </div>
                    <div>
                        <p className="text-label mb-1">📅 Last Pub Night</p>
                        <p className="text-section-heading leading-tight text-base sm:text-lg">
                            {daysSinceLastVisit === null
                                ? 'No visits yet!'
                                : daysSinceLastVisit === 0
                                    ? 'Today — you\'re out! 🍻'
                                    : daysSinceLastVisit === 1
                                        ? 'Yesterday'
                                        : `${daysSinceLastVisit} days ago`}
                        </p>
                        <p className="text-[10px] mt-1 leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                            {daysSinceLastVisit === null
                                ? 'Add your first pub visit to start tracking.'
                                : daysSinceLastVisit <= 7
                                    ? 'Still fresh — the crew is active! 🎉'
                                    : daysSinceLastVisit <= 14
                                        ? 'Been a while… time to plan a crawl?'
                                        : 'The pubs miss you. 🥺 Get one in!'}
                        </p>
                    </div>
                </div>

                {/* This Week's Mission */}
                <div
                    onClick={() => missionPub && setPage('toVisit')}
                    className="card-warm relative overflow-hidden p-5 sm:p-6 flex flex-col justify-between"
                    style={{ minHeight: '10rem', cursor: missionPub ? 'pointer' : 'default' }}
                >
                    {missionPub?.photoURL && (
                        <img src={missionPub.photoURL} alt={missionPub.name}
                            loading="lazy" width="600" height="300"
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            style={{ opacity: 0.08 }} />
                    )}
                    {!missionPub?.photoURL && (
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'oklch(from var(--color-primary) l c h / 0.04)' }} />
                    )}
                    <div className="relative z-10 w-full">
                        <div className="flex items-center mb-3" style={{ gap: 'var(--space-2)' }}>
                            <span className="text-xl">🎯</span>
                            <p className="text-label" style={{ color: 'var(--color-primary)' }}>This Week's Mission</p>
                            <span
                                className="ml-auto text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--color-primary)', color: 'white', boxShadow: 'var(--shadow-sm)' }}
                            >Weekly</span>
                        </div>
                        {missionPub ? (
                            <>
                                <p className="text-section-heading text-base sm:text-lg overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">
                                    {missionPub.name}
                                </p>
                                {missionPub.location && (
                                    <p className="text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>📍 {missionPub.location}</p>
                                )}
                                <p className="text-[11px] leading-normal italic" style={{ color: 'var(--color-text-muted)' }}>
                                    The crew is assigned to visit <strong>{missionPub.name}</strong> this week. It's on your hitlist — go explore!
                                </p>
                                <p className="mt-4 text-[10px] font-extrabold flex items-center" style={{ color: 'var(--color-primary)', gap: 'var(--space-1)' }}>
                                    View on Hitlist →
                                </p>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <span className="text-2xl block mb-1">✅</span>
                                <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No unvisited pubs — you've conquered them all!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ ROW 5: Score Trend Sparkline ══ */}
            <div className="card-warm p-5 sm:p-6">
                <ScoreTrendSparkline points={scoreTrendPoints} />
            </div>

            {/* ══ ROW 4: Events + Activity Feed ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 items-stretch" style={{ gap: 'var(--space-5)' }}>

                {/* Upcoming Events */}
                <div className="card-warm p-5 flex flex-col justify-between lg:col-span-1" style={{ minHeight: '16rem' }}>
                    <div>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-section-heading">Upcoming Events</h3>
                            <button
                                onClick={() => setPage('events')}
                                className="text-xs font-bold hover:underline cursor-pointer"
                                style={{ color: 'var(--color-primary)', border: 'none', background: 'transparent' }}
                            >
                                View All
                            </button>
                        </div>

                        {upcomingEvents.length === 0 ? (
                            <div className="text-center py-8" style={{ opacity: 0.4 }}>
                                <span className="text-3xl block mb-2">📅</span>
                                <p className="text-muted text-xs italic">No events planned.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col overflow-y-auto pr-1" style={{ gap: 'var(--space-3)', maxHeight: '18rem' }}>
                                {upcomingEvents.map(event => {
                                    const d   = new Date(event.date);
                                    const pub = pubsArray.find(p => p.id === event.pubId);
                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => setPage('events')}
                                            className="flex items-center rounded-xl cursor-pointer transition-colors duration-150"
                                            style={{
                                                gap: 'var(--space-3)',
                                                background: 'var(--color-surface-offset)',
                                                border: '1px solid var(--color-border)',
                                                padding: 'var(--space-2) var(--space-3)',
                                            }}
                                        >
                                            <div
                                                className="text-center flex-shrink-0 rounded-lg py-1.5 px-2.5 shadow-sm"
                                                style={{
                                                    background: 'var(--color-primary)',
                                                    color: 'white',
                                                    minWidth: '3.2rem',
                                                }}
                                            >
                                                <p className="text-[9px] uppercase font-black leading-none font-body">{d.toLocaleDateString(undefined, { month: 'short' })}</p>
                                                <p className="text-base font-extrabold leading-none mt-1 font-body tabular-nums">{d.getDate()}</p>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p className="text-card-title text-sm overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">{event.title}</p>
                                                <p className="text-[10px] overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>📍 {pub?.name || 'Unknown Pub'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Group Activity Feed */}
                <div className="card-warm p-5 sm:p-6 flex flex-col lg:col-span-2" style={{ minHeight: '16rem' }}>
                    <h3 className="text-section-heading mb-5">Group Activity</h3>
                    {Object.keys(groupedTimeline).length === 0 ? (
                        <p className="text-muted text-xs italic text-center my-auto">No recent activity.</p>
                    ) : (
                        <div className="flex flex-col overflow-y-auto pr-2" style={{ gap: 'var(--space-5)', maxHeight: '22rem' }}>
                            {['Today', 'This Week', 'Earlier'].filter(g => groupedTimeline[g]?.length).map(group => (
                                <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    <p
                                        className="text-[10px] font-black font-body uppercase tracking-wider pb-1.5"
                                        style={{
                                            color: 'var(--color-text-faint)',
                                            borderBottom: '1px solid var(--color-divider)',
                                        }}
                                    >{group}</p>
                                    <div
                                        className="relative flex flex-col"
                                        style={{
                                            borderLeft: '1px solid oklch(from var(--color-primary) l c h / 0.3)',
                                            marginLeft: '1rem',
                                            paddingLeft: '1rem',
                                            paddingBlock: 'var(--space-1)',
                                            gap: 'var(--space-4)',
                                        }}
                                    >
                                        {groupedTimeline[group].map(item => (
                                            <div key={item.id} className="relative">
                                                <span
                                                    className="absolute flex items-center justify-center text-xs z-10 select-none"
                                                    style={{
                                                        left: '-1.625rem',
                                                        top: 'var(--space-1)',
                                                        width: '1.5rem',
                                                        height: '1.5rem',
                                                        background: 'var(--color-surface)',
                                                        border: '1px solid oklch(from var(--color-primary) l c h / 0.3)',
                                                        borderRadius: 'var(--radius-full)',
                                                        boxShadow: 'var(--shadow-sm)',
                                                    }}
                                                >{item.emoji}</span>
                                                <div
                                                    className="rounded-xl"
                                                    style={{
                                                        background: 'var(--color-surface-offset)',
                                                        border: '1px solid var(--color-border)',
                                                        padding: 'var(--space-3)',
                                                        boxShadow: 'var(--shadow-sm)',
                                                    }}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>{item.title}</p>
                                                        <p
                                                            className="text-[9px] font-bold font-body"
                                                            style={{
                                                                color: 'var(--color-text-faint)',
                                                                background: 'var(--color-surface)',
                                                                padding: '0.125rem 0.5rem',
                                                                borderRadius: 'var(--radius-full)',
                                                                border: '1px solid var(--color-border)',
                                                            }}
                                                        >{item.dateLabel}</p>
                                                    </div>
                                                    <p className="text-xs font-semibold" style={{ color: 'oklch(from var(--color-text) l c h / 0.8)' }}>{item.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
