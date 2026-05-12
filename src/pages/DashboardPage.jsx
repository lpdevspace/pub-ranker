import React, { useState, useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
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

/* ─── sub-components ──────────────────────────────────────────────────────── */

export function HorizontalBarChart({ data }) {
    const chartRef          = useRef(null);
    const chartInstanceRef  = useRef(null);

    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        const ctx = chartRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.x.toFixed(2)} / 10`,
                        },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 10,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { family: 'Satoshi, Inter, sans-serif', size: 11 } },
                    },
                    y: {
                        ticks: {
                            font: { family: 'Satoshi, Inter, sans-serif', weight: '600', size: 12 },
                            callback: (val, idx) => {
                                const label = data.labels[idx];
                                return label && label.length > 22 ? label.slice(0, 20) + '\u2026' : label;
                            },
                        },
                    },
                },
            },
        });
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [data]);

    return <canvas ref={chartRef} />;
}

export function DonutChart({ data }) {
    const chartRef         = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        const ctx = chartRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'doughnut',
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Satoshi, Inter, sans-serif', weight: '600', size: 12 },
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 8,
                        },
                    },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} pubs` } },
                },
            },
        });
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [data]);

    return <canvas ref={chartRef} />;
}

export function StatCard({ title, value, subValue, onClick, icon }) {
    return (
        <div
            onClick={onClick}
            className="card-warm"
            style={{ padding: 'var(--space-5)', cursor: onClick ? 'pointer' : 'default', transition: 'all var(--transition-interactive)' }}
            onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; } }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <p className="text-label" style={{ color: onClick ? 'var(--color-brand)' : undefined }}>
                    {title} {onClick && '\u2197'}
                </p>
                {icon && <span style={{ fontSize: '1.25rem', opacity: 0.6 }}>{icon}</span>}
            </div>
            <p className="text-kpi" style={{ marginTop: 'var(--space-1)' }}>{value}</p>
            {subValue && <p className="text-muted" style={{ marginTop: 'var(--space-2)', fontWeight: 600 }}>{subValue}</p>}
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

    // Derive whether the current user is owner or manager of this group.
    // Used to gate the Live Location control so only privileged users can move the pin.
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

    // SECURITY FIX: Only group owners/managers may update the live location.
    // The Firestore rule also enforces this server-side; this guard provides
    // an early client-side check to avoid unnecessary failed writes.
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

    /* ── top rater (most pubs scored) ── */
    const topRater = useMemo(() => {
        const counts = {};
        pubsArray.forEach(pub => {
            Object.values(scoresObj[pub.id] ?? {}).forEach(criterionScores => {
                (criterionScores || []).forEach(s => {
                    if (s.userId) counts[s.userId] = (counts[s.userId] || 0) + 1;
                });
            });
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (!sorted.length) return null;
        const [uid, count] = sorted[0];
        return { name: getUserName(uid), count };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pubsArray, scoresObj, allUsers]);

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

    /* ── chart data ── */
    const pubChartData = useMemo(() => {
        const top = weightedRankedPubs.slice(0, 10);
        return {
            labels: top.map(p => p.name || ''),
            datasets: [{
                label: 'Average Score',
                data: top.map(p => parseFloat(p.avgScore.toFixed(2))),
                backgroundColor: top.map(p => scoreTierBg(p.avgScore)),
                borderRadius: 5,
            }],
        };
    }, [weightedRankedPubs]);

    const donutData = useMemo(() => {
        const tiers = { Legendary: 0, Great: 0, Decent: 0, Avoid: 0 };
        weightedRankedPubs.forEach(p => { tiers[scoreTierLabel(p.avgScore).label]++; });
        return {
            labels: Object.keys(tiers),
            datasets: [{
                data: Object.values(tiers),
                backgroundColor: [
                    'rgba(180,100,20,0.85)',
                    'rgba(210,155,30,0.85)',
                    'rgba(234,179,8,0.75)',
                    'rgba(180,40,40,0.75)',
                ],
                borderWidth: 2,
                borderColor: 'var(--color-surface)',
            }],
        };
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

    const overallAvg = weightedRankedPubs.length > 0
        ? (weightedRankedPubs.reduce((sum, p) => sum + p.avgScore, 0) / weightedRankedPubs.length).toFixed(1)
        : 0;

    const livePub = pubsArray.find(p => p.id === livePubId);

    /* ── card style helpers ── */
    const cardBase = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' };
    const padded   = { ...cardBase, padding: 'var(--space-6)' };

    /* ─────────────────────────────────────────────────────────────────────── */
    return (
        <div className="space-y-6 animate-fadeIn pb-20">

            {/* ── First Quest Banner ── */}
            {user && !hasCompletedFirstQuest && (
                <div style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', color: '#fff', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden', border: '1px solid var(--color-brand-light)' }} className="group">
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                                <span className="animate-bounce" style={{ fontSize: '1.5rem' }}>&#x1F3C6;</span> Your First Quest
                            </h3>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 400, opacity: 0.9, maxWidth: '28rem', fontFamily: 'var(--font-body)' }}>
                                Welcome to the crew! Head to the Directory and drop your first rating to unlock the 'First Pint' badge.
                            </p>
                        </div>
                        <button onClick={() => setPage('pubs')} className="hidden sm:block" style={{ padding: 'var(--space-2) var(--space-6)', background: '#fff', color: 'var(--color-brand-dark)', fontWeight: 700, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: 'none', cursor: 'pointer' }}>
                            Start Rating &rarr;
                        </button>
                    </div>
                    <div style={{ position: 'absolute', right: '-2.5rem', top: '-2.5rem', width: '10rem', height: '10rem', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(2rem)', pointerEvents: 'none' }} />
                </div>
            )}

            {/* ── Page heading ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                    <h2 className="text-page-title">Group Dashboard</h2>
                    <p className="text-muted" style={{ marginTop: 'var(--space-1)' }}>Your city's drinking analytics.</p>
                </div>
                {topRater && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', padding: 'var(--space-2) var(--space-4)', boxShadow: 'var(--shadow-sm)' }}>
                        <span style={{ fontSize: '1rem' }}>&#x1F3C5;</span>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
                            Top Rater: <span style={{ color: 'var(--color-brand)' }}>{topRater.name}</span>
                            <span style={{ color: 'var(--color-text-faint)', marginLeft: 'var(--space-1)' }}>({topRater.count} ratings)</span>
                        </p>
                    </div>
                )}
            </div>

            {/* ══ HERO ROW: Pub of Month (left) + KPI cards (right) ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-4)', alignItems: 'stretch' }}>

                {/* Pub of the Month */}
                <div
                    onClick={() => setPage('pubs')}
                    style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', cursor: 'pointer', position: 'relative', minHeight: '16rem', background: 'var(--color-surface-offset)', transition: 'all var(--transition-interactive)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg), 0 12px 32px rgba(0,0,0,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                    className="group"
                >
                    {spotlightPub?.photoURL ? (
                        <img
                            src={spotlightPub.photoURL}
                            alt={spotlightPub.name}
                            loading="lazy" width="600" height="400"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                            className="group-hover:scale-105"
                        />
                    ) : (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--color-brand-dark), var(--color-brand))' }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
                    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-body)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>&#x1F525; Pub of the Month</span>
                        </div>
                        {spotlightPub ? (
                            <div>
                                <p style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 400, lineHeight: 1.15, marginBottom: 'var(--space-1)', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{spotlightPub.name}</p>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-body)', marginBottom: 'var(--space-3)' }}>&#x1F4CD; {spotlightPub.location}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <span style={{ background: 'var(--color-brand)', color: '#fff', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)' }}>
                                        {spotlightPub.avgScore.toFixed(1)}/10
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                                        {scoreTierLabel(spotlightPub.avgScore).label}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '2.5rem' }}>&#x1F451;</span>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: 'var(--space-2)', fontFamily: 'var(--font-body)' }}>Rate a pub to crown it here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI grid */}
                <div className="lg:col-span-2 grid grid-cols-2" style={{ gap: 'var(--space-4)' }}>
                    <StatCard title="Visited Pubs"   value={pubsArray.length}    onClick={() => setPage('pubs')}    icon="&#x1F37A;" />
                    <StatCard title="Pubs to Visit"  value={newPubsArray.length} onClick={() => setPage('toVisit')} icon="&#x1F4CB;" />
                    <StatCard title="Total Raters"   value={usersSize}                                              icon="&#x1F465;" />
                    <StatCard
                        title="Overall Average"
                        value={overallAvg}
                        subValue="Group Wide"
                        icon="&#x2B50;"
                    />
                    {user && (
                        <div className="col-span-2 card-warm" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <div style={{ flex: 1 }}>
                                <p className="text-label" style={{ marginBottom: 'var(--space-2)' }}>My Rating Progress</p>
                                <div style={{ height: '8px', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: pubsArray.length > 0 ? `${Math.min(100, (myRatedCount / pubsArray.length) * 100)}%` : '0%',
                                        background: 'linear-gradient(90deg, var(--color-brand), var(--color-brand-dark))',
                                        borderRadius: 'var(--radius-full)',
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                            </div>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>
                                {myRatedCount} / {pubsArray.length} pubs
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ ROW 2: Live Location + Guinness Index ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-4)' }}>

                {/* Live Location */}
                <div style={{ ...padded, position: 'relative', overflow: 'hidden' }}>
                    {livePubId && <div style={{ position: 'absolute', inset: 0, background: 'var(--color-brand)', opacity: 0.04, pointerEvents: 'none' }} className="animate-pulse" />}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p className="text-label" style={{ marginBottom: 'var(--space-3)' }}>&#x1F4CD; Current Group Location</p>
                        {livePubId ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                                {livePub?.photoURL ? (
                                    <img src={livePub.photoURL} alt={livePub.name} loading="lazy" width="56" height="56"
                                        style={{ width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '2px solid var(--color-brand-light)', boxShadow: 'var(--shadow-sm)' }} />
                                ) : (
                                    <div className="animate-bounce" style={{ fontSize: '2rem' }}>&#x1F4CD;</div>
                                )}
                                <p className="text-page-title" style={{ color: 'var(--color-brand)', lineHeight: 1.1 }}>{livePub?.name || 'Unknown Pub'}</p>
                            </div>
                        ) : (
                            <p className="text-section-heading" style={{ marginBottom: 'var(--space-4)', opacity: 0.6 }}>Not currently at a pub.</p>
                        )}

                        {/* Only show the control to owners/managers */}
                        {isOwnerOrManager ? (
                            <>
                                <select
                                    value={livePubId}
                                    onChange={handleSetLiveLocation}
                                    style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', outline: 'none' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                                >
                                    <option value="">&#x1F3E0; Everyone went home</option>
                                    <optgroup label="Active Pubs">
                                        {pubsArray.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </optgroup>
                                </select>
                                {locationError && (
                                    <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 600 }}>{locationError}</p>
                                )}
                            </>
                        ) : (
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 'var(--space-2)' }}>
                                Only the group owner or a manager can change the live location.
                            </p>
                        )}
                    </div>
                </div>

                {/* Guinness Index */}
                {(cheapestPint || priciestPint) ? (
                    <div style={{ background: 'linear-gradient(135deg, var(--color-brand-dark), var(--color-brand))', padding: '3px', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ background: 'var(--color-surface)', borderRadius: 'calc(var(--radius-xl) - 3px)', padding: 'var(--space-6)', height: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                                <span style={{ fontSize: '2rem' }}>&#x1F37A;</span>
                                <div>
                                    <h3 className="text-section-heading" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', fontWeight: 400 }}>The Guinness Index</h3>
                                    <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Tracking the exact price of a pint</p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                {cheapestPint && (
                                    <div style={{ background: 'rgba(67,122,34,0.08)', border: '1px solid rgba(67,122,34,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                        {cheapestPint.pub.photoURL && (
                                            <img src={cheapestPint.pub.photoURL} alt={cheapestPint.pub.name} loading="lazy" width="48" height="48"
                                                style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', objectFit: 'cover', marginBottom: 'var(--space-1)' }} />
                                        )}
                                        <p className="text-label" style={{ color: 'var(--color-success)' }}>&#x1F49A; Cheapest Pint</p>
                                        <p className="text-kpi" style={{ fontSize: 'var(--text-xl)' }}>&pound;{cheapestPint.avgPrice.toFixed(2)}</p>
                                        <p className="text-muted" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cheapestPint.pub.name}</p>
                                    </div>
                                )}
                                {priciestPint && (
                                    <div style={{ background: 'rgba(161,44,123,0.08)', border: '1px solid rgba(161,44,123,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                        {priciestPint.pub.photoURL && (
                                            <img src={priciestPint.pub.photoURL} alt={priciestPint.pub.name} loading="lazy" width="48" height="48"
                                                style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', objectFit: 'cover', marginBottom: 'var(--space-1)' }} />
                                        )}
                                        <p className="text-label" style={{ color: 'var(--color-error)' }}>&#x1F534; Priciest Pint</p>
                                        <p className="text-kpi" style={{ fontSize: 'var(--text-xl)' }}>&pound;{priciestPint.avgPrice.toFixed(2)}</p>
                                        <p className="text-muted" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{priciestPint.pub.name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ ...padded, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                        <p className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>No pint prices logged yet.</p>
                    </div>
                )}
            </div>

            {/* ══ ROW 3: Biggest Debate + Dark Horse ══ */}
            {(biggestDebatePub || darkHorsePub) && (
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
                    {biggestDebatePub && (
                        <div style={{ ...cardBase, padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center', cursor: 'pointer', transition: 'all var(--transition-interactive)' }}
                            onClick={() => setPage('pubs')}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                        >
                            {biggestDebatePub.photoURL ? (
                                <img src={biggestDebatePub.photoURL} alt={biggestDebatePub.name} loading="lazy" width="64" height="64"
                                    style={{ width: '4rem', height: '4rem', borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--color-border)' }} />
                            ) : (
                                <div style={{ width: '4rem', height: '4rem', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-offset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>&#x26A1;</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="text-label" style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-1)' }}>&#x26A1; Biggest Debate</p>
                                <p className="text-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 'var(--space-1)' }}>{biggestDebatePub.name}</p>
                                <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Members can't agree &mdash; avg {biggestDebatePub.avgScore.toFixed(1)}/10</p>
                            </div>
                            <span style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-body)', fontWeight: 800, color: 'var(--color-brand)', flexShrink: 0 }}>{biggestDebatePub.avgScore.toFixed(1)}</span>
                        </div>
                    )}
                    {darkHorsePub && (
                        <div style={{ ...cardBase, padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center', cursor: 'pointer', transition: 'all var(--transition-interactive)' }}
                            onClick={() => setPage('pubs')}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                        >
                            {darkHorsePub.photoURL ? (
                                <img src={darkHorsePub.photoURL} alt={darkHorsePub.name} loading="lazy" width="64" height="64"
                                    style={{ width: '4rem', height: '4rem', borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--color-border)' }} />
                            ) : (
                                <div style={{ width: '4rem', height: '4rem', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-offset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>&#x1F311;</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="text-label" style={{ color: 'var(--color-purple)', marginBottom: 'var(--space-1)' }}>&#x1F311; Dark Horse</p>
                                <p className="text-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 'var(--space-1)' }}>{darkHorsePub.name}</p>
                                <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>High rated but only 1 review &mdash; go explore!</p>
                            </div>
                            <span style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-body)', fontWeight: 800, color: 'var(--color-brand)', flexShrink: 0 }}>{darkHorsePub.avgScore.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ══ ROW 4: Top 10 Chart + Score Distribution ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-4)' }}>
                <div style={{ ...padded }} className="lg:col-span-2">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
                        <div>
                            <h3 className="text-section-heading">The Top 10 Leaderboard</h3>
                            <p className="text-muted" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>Colour-coded by quality tier.</p>
                        </div>
                        <button onClick={() => setPage('leaderboard')} style={{ fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Full Leaderboard &#x2197;</button>
                    </div>
                    <div style={{ height: '20rem' }}><HorizontalBarChart data={pubChartData} /></div>
                </div>
                <div style={{ ...padded }}>
                    <h3 className="text-section-heading" style={{ marginBottom: 'var(--space-1)' }}>Score Distribution</h3>
                    <p className="text-muted" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>How your pubs stack up overall.</p>
                    <div style={{ height: '18rem' }}><DonutChart data={donutData} /></div>
                </div>
            </div>

            {/* ══ ROW 5: Events + Activity Feed ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-4)' }}>

                {/* Upcoming Events */}
                <div style={{ ...padded, display: 'flex', flexDirection: 'column' }} className="lg:col-span-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                        <h3 className="text-section-heading">Upcoming Events</h3>
                        <button onClick={() => setPage('events')} style={{ fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>View All</button>
                    </div>
                    {upcomingEvents.length === 0 ? (
                        <div style={{ textAlign: 'center', margin: 'auto', padding: 'var(--space-8) 0' }}>
                            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-2)', opacity: 0.5 }}>&#x1F4C5;</span>
                            <p className="text-muted" style={{ fontStyle: 'italic' }}>No events planned.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', overflowY: 'auto' }}>
                            {upcomingEvents.map(event => {
                                const eventDate = new Date(event.date);
                                const pub = pubsArray.find(p => p.id === event.pubId);
                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => setPage('events')}
                                        style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', background: 'var(--color-surface-offset)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color var(--transition-interactive)' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-brand)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                    >
                                        <div style={{ background: 'var(--color-brand)', color: '#fff', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', textAlign: 'center', minWidth: '3rem', flexShrink: 0 }}>
                                            <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-body)' }}>{eventDate.toLocaleDateString(undefined, { month: 'short' })}</p>
                                            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700, lineHeight: 1, marginTop: 'var(--space-1)', fontFamily: 'var(--font-body)' }}>{eventDate.getDate()}</p>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p className="text-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
                                            <p className="text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)' }}>&#x1F4CD; {pub?.name || 'Unknown Pub'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Group Activity Feed */}
                <div style={{ ...padded, display: 'flex', flexDirection: 'column' }} className="lg:col-span-2">
                    <h3 className="text-section-heading" style={{ marginBottom: 'var(--space-5)' }}>Group Activity</h3>
                    {Object.keys(groupedTimeline).length === 0 ? (
                        <p className="text-muted" style={{ textAlign: 'center', margin: 'auto', fontStyle: 'italic' }}>No recent activity.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', overflowY: 'auto', maxHeight: '28rem', paddingRight: 'var(--space-2)' }}>
                            {['Today', 'This Week', 'Earlier'].filter(g => groupedTimeline[g]?.length).map(group => (
                                <div key={group}>
                                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, fontFamily: 'var(--font-body)', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-divider)' }}>{group}</p>
                                    <div style={{ position: 'relative', borderLeft: '2px solid var(--color-brand-light)', marginLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                        {groupedTimeline[group].map(item => (
                                            <div key={item.id} style={{ position: 'relative', paddingLeft: 'var(--space-6)' }} className="group">
                                                <span style={{ position: 'absolute', left: '-18px', top: '0.25rem', background: 'var(--color-surface)', border: '2px solid var(--color-brand-light)', borderRadius: '50%', width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-base)', boxShadow: 'var(--shadow-sm)', zIndex: 1 }}>
                                                    {item.emoji}
                                                </span>
                                                <div style={{ background: 'var(--color-surface-offset)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                                                        <p className="text-label" style={{ color: 'var(--color-brand)' }}>{item.title}</p>
                                                        <p style={{ fontSize: '0.6rem', color: 'var(--color-text-faint)', fontWeight: 700, fontFamily: 'var(--font-body)', background: 'var(--color-surface)', padding: '2px var(--space-2)', borderRadius: 'var(--radius-full)' }}>{item.dateLabel}</p>
                                                    </div>
                                                    <p className="text-body" style={{ fontWeight: 500 }}>{item.text}</p>
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
