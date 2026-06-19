import React, { useState, useEffect, useMemo, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const scoreTierBg = (score) => {
    if (score >= 8.5) return 'rgba(180,100,20,0.85)';
    if (score >= 7)   return 'rgba(210,155,30,0.85)';
    if (score >= 5)   return 'rgba(234,179,8,0.75)';
    return 'rgba(180,40,40,0.75)';
};

const scoreTierLabel = (score) => {
    if (score >= 8.5) return { label: 'Legendary', color: 'var(--color-brand-dark)' };
    if (score >= 7)   return { label: 'Great',     color: '#b07a00' };
    if (score >= 5)   return { label: 'Decent',    color: '#ca8a04' };
    return             { label: 'Avoid',            color: 'var(--color-error)' };
};

const MEDAL = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']; // 🥇🥈🥉

/* ─── badge definitions ──────────────────────────────────────────────────────── */

// Each badge: { id, emoji, label, desc, check(stats) => bool }
const BADGE_DEFS = [
    {
        id: 'first_pint',
        emoji: '\uD83C\uDF7A', // 🍺
        label: 'First Pint',
        desc: 'Someone in the group submitted their very first rating.',
        check: ({ totalRatings }) => totalRatings >= 1,
    },
    {
        id: 'the_regulars',
        emoji: '\uD83D\uDC65', // 👥
        label: 'The Regulars',
        desc: 'Group has 5 or more members.',
        check: ({ memberCount }) => memberCount >= 5,
    },
    {
        id: 'pub_scholar',
        emoji: '\uD83C\uDF93', // 🎓
        label: 'Pub Scholar',
        desc: 'Group has rated 10 pubs.',
        check: ({ visitedCount }) => visitedCount >= 10,
    },
    {
        id: 'centurion',
        emoji: '\uD83D\uDEE1\uFE0F', // 🛡️
        label: 'Centurion',
        desc: '100 pubs visited. Absolute legends.',
        check: ({ visitedCount }) => visitedCount >= 100,
    },
    {
        id: 'crawl_commander',
        emoji: '\uD83D\uDDFA\uFE0F', // 🗺️
        label: 'Crawl Commander',
        desc: 'Group has 5 visited pubs — a true pub crawl veteran.',
        check: ({ visitedCount }) => visitedCount >= 5,
    },
    {
        id: 'critic_crew',
        emoji: '\u2B50', // ⭐
        label: 'Critic Crew',
        desc: 'Group has rated at least 3 different criteria.',
        check: ({ criteriaCount }) => criteriaCount >= 3,
    },
    {
        id: 'pint_economist',
        emoji: '\uD83D\uDCB0', // 💰
        label: 'Pint Economist',
        desc: 'Group has tracked pint prices in at least one pub.',
        check: ({ hasPrices }) => hasPrices,
    },
    {
        id: 'high_standards',
        emoji: '\uD83C\uDFC6', // 🏆
        label: 'High Standards',
        desc: 'Group average score is 8.0 or above.',
        check: ({ overallAvg }) => overallAvg >= 8.0,
    },
    {
        id: 'tough_crowd',
        emoji: '\uD83D\uDE44', // 🙄
        label: 'Tough Crowd',
        desc: 'Group average score is below 5.0 — very picky.',
        check: ({ overallAvg, visitedCount }) => visitedCount >= 3 && overallAvg < 5.0,
    },
    {
        id: 'pub_explorer',
        emoji: '\uD83E\uDDED', // 🧭compass
        label: 'Pub Explorer',
        desc: '20 pubs on the to-visit list.',
        check: ({ toVisitCount }) => toVisitCount >= 20,
    },
    {
        id: 'local_hero',
        emoji: '\uD83C\uDFD8\uFE0F', // 🏘️
        label: 'Local Hero',
        desc: 'Group has 3+ pubs in the same area.',
        check: ({ topAreaCount }) => topAreaCount >= 3,
    },
    {
        id: 'live_and_kicking',
        emoji: '\uD83D\uDCCD', // 📍
        label: 'Live & Kicking',
        desc: 'Someone set a live pub location.',
        check: ({ hasLiveLocation }) => hasLiveLocation,
    },
];

/* ─── BadgesStrip sub-component ────────────────────────────────────────────── */

function BadgesStrip({ badges }) {
    const [tooltip, setTooltip] = useState(null);
    const unlocked = badges.filter(b => b.unlocked);
    const locked   = badges.filter(b => !b.unlocked);
    const ordered  = [...unlocked, ...locked];

    return (
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-label">🏆 Group Badges</p>
                <span className="text-xs font-bold text-brand bg-brand-highlight px-3 py-0.5 rounded-full">
                    {unlocked.length} / {badges.length} unlocked
                </span>
            </div>

            {/* Horizontally scrollable badge row */}
            <div className="scroll-x-clean flex gap-4 pb-2">
                {ordered.map(badge => (
                    <div
                        key={badge.id}
                        onMouseEnter={() => setTooltip(badge.id)}
                        onMouseLeave={() => setTooltip(null)}
                        className="relative flex-shrink-0 flex flex-col items-center gap-1.5 w-20 cursor-default"
                    >
                        {/* Badge circle */}
                        <div
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${
                                badge.unlocked
                                    ? 'bg-gradient-to-br from-brand to-brand-dark border-2 border-brand-light shadow-md'
                                    : 'bg-surface-offset border-2 border-border grayscale opacity-35'
                            }`}
                        >
                            {badge.emoji}
                        </div>

                        {/* Badge label */}
                        <p
                            className={`text-[10px] font-bold text-center leading-tight max-w-[5rem] ${
                                badge.unlocked ? 'text-text' : 'text-text-faint'
                            }`}
                        >
                            {badge.label}
                        </p>

                        {/* Tooltip on hover */}
                        {tooltip === badge.id && (
                            <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-text text-surface text-[10px] font-semibold px-3 py-1.5 rounded-lg shadow-lg max-w-[14rem] text-center z-50 pointer-events-none leading-relaxed">
                                {badge.unlocked ? badge.desc : `🔒 ${badge.desc}`}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-text" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── ScoreTrendSparkline sub-component ──────────────────────────────────── */

function ScoreTrendSparkline({ points }) {
    const [hovered, setHovered] = useState(null);

    if (!points || points.length < 2) {
        return (
            <div className="text-center py-8 opacity-40">
                <span className="text-3xl block mb-2">📈</span>
                <p className="text-muted text-xs italic">Rate at least 2 pubs to see your group's trend.</p>
            </div>
        );
    }

    const W = 480, H = 100, PAD_X = 8, PAD_Y = 10;
    const minScore = Math.max(0,  Math.min(...points.map(p => p.score)) - 1);
    const maxScore = Math.min(10, Math.max(...points.map(p => p.score)) + 1);
    const range    = maxScore - minScore || 1;

    const toX = (i) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
    const toY = (s) => PAD_Y + (1 - (s - minScore) / range) * (H - PAD_Y * 2);

    // Build smooth polyline path
    const linePts = points.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ');

    // Build filled area path
    const areaPath = [
        `M ${toX(0)},${toY(points[0].score)}`,
        ...points.slice(1).map((p, i) => `L ${toX(i + 1)},${toY(p.score)}`),
        `L ${toX(points.length - 1)},${H - PAD_Y}`,
        `L ${toX(0)},${H - PAD_Y}`,
        'Z',
    ].join(' ');

    // Trend direction
    const first = points[0].score;
    const last  = points[points.length - 1].score;
    const diff  = last - first;
    const trendEmoji  = diff > 0.5 ? '📈' : diff < -0.5 ? '📉' : '➡️';
    const trendLabel  = diff > 0.5 ? 'Trending up'  : diff < -0.5 ? 'Trending down' : 'Holding steady';
    const trendColor  = diff > 0.5 ? 'var(--color-success)' : diff < -0.5 ? 'var(--color-error)' : 'var(--color-text-muted)';

    return (
        <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-label">📈 Group Score Trend</p>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{trendEmoji}</span>
                    <span className="text-xs font-bold font-body" style={{ color: trendColor }}>{trendLabel}</span>
                    <span className="text-xs font-bold font-body text-text-faint bg-surface-offset px-3 py-0.5 rounded-full">
                        Last {points.length} pubs
                    </span>
                </div>
            </div>

            {/* SVG sparkline */}
            <div className="relative">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-24 overflow-visible"
                    aria-label="Group score trend chart"
                >
                    <defs>
                        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"  stopColor="var(--color-brand)" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal guide lines at score 5 and score 7.5 */}
                    {[5, 7.5].map(s => (
                        s >= minScore && s <= maxScore ? (
                            <line
                                key={s}
                                x1={PAD_X} y1={toY(s)}
                                x2={W - PAD_X} y2={toY(s)}
                                className="stroke-border"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                        ) : null
                    ))}

                    {/* Filled area under the line */}
                    <path d={areaPath} fill="url(#spark-fill)" />

                    {/* The line itself */}
                    <polyline
                        points={linePts}
                        fill="none"
                        className="stroke-brand"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {/* Data point dots + hover hit areas */}
                    {points.map((p, i) => (
                        <g key={i}>
                            {/* invisible wider hit area */}
                            <circle
                                cx={toX(i)} cy={toY(p.score)}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(null)}
                            />
                            {/* visible dot */}
                            <circle
                                cx={toX(i)} cy={toY(p.score)}
                                r={hovered === i ? 5 : 3.5}
                                fill={hovered === i ? 'var(--color-brand)' : 'var(--color-surface)'}
                                className="stroke-brand transition-all duration-150"
                                strokeWidth="2"
                            />
                        </g>
                    ))}
                </svg>

                {/* Floating tooltip on hover */}
                {hovered !== null && (() => {
                    const p   = points[hovered];
                    const pct = hovered / (points.length - 1);
                    return (
                        <div
                            className="absolute top-0 bg-text text-surface text-[10px] font-semibold px-3 py-1.5 rounded-lg shadow-lg z-10 pointer-events-none leading-normal whitespace-nowrap"
                            style={{
                                left: `clamp(0px, calc(${(pct * 100).toFixed(1)}% - 4rem), calc(100% - 8rem))`,
                            }}
                        >
                            <div className="font-extrabold">{p.name}</div>
                            <div className="opacity-80">{p.score.toFixed(1)} / 10</div>
                        </div>
                    );
                })()}
            </div>

            {/* Pub name labels on the x-axis */}
            <div className="flex justify-between mt-2" style={{ paddingInline: `${PAD_X}px` }}>
                {points.map((p, i) => (
                    <span
                        key={i}
                        className={`text-[9px] font-semibold font-body text-center overflow-hidden text-ellipsis whitespace-nowrap cursor-default transition-colors duration-150 ${
                            hovered === i ? 'text-brand' : 'text-text-faint'
                        }`}
                        style={{
                            maxWidth: `${Math.floor(100 / points.length) - 2}%`,
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

/* ─── sub-components ──────────────────────────────────────────────────────── */

export function StatCard({ title, value, subValue, onClick, icon }) {
    return (
        <div
            onClick={onClick}
            className={`card-warm p-5 ${onClick ? 'cursor-pointer hover:border-brand/40 hover:-translate-y-0.5' : 'cursor-default'} transition-all duration-200`}
        >
            <div className="flex justify-between items-start mb-2">
                <p className={`text-label ${onClick ? 'text-brand' : ''}`}>
                    {title} {onClick && '↗'}
                </p>
                {icon && <span className="text-lg opacity-60">{icon}</span>}
            </div>
            <p className="text-kpi mt-1">{value}</p>
            {subValue && <p className="text-muted mt-2 font-semibold">{subValue}</p>}
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
        const visitedPubs = pubsArray.filter(p => p.status === 'visited');
        return visitedPubs.map(pub => {
            let totalScore = 0, totalWeight = 0;
            const memberScores = {};
            Object.entries(scoresObj[pub.id] ?? {}).forEach(([criterionId, criterionScores]) => {
                const weight = effectiveWeights[criterionId] ?? 1;
                (criterionScores || []).forEach(score => {
                    if (score.type === 'scale' && score.value != null) {
                        totalScore += score.value * weight; totalWeight += weight;
                        if (!memberScores[score.userId]) memberScores[score.userId] = { total: 0, weight: 0 };
                        memberScores[score.userId].total  += score.value * weight;
                        memberScores[score.userId].weight += weight;
                    } else if (score.type === 'price' && score.value != null) {
                        totalScore += (score.value * 2) * weight; totalWeight += weight;
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
            const ratingCount = Object.values(memberScores).length;
            return { ...pub, avgScore: avg, variance, ratingCount };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [pubsArray, scoresObj, effectiveWeights]);

    const spotlightPub = weightedRankedPubs[0];

    /* ── "Biggest Debate" – highest variance pub with ≥2 raters ── */
    const biggestDebatePub = useMemo(() => {
        const eligible = weightedRankedPubs.filter(p => p.ratingCount >= 2);
        if (!eligible.length) return null;
        return [...eligible].sort((a, b) => b.variance - a.variance)[0];
    }, [weightedRankedPubs]);

    /* ── "Dark Horse" – highest score among pubs with only 1 rater ── */
    const darkHorsePub = useMemo(() => {
        const eligible = weightedRankedPubs.filter(p => p.ratingCount === 1);
        if (!eligible.length) return null;
        return eligible[0];
    }, [weightedRankedPubs]);

    /* ── member leaderboard: top 3 by total ratings submitted ── */
    const memberLeaderboard = useMemo(() => {
        const counts = {};
        pubsArray.forEach(pub => {
            Object.values(scoresObj[pub.id] ?? {}).forEach(criterionScores => {
                (criterionScores || []).forEach(s => {
                    if (s.userId) counts[s.userId] = (counts[s.userId] || 0) + 1;
                });
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([uid, count]) => ({ name: getUserName(uid), count, isMe: uid === user?.uid }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pubsArray, scoresObj, allUsers, user?.uid]);

    /* ── my rating progress ── */
    const myRatedCount = useMemo(() => {
        if (!user?.uid) return 0;
        const rated = new Set();
        pubsArray.forEach(pub => {
            const hasRating = Object.values(scoresObj[pub.id] ?? {}).some(cs =>
                (cs || []).some(s => s.userId === user.uid)
            );
            if (hasRating) rated.add(pub.id);
        });
        return rated.size;
    }, [pubsArray, scoresObj, user?.uid]);

    /* ── Last Pub Night: days since most recently visited pub was added ── */
    const daysSinceLastVisit = useMemo(() => {
        const visitedPubs = pubsArray.filter(p => p.status === 'visited' && p.createdAt?.toMillis);
        if (!visitedPubs.length) return null;
        const latest = Math.max(...visitedPubs.map(p => p.createdAt.toMillis()));
        const diffMs = Date.now() - latest;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }, [pubsArray]);

    /* ── This Week's Mission: a pseudo-random unvisited pub, stable per week ── */
    const missionPub = useMemo(() => {
        const unvisited = newPubsArray.filter(p => p.status !== 'visited');
        if (!unvisited.length) return null;
        const now = new Date();
        const weekNum = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        const seed = (now.getFullYear() * 100 + weekNum) % unvisited.length;
        return unvisited[seed];
    }, [newPubsArray]);

    /* ── overall average (for badges) ── */
    const overallAvgNum = weightedRankedPubs.length > 0
        ? weightedRankedPubs.reduce((sum, p) => sum + p.avgScore, 0) / weightedRankedPubs.length
        : 0;

    /* ── badge stats ── */
    const badges = useMemo(() => {
        const totalRatings = Object.values(scoresObj).reduce((sum, pubScores) =>
            sum + Object.values(pubScores).reduce((s2, cs) => s2 + (Array.isArray(cs) ? cs.length : 0), 0)
        , 0);

        const hasPrices = criteriaArray
            .filter(c => c.type === 'currency')
            .some(c => pubsArray.some(p => (scoresObj[p.id]?.[c.id] || []).length > 0));

        // area count: find location string that appears most
        const areaCounts = {};
        pubsArray.forEach(p => {
            const loc = (p.location || '').trim().toLowerCase();
            if (loc) areaCounts[loc] = (areaCounts[loc] || 0) + 1;
        });
        const topAreaCount = Math.max(0, ...Object.values(areaCounts));

        const stats = {
            totalRatings,
            memberCount:    usersSize,
            visitedCount:   pubsArray.filter(p => p.status === 'visited').length,
            toVisitCount:   newPubsArray.length,
            criteriaCount:  criteriaArray.length,
            hasPrices,
            overallAvg:     overallAvgNum,
            topAreaCount,
            hasLiveLocation: !!livePubId,
        };

        return BADGE_DEFS.map(def => ({ ...def, unlocked: def.check(stats) }));
    }, [pubsArray, newPubsArray, scoresObj, criteriaArray, usersSize, overallAvgNum, livePubId]);

    /* ── Group Score Trend: last 10 visited pubs sorted by createdAt ── */
    const scoreTrendPoints = useMemo(() => {
        // Use weighted ranked pubs but re-sort by visit date (oldest → newest)
        const withDate = weightedRankedPubs
            .filter(p => p.createdAt?.toMillis && p.avgScore > 0)
            .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
            .slice(-10); // last 10 visits
        return withDate.map(p => ({ name: p.name, score: p.avgScore }));
    }, [weightedRankedPubs]);

    /* ── activity feed grouped by date ── */
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
        const today     = new Date(); today.setHours(0,0,0,0);
        const weekAgo   = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const groups    = {};
        sorted.forEach(item => {
            const d = new Date(item.time); d.setHours(0,0,0,0);
            let key;
            if (d.getTime() === today.getTime()) key = 'Today';
            else if (d >= weekAgo)               key = 'This Week';
            else                                 key = 'Earlier';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pubsArray, recentCrawls, criteriaArray, upcomingEvents, allUsers]);

    const overallAvg = overallAvgNum.toFixed(1);
    const livePub = pubsArray.find(p => p.id === livePubId);

    return (
        <div className="space-y-6 animate-fadeIn pb-20">

            {/* ── First Quest Banner ── */}
            {user && !hasCompletedFirstQuest && (
                <div className="bg-gradient-to-r from-brand to-brand-dark rounded-2xl p-5 text-white shadow-md border border-brand-light/10 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="heading-ui text-base sm:text-lg flex items-center gap-2 mb-1">
                                <span className="animate-bounce text-xl">🏆</span> Your First Quest
                            </h3>
                            <p className="text-xs sm:text-sm font-medium opacity-90 max-w-lg font-body">
                                Welcome to the crew! Head to the Directory and drop your first rating to unlock the 'First Pint' badge.
                            </p>
                        </div>
                        <button
                            onClick={() => setPage('pubs')}
                            className="btn-brand bg-white text-brand hover:bg-brand-highlight hover:text-brand-dark px-5 py-2.5 rounded-xl font-bold text-xs self-start sm:self-auto cursor-pointer transition-all shadow-md border-none"
                        >
                            Start Rating →
                        </button>
                    </div>
                    <div className="absolute right-[-2.5rem] top-[-2.5rem] w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                </div>
            )}

            {/* ── Page heading ── */}
            <div className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h2 className="text-page-title">Group Dashboard</h2>
                    <p className="text-muted mt-1">Your city's drinking analytics.</p>
                </div>

                {/* ── Member Leaderboard Mini ── */}
                {memberLeaderboard.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2 bg-surface border border-border rounded-2xl p-2 shadow-sm">
                        <span className="text-xs mr-1.5 opacity-60">🏆</span>
                        {memberLeaderboard.map((member, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-body transition-colors ${
                                    member.isMe
                                        ? 'bg-brand text-white shadow-xs'
                                        : 'bg-surface-offset border border-border text-text'
                                }`}
                            >
                                <span className="text-xs leading-none">{MEDAL[i]}</span>
                                <span
                                    className="max-w-[7rem] overflow-hidden text-ellipsis whitespace-nowrap"
                                >
                                    {member.name}
                                </span>
                                <span
                                    className={`font-semibold ${
                                        member.isMe ? 'text-white/80' : 'text-text-faint'
                                    }`}
                                >
                                    {member.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Badges Strip ── */}
            <BadgesStrip badges={badges} />

            {/* ══ HERO ROW: Pub of Month (left) + KPI cards (right) ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">

                {/* Pub of the Month */}
                <div
                    onClick={() => setPage('pubs')}
                    className="relative overflow-hidden rounded-2xl shadow-sm border border-border bg-surface-offset group cursor-pointer min-h-[16rem] transition-all duration-300 hover:shadow-md hover:-translate-y-1"
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
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                    <div className="relative z-10 h-full flex flex-col justify-between p-5">
                        <div>
                            <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                🔥 Pub of the Month
                            </span>
                        </div>
                        {spotlightPub ? (
                            <div>
                                <p className="text-white font-display text-xl leading-snug mb-1 drop-shadow-md">
                                    {spotlightPub.name}
                                </p>
                                <p className="text-white/70 text-xs font-bold font-body mb-3">
                                    📍 {spotlightPub.location}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="bg-brand text-white px-3 py-1 rounded-full font-extrabold text-sm font-body shadow-xs">
                                        {spotlightPub.avgScore.toFixed(1)}/10
                                    </span>
                                    <span className="text-white/60 text-xs font-semibold font-body">
                                        {scoreTierLabel(spotlightPub.avgScore).label}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center my-auto">
                                <span className="text-3xl">👑</span>
                                <p className="text-white/75 text-xs italic mt-2 font-body">
                                    Rate a pub to crown it here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <StatCard title="Visited Pubs"   value={pubsArray.length}    onClick={() => setPage('pubs')}    icon="🍺" />
                    <StatCard title="Pubs to Visit"  value={newPubsArray.length} onClick={() => setPage('toVisit')} icon="📋" />
                    <StatCard title="Total Raters"   value={usersSize}                                              icon="👥" />
                    <StatCard
                        title="Overall Average"
                        value={overallAvg}
                        subValue="Group Wide"
                        icon="⭐"
                    />
                    {user && (
                        <div className="col-span-1 sm:col-span-2 card-warm p-4 flex items-center gap-4">
                            <div className="flex-1">
                                <p className="text-label mb-2">My Rating Progress</p>
                                <div className="h-2 bg-surface-offset rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full transition-all duration-700"
                                        style={{
                                            width: pubsArray.length > 0 ? `${Math.min(100, (myRatedCount / pubsArray.length) * 100)}%` : '0%',
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-xs font-bold font-body text-brand whitespace-nowrap self-end mb-0.5">
                                {myRatedCount} / {pubsArray.length} pubs
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ ROW 2: Live Location + Guinness Index ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Live Location */}
                <div className="card-warm p-6 relative overflow-hidden">
                    {livePubId && <div className="absolute inset-0 bg-brand/5 pointer-events-none animate-pulse" />}
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-label mb-3">📍 Current Group Location</p>
                            {livePubId ? (
                                <div className="flex items-center gap-4 mb-4">
                                    {livePub?.photoURL ? (
                                        <img
                                            src={livePub.photoURL}
                                            alt={livePub.name}
                                            loading="lazy"
                                            width="56"
                                            height="56"
                                            className="w-14 h-14 rounded-xl object-cover border-2 border-brand-light shadow-sm"
                                        />
                                    ) : (
                                        <div className="text-3xl animate-bounce">📍</div>
                                    )}
                                    <p className="text-page-title text-brand leading-tight font-bold">{livePub?.name || 'Unknown Pub'}</p>
                                </div>
                            ) : (
                                <p className="text-section-heading mb-4 opacity-50 font-normal">Not currently at a pub.</p>
                            )}
                        </div>
                        
                        <div>
                            {isOwnerOrManager ? (
                                <>
                                    <select
                                        value={livePubId}
                                        onChange={handleSetLiveLocation}
                                        className="w-full px-4 py-3 border border-border rounded-xl bg-surface-2 text-text font-body font-semibold text-xs cursor-pointer shadow-xs outline-none focus:border-brand"
                                    >
                                        <option value="">🏠 Everyone went home</option>
                                        <optgroup label="Active Pubs">
                                            {pubsArray.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </optgroup>
                                    </select>
                                    {locationError && (
                                        <p className="mt-2 text-xs text-error font-semibold">{locationError}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-xs text-text-muted italic mt-2">
                                    Only the group owner or a manager can change the live location.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Guinness Index */}
                {(cheapestPint || priciestPint) ? (
                    <div className="bg-gradient-to-br from-brand-dark to-brand p-[1.5px] rounded-2xl shadow-sm">
                        <div className="bg-surface rounded-[calc(var(--radius-2xl)-1.5px)] p-6 h-full flex flex-col justify-between">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="text-3xl">🍺</span>
                                <div>
                                    <h3 className="text-section-heading font-display font-normal uppercase tracking-wider text-base">The Guinness Index</h3>
                                    <p className="text-muted text-[10px] uppercase font-bold tracking-wider">Tracking the exact price of a pint</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {cheapestPint && (
                                    <div className="bg-success-bg/10 border border-success/20 rounded-xl p-4 flex flex-col gap-2">
                                        {cheapestPint.pub.photoURL && (
                                            <img
                                                src={cheapestPint.pub.photoURL}
                                                alt={cheapestPint.pub.name}
                                                loading="lazy"
                                                width="48"
                                                height="48"
                                                className="w-12 h-12 rounded-lg object-cover mb-1 border border-success/10 shadow-xs"
                                            />
                                        )}
                                        <p className="text-label text-success">💚 Cheapest Pint</p>
                                        <p className="text-kpi text-lg">£{cheapestPint.avgPrice.toFixed(2)}</p>
                                        <p className="text-muted text-[10px] font-bold overflow-hidden text-ellipsis whitespace-nowrap">{cheapestPint.pub.name}</p>
                                    </div>
                                )}
                                {priciestPint && (
                                    <div className="bg-error-bg/10 border border-error/20 rounded-xl p-4 flex flex-col gap-2">
                                        {priciestPint.pub.photoURL && (
                                            <img
                                                src={priciestPint.pub.photoURL}
                                                alt={priciestPint.pub.name}
                                                loading="lazy"
                                                width="48"
                                                height="48"
                                                className="w-12 h-12 rounded-lg object-cover mb-1 border border-error/10 shadow-xs"
                                            />
                                        )}
                                        <p className="text-label text-error">❤️ Priciest Pint</p>
                                        <p className="text-kpi text-lg">£{priciestPint.avgPrice.toFixed(2)}</p>
                                        <p className="text-muted text-[10px] font-bold overflow-hidden text-ellipsis whitespace-nowrap">{priciestPint.pub.name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card-warm p-6 flex items-center justify-center opacity-40 min-h-[12rem]">
                        <p className="text-muted text-xs italic text-center">No pint prices logged yet.</p>
                    </div>
                )}
            </div>

            {/* ══ ROW 3: Biggest Debate + Dark Horse ══ */}
            {(biggestDebatePub || darkHorsePub) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {biggestDebatePub && (
                        <div
                            onClick={() => setPage('pubs')}
                            className="card-warm p-4 flex gap-4 items-center cursor-pointer transition-all duration-200 hover:border-brand/40"
                        >
                            {biggestDebatePub.photoURL ? (
                                <img
                                    src={biggestDebatePub.photoURL}
                                    alt={biggestDebatePub.name}
                                    loading="lazy"
                                    width="64"
                                    height="64"
                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border shadow-xs"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-surface-offset flex items-center justify-center text-3xl flex-shrink-0">⚡</div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-label text-warning mb-1">⚡ Biggest Debate</p>
                                <p className="text-card-title text-sm overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">{biggestDebatePub.name}</p>
                                <p className="text-muted text-[10px]">Members disagree • avg {biggestDebatePub.avgScore.toFixed(1)}/10</p>
                            </div>
                            <span className="text-lg font-black text-brand flex-shrink-0 font-body">{biggestDebatePub.avgScore.toFixed(1)}</span>
                        </div>
                    )}
                    {darkHorsePub && (
                        <div
                            onClick={() => setPage('pubs')}
                            className="card-warm p-4 flex gap-4 items-center cursor-pointer transition-all duration-200 hover:border-brand/40"
                        >
                            {darkHorsePub.photoURL ? (
                                <img
                                    src={darkHorsePub.photoURL}
                                    alt={darkHorsePub.name}
                                    loading="lazy"
                                    width="64"
                                    height="64"
                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border shadow-xs"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-surface-offset flex items-center justify-center text-3xl flex-shrink-0">🌑</div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-label text-purple-600 mb-1">🌑 Dark Horse</p>
                                <p className="text-card-title text-sm overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">{darkHorsePub.name}</p>
                                <p className="text-muted text-[10px]">High rating but only 1 review</p>
                            </div>
                            <span className="text-lg font-black text-brand flex-shrink-0 font-body">{darkHorsePub.avgScore.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ══ ROW 3.5: Last Pub Night Ticker + This Week's Mission ══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Last Pub Night Ticker */}
                <div className="card-warm p-5 sm:p-6 flex items-center gap-5 overflow-hidden relative">
                    <div className="absolute right-[-1rem] top-[-1rem] text-8xl opacity-5 pointer-events-none select-none">🍻</div>
                    <div
                        className={`flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center shadow-md ${
                            daysSinceLastVisit === null
                                ? 'bg-surface-offset border border-border'
                                : daysSinceLastVisit <= 7
                                    ? 'bg-gradient-to-br from-brand to-brand-dark border border-brand-light/10 text-white'
                                    : daysSinceLastVisit <= 14
                                        ? 'bg-gradient-to-br from-yellow-600 to-amber-500 text-white'
                                        : 'bg-gradient-to-br from-error to-rose-800 text-white'
                        }`}
                    >
                        <span className={`font-body font-black ${daysSinceLastVisit !== null && daysSinceLastVisit >= 100 ? 'text-base' : 'text-2xl'}`}>
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
                        <p className="text-muted text-[10px] mt-1 leading-normal">
                            {daysSinceLastVisit === null
                                ? 'Add your first pub visit to start tracking.'
                                : daysSinceLastVisit <= 7
                                    ? 'Still fresh — the crew is active! 🎉'
                                    : daysSinceLastVisit <= 14
                                        ? 'Been a while... time to plan a crawl?'
                                        : 'The pubs miss you. 🥺 Get one in!'}
                        </p>
                    </div>
                </div>

                {/* This Week's Mission */}
                <div
                    onClick={() => missionPub && setPage('toVisit')}
                    className={`card-warm relative overflow-hidden p-5 sm:p-6 flex flex-col justify-between min-h-[10rem] ${
                        missionPub ? 'cursor-pointer hover:border-brand/40' : 'cursor-default'
                    }`}
                >
                    {missionPub?.photoURL ? (
                        <img
                            src={missionPub.photoURL}
                            alt={missionPub.name}
                            loading="lazy"
                            width="600"
                            height="300"
                            className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-brand/5 pointer-events-none" />
                    )}
                    <div className="relative z-10 w-full">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">🎯</span>
                            <p className="text-label text-brand">This Week's Mission</p>
                            <span className="ml-auto text-[9px] font-black tracking-wider uppercase bg-brand text-white px-2 py-0.5 rounded-full shadow-xs">
                                Weekly
                            </span>
                        </div>
                        {missionPub ? (
                            <>
                                <p className="text-section-heading text-base sm:text-lg overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">
                                    {missionPub.name}
                                </p>
                                {missionPub.location && (
                                    <p className="text-muted text-[10px] mb-3">📍 {missionPub.location}</p>
                                )}
                                <p className="text-[11px] text-text-muted italic leading-normal">
                                    The crew is assigned to visit <strong>{missionPub.name}</strong> this week. It's on your hitlist — go explore!
                                </p>
                                <p className="mt-4 text-[10px] font-extrabold text-brand flex items-center gap-1">
                                    View on Hitlist →
                                </p>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <span className="text-2xl block mb-1">✅</span>
                                <p className="text-muted text-xs italic">No unvisited pubs on the list — you've conquered them all!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ ROW 5: Group Score Trend Sparkline ══ */}
            <div className="card-warm p-5 sm:p-6">
                <ScoreTrendSparkline points={scoreTrendPoints} />
            </div>

            {/* ══ ROW 4: Events + Activity Feed ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">

                {/* Upcoming Events */}
                <div className="card-warm p-5 flex flex-col justify-between lg:col-span-1 min-h-[16rem]">
                    <div>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-section-heading">Upcoming Events</h3>
                            <button
                                onClick={() => setPage('events')}
                                className="text-xs font-bold text-brand hover:underline cursor-pointer border-none bg-transparent"
                            >
                                View All
                            </button>
                        </div>
                        
                        {upcomingEvents.length === 0 ? (
                            <div className="text-center py-8 opacity-40">
                                <span className="text-3xl block mb-2">📅</span>
                                <p className="text-muted text-xs italic">No events planned.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 max-h-[18rem] overflow-y-auto pr-1">
                                {upcomingEvents.map(event => {
                                    const eventDate = new Date(event.date);
                                    const pub = pubsArray.find(p => p.id === event.pubId);
                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => setPage('events')}
                                            className="flex gap-3 items-center bg-surface-offset p-2.5 rounded-xl border border-border cursor-pointer transition-colors duration-150 hover:border-brand/40"
                                        >
                                            <div className="bg-brand text-white rounded-lg py-1.5 px-2.5 text-center min-w-[3.2rem] flex-shrink-0 shadow-xs">
                                                <p className="text-[9px] uppercase font-black leading-none font-body">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</p>
                                                <p className="text-base font-extrabold leading-none mt-1 font-body">{eventDate.getDate()}</p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-card-title text-sm overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">{event.title}</p>
                                                <p className="text-muted text-[10px] overflow-hidden text-ellipsis whitespace-nowrap">📍 {pub?.name || 'Unknown Pub'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Group Activity Feed */}
                <div className="card-warm p-5 sm:p-6 flex flex-col lg:col-span-2 min-h-[16rem]">
                    <h3 className="text-section-heading mb-5">Group Activity</h3>
                    {Object.keys(groupedTimeline).length === 0 ? (
                        <p className="text-muted text-xs italic text-center my-auto">No recent activity.</p>
                    ) : (
                        <div className="flex flex-col gap-5 overflow-y-auto max-h-[22rem] pr-2">
                            {['Today', 'This Week', 'Earlier'].filter(g => groupedTimeline[g]?.length).map(group => (
                                <div key={group} className="space-y-3">
                                    <p className="text-[10px] font-black font-body text-text-faint uppercase tracking-wider pb-1.5 border-b border-divider">{group}</p>
                                    <div className="relative border-l border-brand/20 ml-4 flex flex-col gap-4 pl-4 py-1">
                                        {groupedTimeline[group].map(item => (
                                            <div key={item.id} className="relative group">
                                                {/* Emoji marker dot */}
                                                <span className="absolute left-[-26px] top-1 bg-surface border border-brand/35 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-xs z-10 select-none">
                                                    {item.emoji}
                                                </span>
                                                <div className="bg-surface-offset p-3 rounded-xl border border-border shadow-xs">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[10px] font-black text-brand uppercase tracking-wider">{item.title}</p>
                                                        <p className="text-[9px] text-text-faint font-bold font-body bg-surface px-2 py-0.5 rounded-full border border-border">{item.dateLabel}</p>
                                                    </div>
                                                    <p className="text-xs font-semibold text-text/80">{item.text}</p>
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
