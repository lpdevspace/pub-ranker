import React, { useState, useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'leaflet/dist/leaflet.css';

const scoreTierBg = (score) => {
    if (score >= 8.5) return 'rgba(180,100,20,0.85)';
    if (score >= 7)   return 'rgba(210,155,30,0.85)';
    if (score >= 5)   return 'rgba(234,179,8,0.75)';
    return 'rgba(180,40,40,0.75)';
};

export function HorizontalBarChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        const ctx = chartRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, max: 10 },
                    y: { ticks: { font: { family: 'Satoshi, Inter, sans-serif', weight: '600', size: 13 } } },
                },
            },
        });
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [data]);

    return <canvas ref={chartRef} />;
}

export function StatCard({ title, value, subValue, onClick }) {
    return (
        <div
            onClick={onClick}
            className="card-warm"
            style={{
                padding: 'var(--space-5)',
                cursor: onClick ? 'pointer' : 'default',
            }}
            onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; } }}
        >
            {/* Label */}
            <p className="text-label" style={{ color: onClick ? 'var(--color-brand)' : undefined, marginBottom: 'var(--space-2)' }}>
                {title} {onClick && '↗'}
            </p>
            {/* Big KPI number */}
            <p className="text-kpi" style={{ marginTop: 'var(--space-1)' }}>{value}</p>
            {/* Sub-value */}
            {subValue && (
                <p className="text-muted" style={{ marginTop: 'var(--space-2)', fontWeight: 600 }}>{subValue}</p>
            )}
        </div>
    );
}

