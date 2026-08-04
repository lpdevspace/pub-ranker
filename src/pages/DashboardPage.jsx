import React, { useState, useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const scoreTierLabel = (score) => {
    if (score >= 8.5) return { label: 'Legendary', color: 'var(--color-success)' };
    if (score >= 7)   return { label: 'Great',     color: 'var(--color-brand)' };
    if (score >= 5)   return { label: 'Decent',    color: 'var(--color-warning)' };
    return             { label: 'Avoid',            color: 'var(--color-error)' };
};

const MEDAL = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']; // 🥇🥈🥉

// Safe timestamp parsing to fix the toMillis() offline crash bug
const safeTime = (firebaseTimestamp) => {
    if (!firebaseTimestamp) return Date.now();
    if (typeof firebaseTimestamp.toMillis === 'function') return firebaseTimestamp.toMillis();
    return Date.now();
};

/* ─── sub-components ──────────────────────────────────────────────────────── */

export function StatCard({ title, value, subValue, onClick, icon }) {
    return (
        <div
            onClick={onClick}
            className={`card-premium p-5 flex items-center justify-between gap-4 ${onClick ? 'card-premium-hover cursor-pointer' : 'cursor-default'}`}
        >
            <div>
                <p className={`font-body font-bold text-[10px] uppercase tracking-wider mb-1 ${onClick ? 'text-brand' : 'text-muted'}`}>
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <p className="font-display text-3xl font-bold text-text leading-none">{value}</p>
                    {subValue && <p className="font-body text-xs font-semibold text-muted">{subValue}</p>}
                </div>
            </div>
            {icon && <div className="text-3xl opacity-20 bg-surface-offset w-12 h-12 flex items-center justify-center rounded-xl">{icon}</div>}
        </div>
    );
}

function HubButton({ title, icon, onClick, description }) {
    return (
        <div 
            onClick={onClick} 
            className="card-premium card-premium-hover p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer"
        >
            <div className="text-3xl bg-surface-offset p-4 rounded-2xl border border-border shadow-inner shrink-0">
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-text mb-1">{title}</h3>
                <p className="font-body text-xs font-semibold text-muted leading-relaxed">{description}</p>
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

    const [recentCrawls,   setRecentCrawls]   = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);

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
        return () => { unsubCrawls(); unsubEvents(); };
    }, [db, groupId]);

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
                    }
                });
            });
            const avg = totalWeight > 0 ? totalScore / totalWeight : 0;
            return { ...pub, avgScore: avg };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [pubsArray, scoresObj, effectiveWeights]);

    const spotlightPub = weightedRankedPubs[0];

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

    /* ── overall average ── */
    const overallAvgNum = weightedRankedPubs.length > 0
        ? weightedRankedPubs.reduce((sum, p) => sum + p.avgScore, 0) / weightedRankedPubs.length
        : 0;
    const overallAvg = overallAvgNum.toFixed(1);

    /* ── activity feed grouped by date ── */
    const groupedTimeline = useMemo(() => {
        const items = [];
        pubsArray.forEach(p => {
            if (p.createdAt) {
                const addedBy = p.addedBy ? getUserName(p.addedBy) : 'Someone';
                items.push({ id: `pub_${p.id}`, emoji: '🍺', title: 'New Pub Added', text: `${addedBy} added ${p.name} to the list.`, time: safeTime(p.createdAt) });
            }
        });
        recentCrawls.forEach(c => {
            if (c.createdAt) items.push({ id: `crawl_${c.id}`, emoji: '🗺️', title: 'Crawl Planned', text: `${c.creatorName} planned: ${c.name}`, time: safeTime(c.createdAt) });
        });
        upcomingEvents.forEach(e => {
            if (e.createdAt) items.push({ id: `event_${e.id}`, emoji: '📅', title: 'Event Scheduled', text: `${e.title} was added to the calendar.`, time: safeTime(e.createdAt) });
        });
        
        const sorted = items.sort((a, b) => b.time - a.time).slice(0, 20);
        return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pubsArray, recentCrawls, upcomingEvents, allUsers]);

    return (
        <div className="space-y-8 animate-fadeIn pb-24">
            {/* ── First Quest Banner ── */}
            {user && !hasCompletedFirstQuest && (
                <div className="card-premium hero-gradient grain-overlay p-6 md:p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="relative z-10">
                        <h3 className="font-display text-2xl font-bold mb-2 flex items-center gap-3">
                            <span>🏆</span> Your First Quest
                        </h3>
                        <p className="font-body text-sm font-semibold text-white/90 max-w-lg">
                            Welcome to the crew! Head to the Directory and drop your first rating to get started.
                        </p>
                    </div>
                    <button
                        onClick={() => setPage('pubs')}
                        className="relative z-10 bg-white text-brand hover:bg-gray-50 px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:-translate-y-1"
                    >
                        Start Rating →
                    </button>
                </div>
            )}

            {/* ── Page heading (Clean) ── */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="relative z-10">
                    <h2 className="font-display text-3xl md:text-4xl font-bold mb-1 text-text">
                        Welcome {userProfile?.nickname || userProfile?.displayName || 'User'} to {groupData?.groupName || 'your group'}
                    </h2>
                    <p className="font-body text-sm font-semibold text-muted">Here is your group at a glance.</p>
                </div>

                {/* ── Member Leaderboard Mini ── */}
                {memberLeaderboard.length > 0 && (
                    <div className="relative z-10 flex items-center flex-wrap gap-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-inner">
                        <span className="text-sm mr-2 opacity-80">🏆</span>
                        {memberLeaderboard.map((member, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold font-body transition-colors ${
                                    member.isMe
                                        ? 'bg-white text-brand shadow-md'
                                        : 'bg-black/30 border border-white/10 text-white'
                                }`}
                            >
                                <span className="text-sm leading-none drop-shadow-sm">{MEDAL[i]}</span>
                                <span className="max-w-[8rem] overflow-hidden text-ellipsis whitespace-nowrap">
                                    {member.name}
                                </span>
                                <span className={`font-semibold ${member.isMe ? 'opacity-80' : 'opacity-60'}`}>
                                    {member.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══ HERO ROW: Pub of Month (left) + Navigation Grid (right) ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-stretch">
                
                {/* Pub of the Month */}
                <div
                    onClick={() => setPage('pubs')}
                    className="card-premium card-premium-hover group cursor-pointer min-h-[16rem] lg:min-h-[22rem] relative overflow-hidden flex flex-col justify-end"
                >
                    {spotlightPub?.photoURL ? (
                        <img
                            src={spotlightPub.photoURL}
                            alt={spotlightPub.name}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-offset" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    
                    <div className="absolute top-4 left-4 z-10">
                        <span className="bg-brand text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md backdrop-blur-md">
                            Highest Rated
                        </span>
                    </div>

                    <div className="relative z-10 p-5 w-full">
                        {spotlightPub ? (
                            <div className="flex justify-between items-end gap-4">
                                <div className="flex-1">
                                    <p className="text-white font-display text-2xl sm:text-3xl font-bold leading-tight mb-1 drop-shadow-lg truncate">
                                        {spotlightPub.name}
                                    </p>
                                    <p className="text-white/70 text-xs font-semibold font-body truncate drop-shadow-md">
                                        {spotlightPub.location}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end shrink-0">
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-xl shadow-lg flex flex-col items-center">
                                        <span className="font-black text-lg leading-none">{spotlightPub.avgScore.toFixed(1)}</span>
                                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 mt-1">{scoreTierLabel(spotlightPub.avgScore).label}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-white/80 pb-4">
                                <p className="text-sm font-bold">Rate a pub to crown it here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI & Hub Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {/* Top Level Stats */}
                    <div className="sm:col-span-2 grid grid-cols-2 gap-4 md:gap-6">
                        <StatCard title="Pubs Rated" value={pubsArray.length} onClick={() => setPage('pubs')} icon="🍺" />
                        <StatCard title="Avg Score" value={overallAvg} onClick={() => setPage('insights')} icon="⭐" />
                    </div>

                    {/* Navigation Buttons */}
                    <HubButton 
                        title="Pub Directory" 
                        description="View all rated pubs and filter by scores."
                        icon="🍺" 
                        onClick={() => setPage('pubs')} 
                    />
                    <HubButton 
                        title="Leaderboards" 
                        description="See who ranks highest in your group."
                        icon="🏆" 
                        onClick={() => setPage('leaderboard')} 
                    />
                    <HubButton 
                        title="Insights & Stats" 
                        description="Deep dive into your drinking analytics."
                        icon="📊" 
                        onClick={() => setPage('insights')} 
                    />
                    <HubButton 
                        title="Map View" 
                        description="See all visited pubs plotted geographically."
                        icon="🗺️" 
                        onClick={() => setPage('map')} 
                    />
                    <HubButton 
                        title="Hitlist" 
                        description="View pubs you've flagged to visit next."
                        icon="📋" 
                        onClick={() => setPage('toVisit')} 
                    />
                    <HubButton 
                        title="Events" 
                        description="Plan your next group crawl or social."
                        icon="📅" 
                        onClick={() => setPage('events')} 
                    />
                </div>
            </div>


        </div>
    );
}
