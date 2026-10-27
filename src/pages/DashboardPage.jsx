import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin,
    Beer,
    Trophy,
    Calendar,
    Users,
    Navigation,
    ArrowRight,
    Sparkles,
    Flame,
    Shuffle,
    Star,
    Compass,
    Plus,
    Search,
    ChevronRight,
    Bookmark,
    Check,
    TrendingUp,
    Clock,
    Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { useUI } from '../context/UIContext';
import { SAMPLE_CRAWLS, SAMPLE_EVENTS } from '../data/sampleTavernData';

export default function DashboardPage({
    groupData,
    pubs = [],
    scores = {},
    criteria = [],
    onViewDetail,
    onSelectPub,
    isShowingSampleFallback,
    seedRealData,
    isSeeding
}) {
    const { user, isDemo, userProfile } = useAuth();
    const { groupName, groupId, db } = useGroup();
    const { setPage, openSearch, themeId } = useUI();

    const [recentCrawls, setRecentCrawls] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    const pubsArray = Array.isArray(pubs) ? pubs : [];
    const criteriaArray = Array.isArray(criteria) ? criteria : [];
    const scoresObj = scores || {};

    // ── Metric: Unique Raters ─────────────────────────────────────────────────
    const uniqueRaters = useMemo(() => {
        const uids = new Set();
        Object.values(scoresObj).forEach(pubCritMap => {
            if (!pubCritMap || typeof pubCritMap !== 'object') return;
            Object.values(pubCritMap).forEach(scoreList => {
                if (Array.isArray(scoreList)) {
                    scoreList.forEach(s => {
                        if (s && s.userId) uids.add(s.userId);
                    });
                }
            });
        });
        return Math.max(uids.size, 1);
    }, [scoresObj]);

    useEffect(() => {
        if (!groupId) return;
        if (groupId === 'demo-group') {
            setRecentCrawls(SAMPLE_CRAWLS);
            setUpcomingEvents(SAMPLE_EVENTS);
            return;
        }
        if (!db) return;
        const unsubCrawls = db.collection('crawls')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(
                snap => setRecentCrawls(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
                err => console.warn('Crawls snapshot error:', err)
            );

        const unsubEvents = db.collection('events')
            .where('groupId', '==', groupId)
            .orderBy('date', 'asc')
            .onSnapshot(
                snap => {
                    const now = new Date().toISOString().split('T')[0];
                    setUpcomingEvents(
                        snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.date >= now).slice(0, 5)
                    );
                },
                err => console.warn('Events snapshot error:', err)
            );

        return () => { unsubCrawls(); unsubEvents(); };
    }, [db, groupId]);

    // ── Weighted rankings calculation ─────────────────────────────────────────
    const effectiveWeights = useMemo(() => {
        const map = {};
        criteriaArray.forEach(c => { map[c.id] = c.weight ?? 1; });
        return map;
    }, [criteriaArray]);

    const rankedPubs = useMemo(() => {
        return pubsArray.map(pub => {
            const pubScores = scoresObj[pub.id] || {};
            let weightedSum = 0;
            let totalWeight = 0;

            criteriaArray.forEach(crit => {
                if (crit.type === 'text') return;
                const scoreEntries = pubScores[crit.id] || [];
                const validVals = scoreEntries
                    .map(s => (typeof s === 'object' ? s.value : s))
                    .filter(v => typeof v === 'number' && !isNaN(v));

                if (validVals.length > 0) {
                    const critAvg = validVals.reduce((a, b) => a + b, 0) / validVals.length;
                    const weight = effectiveWeights[crit.id] ?? 1;
                    weightedSum += critAvg * weight;
                    totalWeight += weight;
                }
            });

            const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
            return {
                ...pub,
                avgScore,
                hasRatings: totalWeight > 0
            };
        });
    }, [pubsArray, scoresObj, criteriaArray, effectiveWeights]);

    // Overall group score average
    const overallAvg = useMemo(() => {
        const withScores = rankedPubs.filter(p => p.hasRatings);
        if (withScores.length === 0) return '—';
        const sum = withScores.reduce((acc, p) => acc + p.avgScore, 0);
        return (sum / withScores.length).toFixed(1);
    }, [rankedPubs]);

    const visitedCount = pubsArray.filter(p => p.status === 'visited' || (scoresObj[p.id] && Object.keys(scoresObj[p.id]).length > 0)).length;
    const hitListPubs = useMemo(() => pubsArray.filter(p => p.status === 'to_visit' || p.status === 'hitlist'), [pubsArray]);
    const hitListCount = hitListPubs.length;

    // Pint Prices
    const pintPrices = useMemo(() => {
        const withPrices = pubsArray.filter(p => typeof p.pintPrice === 'number' && p.pintPrice > 0);
        if (withPrices.length === 0) {
            return {
                cheapest: { price: 5.30, pubName: 'The Royal Oak' },
                priciest: { price: 6.70, pubName: 'The Holly Bush' }
            };
        }
        const sorted = [...withPrices].sort((a, b) => a.pintPrice - b.pintPrice);
        return {
            cheapest: { price: sorted[0].pintPrice, pubName: sorted[0].name },
            priciest: { price: sorted[sorted.length - 1].pintPrice, pubName: sorted[sorted.length - 1].name }
        };
    }, [pubsArray]);

    const topRankedPubs = useMemo(() => {
        return [...rankedPubs]
            .filter(p => p.hasRatings)
            .sort((a, b) => b.avgScore - a.avgScore);
    }, [rankedPubs]);

    const topPodium = topRankedPubs.slice(0, 3);
    const leaderboardRemainder = topRankedPubs.slice(3, 8);
    const spotlightPub = topRankedPubs[0] || null;

    const fallbackPhotos = [
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80'
    ];

    return (
        <div className="w-full space-y-8 animate-fadeIn pb-12">
            {/* ── Demo Banner (Only in Demo Mode) ── */}
            {isDemo && (
                <div className="rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">
                        ⚡ Previewing live group data for &ldquo;{groupName || 'The Sovereign Pint Society'}&rdquo;
                    </span>
                    <button
                        onClick={() => setPage('pubs')}
                        className="font-bold text-[var(--color-brand)] hover:underline"
                    >
                        View Full Pub Directory →
                    </button>
                </div>
            )}

            {/* ── Real Data Preview & Seed Banner ── */}
            {isShowingSampleFallback && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shrink-0">
                            🍺
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-display font-extrabold text-sm sm:text-base text-[var(--color-text)]">
                                    Displaying 10 Authentic UK Pubs
                                </h4>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    Preview Mode
                                </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                Your group has no pubs yet. Click to permanently save these 10 classic venues, criteria, and sample ratings into your database.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            if (seedRealData) {
                                await seedRealData(user);
                            }
                        }}
                        disabled={isSeeding}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-md hover:shadow-amber-500/20 flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {isSeeding ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                <span>Saving to Database…</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 fill-current" />
                                <span>Save Pubs to Database</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* ── Welcome Header & Action Buttons ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-[var(--color-divider)]">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                            {groupName || 'The Sovereign Pint Society'}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">•</span>
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">
                            {uniqueRaters} active {uniqueRaters === 1 ? 'member' : 'members'}
                        </span>
                    </div>
                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
                        Tavern Intelligence Hub
                    </h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xl">
                        Democratic pub benchmarks, live pint inflation tracking, and curated collective routes.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                        onClick={() => setPage('crawl')}
                        className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-xs font-bold text-[var(--color-text)] transition flex items-center gap-2 shadow-sm"
                    >
                        <Compass className="w-4 h-4 text-amber-500" />
                        <span>Plan Crawl</span>
                    </button>

                    <button
                        onClick={() => setPage('spin')}
                        className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-xs font-bold text-[var(--color-text)] transition flex items-center gap-2 shadow-sm"
                    >
                        <Shuffle className="w-4 h-4 text-purple-400" />
                        <span>Spin Wheel</span>
                    </button>

                    <button
                        onClick={() => setPage('pubs')}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-md hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Rate a Pub</span>
                    </button>
                </div>
            </div>

            {/* ── 4 High-Impact KPI Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* 1. Visited Pubs */}
                <div
                    onClick={() => setPage('pubs')}
                    className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand)] transition-all cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition">
                            Conquered
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                            <Beer className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
                        {visitedCount}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                        Watering holes ranked
                    </p>
                </div>

                {/* 2. Hit List */}
                <div
                    onClick={() => setPage('pubs')}
                    className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand)] transition-all cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition">
                            The Hit List
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                            <Bookmark className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
                        {hitListCount}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                        Queued for next crawl
                    </p>
                </div>

                {/* 3. Tasting Crew */}
                <div
                    onClick={() => setPage('activity')}
                    className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand)] transition-all cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition">
                            Tasting Crew
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
                        {uniqueRaters}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                        Active scoring contributors
                    </p>
                </div>

                {/* 4. Group Pint Benchmark */}
                <div
                    onClick={() => setPage('leaderboard')}
                    className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand)] transition-all cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition">
                            Group Score
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                            <Star className="w-4 h-4 fill-current" />
                        </div>
                    </div>
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--color-brand)] tracking-tight">
                        {overallAvg} <span className="text-base sm:text-lg font-normal text-[var(--color-text-muted)]">/ 10</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                        Democratic city benchmark
                    </p>
                </div>
            </div>

            {/* ── Main Layout: Clean Balanced 2-Column Split ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* ── Left Main Column (7 of 12 cols): Podium & Leaderboard & Guinness Index ── */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Section: Top Rated Watering Holes */}
                    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 sm:p-6 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)]">
                            <div className="flex items-center gap-2.5">
                                <Trophy className="w-5 h-5 text-[var(--color-brand)]" />
                                <div>
                                    <h2 className="font-display text-lg font-bold text-[var(--color-text)]">
                                        Top Rated Watering Holes
                                    </h2>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Weighted scores across atmosphere, pint quality, and decor
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPage('leaderboard')}
                                className="text-xs font-bold text-[var(--color-brand)] hover:underline flex items-center gap-1 shrink-0"
                            >
                                <span>Leaderboard</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {topRankedPubs.length === 0 ? (
                            /* Clean Empty State */
                            <div className="py-12 px-4 text-center space-y-3">
                                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center text-3xl text-[var(--color-brand)]">
                                    🍺
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-display font-bold text-base text-[var(--color-text)]">
                                        No pubs ranked yet in {groupName}
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                                        Rate your regular local to inaugurate the leaderboard and crown the #1 champion.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <button
                                        onClick={() => setPage('pubs')}
                                        className="px-4 py-2 rounded-xl bg-[var(--color-brand)] text-[var(--color-text-inverse)] font-bold text-xs hover:opacity-90 transition inline-flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Rate Your First Pub</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Top 3 Podium Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {topPodium.map((pub, idx) => {
                                        const medals = [
                                            { medal: '🥇 1st', color: 'from-amber-500/20 to-amber-600/5 border-amber-500/40 text-amber-400' },
                                            { medal: '🥈 2nd', color: 'from-slate-400/20 to-slate-500/5 border-slate-400/40 text-slate-300' },
                                            { medal: '🥉 3rd', color: 'from-amber-700/20 to-amber-800/5 border-amber-700/40 text-amber-600' }
                                        ];
                                        const medalInfo = medals[idx] || medals[0];
                                        const photoSrc = pub.photoURL || fallbackPhotos[idx % fallbackPhotos.length];

                                        return (
                                            <div
                                                key={pub.id}
                                                onClick={() => onViewDetail ? onViewDetail(pub) : setPage('pubs')}
                                                className={`p-3.5 rounded-xl bg-gradient-to-b ${medalInfo.color} border hover:border-[var(--color-brand)] transition-all cursor-pointer group flex flex-col justify-between`}
                                            >
                                                <div className="space-y-2.5">
                                                    <div className="h-24 w-full rounded-lg overflow-hidden relative bg-[var(--color-surface-2)]">
                                                        <img
                                                            src={photoSrc}
                                                            alt={pub.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = fallbackPhotos[0];
                                                            }}
                                                        />
                                                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-black">
                                                            {medalInfo.medal}
                                                        </div>
                                                        <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-sm">
                                                            <Star className="w-3 h-3 fill-current" />
                                                            <span>{pub.avgScore.toFixed(1)}</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h4 className="font-bold text-sm text-[var(--color-text)] group-hover:text-[var(--color-brand)] transition truncate">
                                                            {pub.name}
                                                        </h4>
                                                        <p className="text-[11px] text-[var(--color-text-muted)] truncate flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3 text-[var(--color-brand)] shrink-0" />
                                                            <span>{pub.location || 'Local Pub'}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-2.5 border-t border-[var(--color-divider)] flex items-center justify-between text-xs">
                                                    <span className="text-[11px] text-[var(--color-text-muted)]">Pint:</span>
                                                    <span className="font-bold text-emerald-400">
                                                        {pub.pintPrice ? `£${pub.pintPrice.toFixed(2)}` : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pubs 4 to 8: Clean Streamlined Rows */}
                                {leaderboardRemainder.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t border-[var(--color-divider)]">
                                        {leaderboardRemainder.map((pub, idx) => {
                                            const rankNum = idx + 4;
                                            const fillPct = Math.min(Math.max((pub.avgScore / 10) * 100, 10), 100);
                                            return (
                                                <div
                                                    key={pub.id}
                                                    onClick={() => onViewDetail ? onViewDetail(pub) : setPage('pubs')}
                                                    className="p-2.5 rounded-xl hover:bg-[var(--color-surface-2)] transition cursor-pointer group flex items-center justify-between gap-3 border border-transparent hover:border-[var(--color-border)]"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="w-6 text-center font-display font-black text-xs text-[var(--color-text-muted)] shrink-0">
                                                            #{rankNum}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-xs sm:text-sm text-[var(--color-text)] group-hover:text-[var(--color-brand)] transition truncate">
                                                                {pub.name}
                                                            </h4>
                                                            <span className="text-[11px] text-[var(--color-text-muted)] truncate block">
                                                                {pub.location || 'Central'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {pub.pintPrice && (
                                                            <span className="text-xs font-semibold text-emerald-400 hidden sm:inline">
                                                                £{pub.pintPrice.toFixed(2)}
                                                            </span>
                                                        )}
                                                        <div className="w-14 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden hidden md:block">
                                                            <div
                                                                className="h-full rounded-full bg-[var(--color-brand)]"
                                                                style={{ width: `${fillPct}%` }}
                                                            />
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded-lg bg-[var(--color-surface-2)] text-xs font-black text-[var(--color-text)] border border-[var(--color-border)] tabular-nums">
                                                            {pub.avgScore.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* The Guinness & Pint Index */}
                    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-divider)]">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🍺</span>
                                <div>
                                    <h3 className="font-display text-sm font-bold text-[var(--color-text)]">
                                        The Guinness & Pint Index
                                    </h3>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">
                                        Live pint price tracking across your collective
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                Live Tracking
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                    Best Value Pint
                                </span>
                                <div className="font-display font-black text-2xl text-[var(--color-text)]">
                                    £{pintPrices.cheapest.price.toFixed(2)}
                                </div>
                                <div className="text-xs text-[var(--color-text-muted)] truncate">
                                    {pintPrices.cheapest.pubName}
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                                    Top Shelf Pint
                                </span>
                                <div className="font-display font-black text-2xl text-[var(--color-text)]">
                                    £{pintPrices.priciest.price.toFixed(2)}
                                </div>
                                <div className="text-xs text-[var(--color-text-muted)] truncate">
                                    {pintPrices.priciest.pubName}
                                </div>
                            </div>
                        </div>

                        {/* Price Spread Bar */}
                        <div className="p-3 rounded-xl bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] flex items-center justify-between text-xs">
                            <span className="text-[var(--color-text-muted)]">
                                Pint Spread: <strong className="text-[var(--color-text)]">£{(pintPrices.priciest.price - pintPrices.cheapest.price).toFixed(2)}</strong> per pint
                            </span>
                            <span className="font-semibold text-emerald-400">
                                Round of 4 savings: £{((pintPrices.priciest.price - pintPrices.cheapest.price) * 4).toFixed(2)}
                            </span>
                        </div>
                    </div>

                </div>

                {/* ── Right Side Column (5 of 12 cols): Spotlight Venue, Crawls & Hit List ── */}
                <div className="lg:col-span-5 space-y-6">

                    {/* Spotlight Pub Card */}
                    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-amber-500" />
                                <span>Crown Venue of the Month</span>
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                #1 Seed
                            </span>
                        </div>

                        {spotlightPub ? (
                            <div
                                onClick={() => onViewDetail ? onViewDetail(spotlightPub) : setPage('pubs')}
                                className="cursor-pointer group space-y-3"
                            >
                                <div className="h-44 w-full rounded-xl overflow-hidden relative bg-[var(--color-surface-2)]">
                                    <img
                                        src={spotlightPub.photoURL || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80'}
                                        alt={spotlightPub.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                                        <div>
                                            <h4 className="font-display font-extrabold text-base text-white group-hover:text-amber-400 transition truncate">
                                                {spotlightPub.name}
                                            </h4>
                                            <p className="text-xs text-white/80 truncate">
                                                {spotlightPub.location || 'Central London'}
                                            </p>
                                        </div>
                                        <div className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shrink-0">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            <span>{spotlightPub.avgScore.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                                    <span className="text-[var(--color-text-muted)]">Pint Price</span>
                                    <span className="font-bold text-emerald-400">
                                        {spotlightPub.pintPrice ? `£${spotlightPub.pintPrice.toFixed(2)}` : '£5.60'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-10 text-center text-xs text-[var(--color-text-muted)] space-y-2">
                                <div className="text-2xl">👑</div>
                                <p className="font-bold text-[var(--color-text)]">The Throne is Unclaimed</p>
                                <p>Rate pubs to crown your group&apos;s #1 watering hole.</p>
                            </div>
                        )}
                    </div>

                    {/* Recent & Upcoming Crawls */}
                    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-divider)]">
                            <span className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                                <Compass className="w-4 h-4 text-blue-400" />
                                <span>Recent & Upcoming Crawls</span>
                            </span>
                            <button
                                onClick={() => setPage('crawl')}
                                className="text-xs font-bold text-[var(--color-brand)] hover:underline"
                            >
                                Plan Crawl
                            </button>
                        </div>

                        {recentCrawls.length === 0 ? (
                            <div className="py-4 text-center text-xs text-[var(--color-text-muted)] space-y-2">
                                <p>No crawls recorded yet.</p>
                                <button
                                    onClick={() => setPage('crawl')}
                                    className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] text-[var(--color-brand)] font-bold text-xs transition"
                                >
                                    + Create first crawl
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentCrawls.slice(0, 3).map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => setPage('crawl')}
                                        className="p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] cursor-pointer transition text-xs flex items-center justify-between"
                                    >
                                        <div>
                                            <span className="font-bold text-[var(--color-text)] block truncate max-w-[170px]">
                                                {c.name || 'Historic Tavern Trail'}
                                            </span>
                                            <span className="text-[11px] text-[var(--color-text-muted)]">
                                                {c.pubIds?.length || 4} pubs on route
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[var(--color-brand)]" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Hit List Queue */}
                    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-divider)]">
                            <span className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                                <Bookmark className="w-4 h-4 text-emerald-400" />
                                <span>Next on Hit List</span>
                            </span>
                            <button
                                onClick={() => setPage('pubs')}
                                className="text-xs font-bold text-[var(--color-brand)] hover:underline"
                            >
                                All Pubs
                            </button>
                        </div>

                        {hitListPubs.length === 0 ? (
                            <p className="text-xs text-[var(--color-text-muted)] py-3 text-center">
                                Your hit list is clear! Queue up a watering hole in the directory.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {hitListPubs.slice(0, 3).map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => onViewDetail ? onViewDetail(p) : setPage('pubs')}
                                        className="p-2.5 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] cursor-pointer transition text-xs flex items-center justify-between"
                                    >
                                        <div className="min-w-0">
                                            <span className="font-bold text-[var(--color-text)] block truncate max-w-[160px]">
                                                {p.name}
                                            </span>
                                            <span className="text-[11px] text-[var(--color-text-muted)] truncate block">
                                                {p.location || 'Local'}
                                            </span>
                                        </div>
                                        <span className="px-2 py-1 rounded-md bg-[var(--color-brand)] text-[var(--color-text-inverse)] font-bold text-[10px] shrink-0">
                                            Rate →
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}