export default function DashboardPage({ user, pubs, newPubs, criteria, users, scores, db, groupId, setPage, allUsers }) {
    const pubsArray     = Array.isArray(pubs)     ? pubs     : Object.values(pubs     || {});
    const newPubsArray  = Array.isArray(newPubs)  ? newPubs  : Object.values(newPubs  || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj     = scores || {};
    const usersSize     = users && typeof users.size === 'number' ? users.size : 0;

    const [livePubId,      setLivePubId]      = useState('');
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
        try { await db.collection('groups').doc(groupId).update({ livePubId: e.target.value }); }
        catch (err) { console.error('Error updating location:', err); }
    };

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

    const effectiveWeights = useMemo(() => {
        const map = {};
        criteriaArray.forEach(c => { map[c.id] = c.weight ?? 1; });
        return map;
    }, [criteriaArray]);

    const weightedRankedPubs = useMemo(() => {
        const visitedPubs = pubsArray.filter(p => p.status === 'visited');
        return visitedPubs.map(pub => {
            let totalScore = 0, totalWeight = 0;
            Object.entries(scoresObj[pub.id] ?? {}).forEach(([criterionId, criterionScores]) => {
                const weight = effectiveWeights[criterionId] ?? 1;
                (criterionScores || []).forEach(score => {
                    if (score.type === 'scale' && score.value != null) { totalScore += score.value * weight; totalWeight += weight; }
                    else if (score.type === 'price' && score.value != null) { totalScore += (score.value * 2) * weight; totalWeight += weight; }
                });
            });
            return { ...pub, avgScore: totalWeight > 0 ? totalScore / totalWeight : 0 };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [pubsArray, scoresObj, effectiveWeights]);

    const spotlightPub = weightedRankedPubs[0];

    const pubChartData = useMemo(() => {
        const top = weightedRankedPubs.slice(0, 10);
        return {
            labels: top.map(p => p.name || ''),
            datasets: [{
                label: 'Average Score',
                data: top.map(p => p.avgScore.toFixed(2)),
                backgroundColor: top.map(p => scoreTierBg(p.avgScore)),
                borderRadius: 4,
            }],
        };
    }, [weightedRankedPubs]);

    const timelineItems = useMemo(() => {
        const items = [];
        pubsArray.forEach(p => {
            if (p.createdAt?.toMillis) {
                const addedBy = p.addedBy ? getUserName(p.addedBy) : 'Someone';
                items.push({ id: `pub_${p.id}`, emoji: '🍺', title: 'New Pub Added', text: `${addedBy} added ${p.name} to the list.`, time: p.createdAt.toMillis(), dateLabel: new Date(p.createdAt.toMillis()).toLocaleDateString() });
            }
        });
        recentCrawls.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crawl_${c.id}`, emoji: '🗺️', title: 'Crawl Planned', text: `${c.creatorName} planned: ${c.name}`, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        criteriaArray.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crit_${c.id}`, emoji: '📋', title: 'Rules Updated', text: `New rating category: ${c.name}`, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        upcomingEvents.forEach(e => {
            if (e.createdAt?.toMillis) items.push({ id: `event_${e.id}`, emoji: '📅', title: 'Event Scheduled', text: `${e.title} was added to the calendar.`, time: e.createdAt.toMillis(), dateLabel: new Date(e.createdAt.toMillis()).toLocaleDateString() });
        });
        return items.sort((a, b) => b.time - a.time).slice(0, 15);
    }, [pubsArray, recentCrawls, criteriaArray, upcomingEvents]);

    return (
        <div className="space-y-8 animate-fadeIn pb-20">

            {/* ── First Quest Banner ── */}
            {user && !hasCompletedFirstQuest && (
                <div style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', color: '#fff', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden', border: '1px solid var(--color-brand-light)' }} className="group">
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                                <span className="animate-bounce" style={{ fontSize: '1.5rem' }}>🏆</span> Your First Quest
                            </h3>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 400, opacity: 0.9, maxWidth: '28rem', fontFamily: 'var(--font-body)' }}>
                                Welcome to the crew! Head over to the Directory or Hit List and drop your very first rating to unlock the 'First Pint' badge.
                            </p>
                        </div>
                        <button
                            onClick={() => setPage('pubs')}
                            className="hidden sm:block"
                            style={{ padding: 'var(--space-2) var(--space-6)', background: '#fff', color: 'var(--color-brand-dark)', fontWeight: 700, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: 'none', cursor: 'pointer' }}
                        >
                            Start Rating →
                        </button>
                    </div>
                    <div style={{ position: 'absolute', right: '-2.5rem', top: '-2.5rem', width: '10rem', height: '10rem', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(2rem)', pointerEvents: 'none' }} />
                </div>
            )}

            {/* ── Page heading ── */}
            <div>
                <h2 className="text-page-title">Group Dashboard</h2>
                <p className="text-muted" style={{ marginTop: 'var(--space-1)' }}>Your city's drinking analytics.</p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 'var(--space-4)' }}>
                <StatCard title="Visited Pubs"    value={pubsArray.length}    onClick={() => setPage('pubs')} />
                <StatCard title="Pubs to Visit"   value={newPubsArray.length} onClick={() => setPage('toVisit')} />
                <StatCard title="Total Raters"    value={usersSize} />
                <StatCard
                    title="Overall Average"
                    value={weightedRankedPubs.length > 0
                        ? (weightedRankedPubs.reduce((sum, p) => sum + p.avgScore, 0) / weightedRankedPubs.length).toFixed(1)
                        : 0}
                    subValue="Group Wide"
                />
            </div>

            {/* ── Live Location Tracker ── */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
                {livePubId && <div style={{ position: 'absolute', inset: 0, background: 'var(--color-brand)', opacity: 0.04, pointerEvents: 'none' }} className="animate-pulse" />}
                <div className="flex flex-col md:flex-row justify-between items-center" style={{ gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <div className={livePubId ? 'animate-bounce' : 'grayscale opacity-50'} style={{ fontSize: '2.5rem' }}>📍</div>
                        <div>
                            <p className="text-label" style={{ marginBottom: 'var(--space-1)' }}>Current Group Location</p>
                            {livePubId
                                ? <p className="text-page-title" style={{ color: 'var(--color-brand)' }}>{pubsArray.find(p => p.id === livePubId)?.name || 'Unknown Pub'}</p>
                                : <p className="text-section-heading">Not currently at a pub.</p>
                            }
                        </div>
                    </div>
                    <div className="w-full md:w-auto">
                        <select
                            value={livePubId}
                            onChange={handleSetLiveLocation}
                            className="w-full md:w-64"
                            style={{ padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', outline: 'none' }}
                            onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                        >
                            <option value="">🏠 Everyone went home</option>
                            <optgroup label="Active Pubs">
                                {pubsArray.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </optgroup>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Guinness Index ── */}
            {(cheapestPint || priciestPint) && (
                <div style={{ background: 'linear-gradient(135deg, var(--color-brand-dark), var(--color-brand))', padding: '3px', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 'calc(var(--radius-xl) - 3px)', padding: 'var(--space-5)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <span style={{ fontSize: '3rem' }}>🍺</span>
                            <div>
                                <h3 className="text-section-heading" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'var(--text-lg)' }}>The Guinness Index</h3>
                                <p className="text-muted">Tracking the exact price of a pint</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                            {cheapestPint && (
                                <div style={{ borderRight: '1px solid var(--color-divider)', paddingRight: 'var(--space-8)' }}>
                                    <p className="text-label" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-1)' }}>Cheapest Pint</p>
                                    <p className="text-kpi">£{cheapestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-muted" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 'var(--space-1)', fontWeight: 600 }}>{cheapestPint.pub.name}</p>
                                </div>
                            )}
                            {priciestPint && (
                                <div>
                                    <p className="text-label" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-1)' }}>Priciest Pint</p>
                                    <p className="text-kpi">£{priciestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-muted" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 'var(--space-1)', fontWeight: 600 }}>{priciestPint.pub.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Pub of the Month + Leaderboard Chart ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-6)' }}>

                {/* Pub of the Month */}
                <div
                    onClick={() => setPage('pubs')}
                    style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))', padding: '3px', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all var(--transition-interactive)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg), 0 8px 24px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                    className="group"
                >
                    <div style={{ background: 'var(--color-surface)', borderRadius: 'calc(var(--radius-xl) - 3px)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '8rem', height: '8rem', background: 'var(--color-brand-light)', borderRadius: '50%', filter: 'blur(2rem)', opacity: 0.15, pointerEvents: 'none' }} className="animate-pulse" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
                            <p className="text-label" style={{ color: 'var(--color-brand)' }}>🔥 Pub of the Month</p>
                            <span style={{ color: 'var(--color-text-faint)', opacity: 0, transition: 'opacity var(--transition-interactive)' }} className="group-hover:opacity-100">↗</span>
                        </div>
                        {spotlightPub ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 1 }}>
                                {spotlightPub.photoURL ? (
                                    <img src={spotlightPub.photoURL} alt={spotlightPub.name}
                                        style={{ width: '6rem', height: '6rem', borderRadius: '50%', objectFit: 'cover', marginBottom: 'var(--space-4)', border: '4px solid var(--color-brand-light)', boxShadow: 'var(--shadow-md)' }}
                                        className="group-hover:scale-105 transition-transform" loading="lazy" width="96" height="96" />
                                ) : (
                                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }} className="group-hover:scale-105 transition-transform">👑</div>
                                )}
                                {/* Pub name — uses display font */}
                                <p className="text-page-title" style={{ marginBottom: 'var(--space-1)', lineHeight: 1.2 }}>{spotlightPub.name}</p>
                                <p className="text-muted" style={{ fontWeight: 600, marginBottom: 'var(--space-6)' }}>📍 {spotlightPub.location}</p>
                                <div style={{ marginTop: 'auto', background: 'var(--color-surface-offset)', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', width: '100%', textAlign: 'center' }}>
                                    <p className="text-label" style={{ marginBottom: 'var(--space-1)' }}>Group Rating</p>
                                    <p className="text-kpi" style={{ color: 'var(--color-brand)' }}>
                                        {spotlightPub.avgScore.toFixed(1)}<span className="text-muted" style={{ fontSize: 'var(--text-base)' }}>/10</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted" style={{ margin: 'auto', textAlign: 'center', fontStyle: 'italic' }}>
                                Rate a pub to see it crowned here.
                            </p>
                        )}
                    </div>
                </div>

                {/* Top 10 Chart */}
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-sm)' }} className="lg:col-span-2">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
                        <div>
                            <h3 className="text-section-heading">The Top 10 Leaderboard</h3>
                            <p className="text-muted" style={{ marginTop: 'var(--space-1)' }}>Colour-coded by quality tier.</p>
                        </div>
                    </div>
                    <div style={{ height: '18rem' }}><HorizontalBarChart data={pubChartData} /></div>
                </div>
            </div>

            {/* ── Events + Activity Feed ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-6)' }}>

                {/* Upcoming Events */}
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }} className="lg:col-span-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                        <h3 className="text-section-heading">Upcoming Events</h3>
                        <button onClick={() => setPage('events')} style={{ fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>View All</button>
                    </div>
                    {upcomingEvents.length === 0 ? (
                        <div style={{ textAlign: 'center', margin: 'auto', padding: 'var(--space-8) 0' }}>
                            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-2)', opacity: 0.5 }}>📅</span>
                            <p className="text-muted" style={{ fontStyle: 'italic' }}>No events planned.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto', paddingRight: 'var(--space-2)' }}>
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
                                        <div style={{ background: 'var(--color-brand)', color: '#fff', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', textAlign: 'center', minWidth: '3rem', boxShadow: 'var(--shadow-sm)', fontFamily: 'var(--font-body)' }}>
                                            <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1 }}>{eventDate.toLocaleDateString(undefined, { month: 'short' })}</p>
                                            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700, lineHeight: 1, marginTop: 'var(--space-1)', fontFamily: 'var(--font-body)' }}>{eventDate.getDate()}</p>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p className="text-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
                                            <p className="text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-xs)' }}>📍 {pub?.name || 'Unknown Pub'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Group Activity Feed */}
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }} className="lg:col-span-2">
                    <h3 className="text-section-heading" style={{ marginBottom: 'var(--space-6)' }}>Group Activity Feed</h3>
                    {timelineItems.length === 0 ? (
                        <p className="text-muted" style={{ textAlign: 'center', margin: 'auto', fontStyle: 'italic', paddingBottom: 'var(--space-6)' }}>No recent activity.</p>
                    ) : (
                        <div style={{ position: 'relative', borderLeft: '2px solid var(--color-brand-light)', marginLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', flex: 1, overflowY: 'auto', paddingRight: 'var(--space-4)', paddingBottom: 'var(--space-2)' }}>
                            {timelineItems.map(item => (
                                <div key={item.id} style={{ position: 'relative', paddingLeft: 'var(--space-6)' }} className="group">
                                    <span style={{ position: 'absolute', left: '-18px', top: '0.25rem', background: 'var(--color-surface)', border: '2px solid var(--color-brand-light)', borderRadius: '50%', width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-lg)', boxShadow: 'var(--shadow-sm)', zIndex: 1, transition: 'transform var(--transition-interactive)' }} className="group-hover:scale-110">
                                        {item.emoji}
                                    </span>
                                    <div style={{ background: 'var(--color-surface-offset)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', transition: 'border-color var(--transition-interactive)' }} className="hover:border-brand">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-1)' }}>
                                            <p className="text-label" style={{ color: 'var(--color-brand)' }}>{item.title}</p>
                                            <p style={{ fontSize: '0.625rem', color: 'var(--color-text-faint)', fontWeight: 700, fontFamily: 'var(--font-body)', background: 'var(--color-surface)', padding: '1px var(--space-2)', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-sm)' }}>{item.dateLabel}</p>
                                        </div>
                                        <p className="text-body" style={{ fontWeight: 500 }}>{item.text}</p>
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
