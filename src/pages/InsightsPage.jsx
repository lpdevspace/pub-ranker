import React, { useMemo, useEffect, useState, useRef } from 'react';

/* ── animated counter hook ─────────────────────────────────────────── */
function useCountUp(target, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target === 0) return;
        const steps = 40;
        const stepTime = duration / steps;
        let current = 0;
        const timer = setInterval(() => {
            current++;
            setValue(Math.round((current / steps) * target));
            if (current >= steps) clearInterval(timer);
        }, stepTime);
        return () => clearInterval(timer);
    }, [target, duration]);
    return value;
}

/* ── KPI card ───────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, suffix = '', color, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    const animated = useCountUp(visible ? (typeof value === 'number' ? value : 0) : 0, 1100);
    const display = typeof value === 'number'
        ? (suffix === '' ? animated.toLocaleString() : animated.toFixed(1))
        : value;
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div style={{
            flex: '1 1 160px', background: 'var(--color-surface)',
            border: `1.5px solid ${color}33`, borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5) var(--space-6)',
            boxShadow: `0 4px 20px ${color}18, var(--shadow-sm)`,
            display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{label}</span>
            </div>
            <div style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                {display}{suffix}
            </div>
            <div style={{ height: '3px', width: '2.5rem', borderRadius: 'var(--radius-full)', background: color, opacity: 0.5 }} />
        </div>
    );
}

/* ── top pubs bar chart ─────────────────────────────────────────────── */
function TopPubsChart({ pubs, scores, criteria }) {
    const scaleCriteria = useMemo(() =>
        (criteria || []).filter(c => c.type === 'scale'),
    [criteria]);

    const tabs = useMemo(() => [
        { id: 'overall', name: 'Overall' },
        ...scaleCriteria.map(c => ({ id: c.id, name: c.name })),
    ], [scaleCriteria]);

    const [activeTab, setActiveTab] = useState('overall');
    const [animated, setAnimated] = useState(false);
    const [tooltip, setTooltip] = useState(null);

    const chartData = useMemo(() => {
        const rows = [];
        (pubs || []).forEach(pub => {
            const pubScores = scores?.[pub.id] || {};
            let values = [];
            if (activeTab === 'overall') {
                Object.values(pubScores).forEach(critArr =>
                    (critArr || []).forEach(s => {
                        if (s.type === 'scale' && s.value != null) values.push(s.value);
                    })
                );
            } else {
                (pubScores[activeTab] || []).forEach(s => {
                    if (s.type === 'scale' && s.value != null) values.push(s.value);
                });
            }
            if (values.length === 0) return;
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            rows.push({ name: pub.name, score: avg, count: values.length });
        });
        return rows.sort((a, b) => b.score - a.score).slice(0, 10);
    }, [pubs, scores, activeTab]);

    useEffect(() => {
        setAnimated(false);
        const t = setTimeout(() => setAnimated(true), 60);
        return () => clearTimeout(t);
    }, [activeTab, chartData]);

    if (chartData.length === 0) return null;

    const tierColor = (score) => {
        if (score >= 8.5) return '#b45309';
        if (score >= 7)   return '#d97706';
        if (score >= 5)   return '#f59e0b';
        return '#fbbf24';
    };

    return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Top Ranked Pubs</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Top 10 by average score — switch category with the tabs.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)',
                            border: activeTab === tab.id ? '2px solid var(--color-brand)' : '1.5px solid var(--color-border)',
                            background: activeTab === tab.id ? 'var(--color-brand)' : 'transparent',
                            color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
                            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-xs)',
                            cursor: 'pointer', transition: 'all 180ms ease',
                        }}>{tab.name}</button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative' }}>
                {chartData.map((row, i) => {
                    const pct = (row.score / 10) * 100;
                    const color = tierColor(row.score);
                    return (
                        <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'default' }}
                            onMouseEnter={() => setTooltip({ name: row.name, score: row.score, count: row.count, idx: i })}
                            onMouseLeave={() => setTooltip(null)}>
                            <span style={{ minWidth: '1.6rem', textAlign: 'right', fontSize: 'var(--text-xs)', fontWeight: 900, color: i === 0 ? '#b45309' : 'var(--color-text-faint)', fontVariantNumeric: 'tabular-nums' }}>#{i + 1}</span>
                            <span style={{ minWidth: '9rem', maxWidth: '9rem', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.name}>{row.name}</span>
                            <div style={{ flex: 1, height: '22px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative' }}>
                                <div style={{ height: '100%', width: animated ? `${pct}%` : '0%', background: `linear-gradient(90deg, ${color}cc, ${color})`, borderRadius: 'var(--radius-full)', transition: `width ${0.4 + i * 0.05}s cubic-bezier(0.16, 1, 0.3, 1)`, boxShadow: `0 2px 8px ${color}55` }} />
                                {pct > 30 && (
                                    <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${0.4 + i * 0.05}s`, pointerEvents: 'none' }}>{row.score.toFixed(1)}</span>
                                )}
                            </div>
                            <span style={{ minWidth: '2.8rem', textAlign: 'right', fontSize: 'var(--text-xs)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color }}>{row.score.toFixed(1)}</span>
                        </div>
                    );
                })}
                {tooltip !== null && (
                    <div style={{ position: 'absolute', top: `${tooltip.idx * 34 - 6}px`, right: 0, background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 700, pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)' }}>
                        {tooltip.name} &mdash; <span style={{ fontVariantNumeric: 'tabular-nums' }}>{tooltip.score.toFixed(2)}/10</span> &bull; {tooltip.count} ratings
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
                {[{ color: '#b45309', label: '8.5+ Legendary' }, { color: '#d97706', label: '7.0+ Great' }, { color: '#f59e0b', label: '5.0+ Decent' }, { color: '#fbbf24', label: 'Below 5' }].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── score distribution histogram ──────────────────────────────────── */
function ScoreDistribution({ pubs, scores, criteria }) {
    const [animated, setAnimated] = useState(false);
    const [hoveredBucket, setHoveredBucket] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 150);
        return () => clearTimeout(t);
    }, []);

    // Build buckets 1–10 (whole numbers)
    const { buckets, total, mean } = useMemo(() => {
        const counts = Array(10).fill(0); // index 0 = score 1, index 9 = score 10
        let sum = 0, n = 0;
        (pubs || []).forEach(pub => {
            Object.values(scores?.[pub.id] || {}).forEach(critArr =>
                (critArr || []).forEach(s => {
                    if (s.type === 'scale' && s.value != null) {
                        const bucket = Math.min(10, Math.max(1, Math.round(s.value))) - 1;
                        counts[bucket]++;
                        sum += s.value;
                        n++;
                    }
                })
            );
        });
        return {
            buckets: counts,
            total: n,
            mean: n > 0 ? sum / n : 0,
        };
    }, [pubs, scores]);

    if (total === 0) return null;

    const maxCount = Math.max(...buckets, 1);

    const barColor = (score) => {
        if (score >= 9) return '#b45309';
        if (score >= 7) return '#d97706';
        if (score >= 5) return '#f59e0b';
        return '#fbbf24';
    };

    // Mean line position as % across the 10 buckets
    const meanPct = ((mean - 1) / 9) * 100;

    return (
        <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-md)',
        }}>
            <div style={{ marginBottom: 'var(--space-5)' }}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Score Distribution</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                    How your group's {total.toLocaleString()} individual scores are spread across 1–10.
                    Group mean: <strong style={{ color: 'var(--color-brand)' }}>{mean.toFixed(2)}</strong>
                </p>
            </div>

            {/* chart area */}
            <div style={{ position: 'relative', paddingBottom: 'var(--space-6)' }}>

                {/* mean line */}
                <div style={{
                    position: 'absolute',
                    left: `calc(${meanPct}% + 5%)`, // offset inset for padding
                    top: 0, bottom: 'var(--space-6)',
                    width: '2px',
                    background: 'var(--color-brand)',
                    opacity: animated ? 0.7 : 0,
                    transition: 'opacity 0.6s ease 0.8s',
                    zIndex: 2,
                    pointerEvents: 'none',
                }}>
                    <span style={{
                        position: 'absolute', top: 0, left: '6px',
                        fontSize: '10px', fontWeight: 800,
                        color: 'var(--color-brand)', whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                    }}>avg {mean.toFixed(1)}</span>
                </div>

                {/* bars row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }}>
                    {buckets.map((count, i) => {
                        const score = i + 1;
                        const heightPct = (count / maxCount) * 100;
                        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                        const isHovered = hoveredBucket === i;
                        const color = barColor(score);

                        return (
                            <div
                                key={score}
                                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'default', height: '100%', justifyContent: 'flex-end' }}
                                onMouseEnter={() => setHoveredBucket(i)}
                                onMouseLeave={() => setHoveredBucket(null)}
                            >
                                {/* tooltip above bar */}
                                {isHovered && count > 0 && (
                                    <div style={{
                                        position: 'absolute', bottom: 'calc(var(--space-6) + 128px)',
                                        background: 'var(--color-text)', color: 'var(--color-bg)',
                                        borderRadius: 'var(--radius-md)', padding: '4px 8px',
                                        fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                                        pointerEvents: 'none', zIndex: 10,
                                        boxShadow: 'var(--shadow-md)',
                                    }}>
                                        Score {score}: {count} ratings ({pct}%)
                                    </div>
                                )}

                                <div style={{
                                    width: '100%',
                                    height: animated ? `${Math.max(heightPct, count > 0 ? 4 : 0)}%` : '0%',
                                    background: isHovered
                                        ? `linear-gradient(180deg, #fff4, transparent)`
                                        : 'transparent',
                                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                    position: 'relative',
                                    transition: `height ${0.35 + i * 0.04}s cubic-bezier(0.16, 1, 0.3, 1)`,
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: isHovered
                                            ? `linear-gradient(180deg, ${color}, ${color}cc)`
                                            : `linear-gradient(180deg, ${color}bb, ${color}88)`,
                                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                        boxShadow: isHovered ? `0 -4px 12px ${color}88` : 'none',
                                        transition: 'background 150ms ease, box-shadow 150ms ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* x-axis labels */}
                <div style={{ display: 'flex', gap: '3px', marginTop: 'var(--space-1)' }}>
                    {buckets.map((_, i) => (
                        <div key={i} style={{
                            flex: 1, textAlign: 'center',
                            fontSize: '11px', fontWeight: hoveredBucket === i ? 900 : 600,
                            color: hoveredBucket === i ? 'var(--color-brand)' : 'var(--color-text-muted)',
                            fontVariantNumeric: 'tabular-nums',
                            transition: 'color 150ms ease, font-weight 150ms ease',
                        }}>{i + 1}</div>
                    ))}
                </div>
            </div>

            {/* summary row */}
            <div style={{ display: 'flex', gap: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                {[
                    { label: 'Most common score', value: `${buckets.indexOf(Math.max(...buckets)) + 1}/10` },
                    { label: 'Scores of 8+',       value: `${((buckets.slice(7).reduce((a,b)=>a+b,0)/total)*100).toFixed(0)}%` },
                    { label: 'Scores below 5',     value: `${((buckets.slice(0,4).reduce((a,b)=>a+b,0)/total)*100).toFixed(0)}%` },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-brand)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── main component ─────────────────────────────────────────────────── */
export default function InsightsPage({ pubs, scores, users, criteria }) {
    const safePubs     = pubs     || [];
    const safeScores   = scores   || {};
    const safeUsers    = users    || {};
    const safeCriteria = criteria || [];

    const analytics = useMemo(() => {
        let stats = { totalRatings: 0, divisivePubs: [], harshCritics: [], categoryWinners: {} };
        const userAverages = {};
        const pubVariances = [];
        let totalScoreSum = 0, totalScoreCount = 0;
        const ratedPubIds = new Set();

        safePubs.forEach(pub => {
            const pubScores = safeScores[pub.id] || {};
            let allPubValues = [];
            Object.entries(pubScores).forEach(([critId, critScores]) => {
                const criterion = safeCriteria.find(c => c.id === critId);
                if (!criterion) return;
                let critValues = [];
                (critScores || []).forEach(score => {
                    stats.totalRatings++;
                    if (score.type === 'scale' && score.value !== null) {
                        critValues.push(score.value);
                        allPubValues.push(score.value);
                        totalScoreSum += score.value;
                        totalScoreCount++;
                        ratedPubIds.add(pub.id);
                        if (!userAverages[score.userId]) userAverages[score.userId] = { total: 0, count: 0 };
                        userAverages[score.userId].total += score.value;
                        userAverages[score.userId].count++;
                    }
                });
                if (critValues.length > 0) {
                    const avg = critValues.reduce((a, b) => a + b, 0) / critValues.length;
                    if (!stats.categoryWinners[critId] || avg > stats.categoryWinners[critId].score) {
                        stats.categoryWinners[critId] = { pubName: pub.name, score: avg };
                    }
                }
            });
            if (allPubValues.length > 2) {
                const mean = allPubValues.reduce((a, b) => a + b, 0) / allPubValues.length;
                const variance = allPubValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allPubValues.length;
                pubVariances.push({ name: pub.name, variance, mean });
            }
        });

        stats.divisivePubs  = pubVariances.sort((a, b) => b.variance - a.variance).slice(0, 3);
        stats.harshCritics  = Object.entries(userAverages)
            .map(([uid, data]) => ({ uid, avg: data.total / data.count, count: data.count }))
            .filter(u => u.count > 5)
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 3);
        stats.pubsRated     = ratedPubIds.size;
        stats.activeMembers = Object.values(userAverages).filter(u => u.count > 0).length;
        stats.groupAverage  = totalScoreCount > 0 ? totalScoreSum / totalScoreCount : 0;
        return stats;
    }, [safePubs, safeScores, safeCriteria]);

    const getUser = (uid) => {
        const u = safeUsers[uid];
        return u?.nickname || u?.displayName || u?.email || 'Unknown User';
    };

    const cardStyle = {
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-md)'
    };

    return (
        <div style={{ maxWidth: '56rem', margin: '0 auto' }} className="space-y-8 animate-fadeIn pb-20">

            {/* Page header */}
            <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Group Insights</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                    Deep data analytics based on {analytics.totalRatings} individual data points.
                </p>
            </div>

            {/* STEP 1: KPI hero bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <KpiCard icon="🍺" label="Total Ratings"  value={analytics.totalRatings}  color="var(--color-brand)"  delay={0}   />
                <KpiCard icon="📍" label="Pubs Rated"     value={analytics.pubsRated}      color="#d97706"             delay={120} />
                <KpiCard icon="👥" label="Active Members" value={analytics.activeMembers}  color="#7c3aed"             delay={240} />
                <KpiCard icon="⭐" label="Group Average"  value={analytics.groupAverage}   color="#059669" suffix="/10" delay={360} />
            </div>

            {/* STEP 2: Top ranked pubs bar chart */}
            <TopPubsChart pubs={safePubs} scores={safeScores} criteria={safeCriteria} />

            {/* STEP 3: Score distribution histogram */}
            <ScoreDistribution pubs={safePubs} scores={safeScores} criteria={safeCriteria} />

            {/* Existing cards */}
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-6)' }}>

                {/* Harsh Critics */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Harshest Critics</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Members with the lowest average scores (min. 6 ratings).</p>
                    {analytics.harshCritics.length === 0 ? (
                        <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>Not enough data yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {analytics.harshCritics.map((critic, i) => (
                                <div key={critic.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <span style={{ fontSize: 'var(--text-lg)' }}>{['1st','2nd','3rd'][i]}</span>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>{getUser(critic.uid)}</p>
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{critic.count} ratings</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 'var(--text-xl)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--color-brand)' }}>{critic.avg.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Most Divisive */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Most Divisive Pubs</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Highest variance in ratings - love it or hate it.</p>
                    {analytics.divisivePubs.length === 0 ? (
                        <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>Not enough data yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {analytics.divisivePubs.map((pub, i) => (
                                <div key={pub.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <span style={{ fontSize: 'var(--text-lg)' }}>{['#1','#2','#3'][i]}</span>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>{pub.name}</p>
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>avg {pub.mean.toFixed(1)}</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, background: 'var(--color-brand-highlight)', color: 'var(--color-brand)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-full)' }}>variance {pub.variance.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Champions */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>Category Champions</h3>
                {Object.keys(analytics.categoryWinners).length === 0 ? (
                    <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>Not enough data yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--space-4)' }}>
                        {Object.entries(analytics.categoryWinners).map(([critId, winner]) => {
                            const criterion = safeCriteria.find(c => c.id === critId);
                            return (
                                <div key={critId} style={{ background: 'var(--color-brand-highlight)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--color-brand-border)' }}>
                                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>{criterion?.name || critId}</p>
                                    <p style={{ fontWeight: 900, color: 'var(--color-text)', fontSize: 'var(--text-sm)', lineHeight: 1.3 }}>{winner.pubName}</p>
                                    <p style={{ fontSize: 'var(--text-xl)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--color-brand)', marginTop: 'var(--space-1)' }}>{winner.score.toFixed(1)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
