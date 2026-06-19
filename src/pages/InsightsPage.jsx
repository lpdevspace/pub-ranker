import React, { useMemo, useEffect, useState } from 'react';

/* ── animated counter ───────────────────────────────────────────── */
function useCountUp(target, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target === 0) return;
        const steps = 40, stepTime = duration / steps;
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

/* ── KPI card ──────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, suffix = '', color, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    const animated = useCountUp(visible ? (typeof value === 'number' ? value : 0) : 0, 1100);
    const display = typeof value === 'number'
        ? (suffix === '' ? animated.toLocaleString() : animated.toFixed(1)) : value;
    useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
    return (
        <div 
            className="flex-1 basis-[180px] bg-surface rounded-xl p-6 flex flex-col gap-3 shadow-sm"
            style={{
                border: `1.5px solid ${color}33`,
                boxShadow: `0 4px 20px ${color}18, var(--shadow-sm)`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
        >
            <div className="flex items-center gap-2">
                <span className="text-[1.4rem] leading-none">{icon}</span>
                <span className="text-xs font-bold tracking-[0.1em] uppercase text-muted font-body">{label}</span>
            </div>
            <div className="text-[clamp(2rem,3vw,2.8rem)] font-black tabular-nums font-display leading-none" style={{ color }}>{display}{suffix}</div>
            <div className="h-[3px] w-12 rounded-full opacity-50" style={{ background: color }} />
        </div>
    );
}

/* ── top pubs bar chart ───────────────────────────────────────────── */
function TopPubsChart({ pubs, scores, criteria }) {
    const scaleCriteria = useMemo(() => (criteria || []).filter(c => c.type === 'scale'), [criteria]);
    const tabs = useMemo(() => [{ id: 'overall', name: 'Overall' }, ...scaleCriteria.map(c => ({ id: c.id, name: c.name }))], [scaleCriteria]);
    const [activeTab, setActiveTab] = useState('overall');
    const [animated, setAnimated] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    const chartData = useMemo(() => {
        const rows = [];
        (pubs || []).forEach(pub => {
            const pubScores = scores?.[pub.id] || {};
            let values = [];
            if (activeTab === 'overall') { Object.values(pubScores).forEach(critArr => (critArr || []).forEach(s => { if (s.type === 'scale' && s.value != null) values.push(s.value); })); }
            else { (pubScores[activeTab] || []).forEach(s => { if (s.type === 'scale' && s.value != null) values.push(s.value); }); }
            if (values.length === 0) return;
            rows.push({ name: pub.name, score: values.reduce((a, b) => a + b, 0) / values.length, count: values.length });
        });
        return rows.sort((a, b) => b.score - a.score).slice(0, 10);
    }, [pubs, scores, activeTab]);
    useEffect(() => { setAnimated(false); const t = setTimeout(() => setAnimated(true), 60); return () => clearTimeout(t); }, [activeTab, chartData]);
    if (chartData.length === 0) return null;
    const tierColor = s => s >= 8.5 ? 'var(--color-brand)' : s >= 7 ? 'color-mix(in srgb, var(--color-brand) 75%, #000)' : s >= 5 ? '#f59e0b' : '#fbbf24';
    return (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-md">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div>
                    <h3 className="text-lg font-black text-text font-display">Top Ranked Pubs</h3>
                    <p className="text-xs text-muted mt-1">Top 10 by average score — switch category with the tabs.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
                            className={`px-3 py-1 rounded-full border-[1.5px] font-body font-bold text-xs cursor-pointer transition-all duration-180 ${activeTab === tab.id ? 'border-brand bg-brand text-white' : 'border-border bg-transparent text-muted hover:border-brand'}`}>
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-3 relative">
                {chartData.map((row, i) => {
                    const pct = (row.score / 10) * 100;
                    const color = tierColor(row.score);
                    return (
                        <div key={row.name} className="flex items-center gap-3 cursor-default" onMouseEnter={() => setTooltip({ name: row.name, score: row.score, count: row.count, idx: i })} onMouseLeave={() => setTooltip(null)}>
                            <span className={`min-w-[1.6rem] text-right text-xs font-black tabular-nums ${i === 0 ? 'text-brand' : 'text-faint'}`}>#{i + 1}</span>
                            <span className="min-w-[10rem] max-w-[10rem] text-xs font-bold text-text truncate" title={row.name}>{row.name}</span>
                            <div className="flex-1 h-[26px] bg-surface-2 rounded-full overflow-hidden relative">
                                <div className="h-full rounded-full" style={{ width: animated ? `${pct}%` : '0%', background: `linear-gradient(90deg, ${color}cc, ${color})`, transition: `width ${0.4 + i * 0.05}s cubic-bezier(0.16, 1, 0.3, 1)`, boxShadow: `0 2px 8px ${color}55` }} />
                                {pct > 30 && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-white tabular-nums pointer-events-none" style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${0.4 + i * 0.05}s` }}>{row.score.toFixed(1)}</span>}
                            </div>
                            <span className="min-w-[2.8rem] text-right text-sm font-black tabular-nums" style={{ color }}>{row.score.toFixed(1)}</span>
                        </div>
                    );
                })}
                {tooltip !== null && (
                    <div className="absolute right-0 bg-text text-bg rounded-lg px-3 py-2 text-xs font-bold pointer-events-none z-10 whitespace-nowrap shadow-md" style={{ top: `${tooltip.idx * 38 - 6}px` }}>
                        {tooltip.name} &mdash; <span className="tabular-nums">{tooltip.score.toFixed(2)}/10</span> &bull; {tooltip.count} ratings
                    </div>
                )}
            </div>
            <div className="flex gap-4 mt-5 flex-wrap">
                {[{ color: 'var(--color-brand)', label: '8.5+ Legendary' }, { color: 'color-mix(in srgb, var(--color-brand) 75%, #000)', label: '7.0+ Great' }, { color: '#f59e0b', label: '5.0+ Decent' }, { color: '#fbbf24', label: 'Below 5' }].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                        <div className="w-[10px] h-[10px] rounded-[2px]" style={{ background: color }} />
                        <span className="text-[11px] text-muted font-semibold">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── score distribution histogram ────────────────────────────────── */
function ScoreDistribution({ pubs, scores }) {
    const [animated, setAnimated] = useState(false);
    const [hoveredBucket, setHoveredBucket] = useState(null);
    useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t); }, []);
    const { buckets, total, mean } = useMemo(() => {
        const counts = Array(10).fill(0);
        let sum = 0, n = 0;
        (pubs || []).forEach(pub => {
            Object.values(scores?.[pub.id] || {}).forEach(critArr => (critArr || []).forEach(s => {
                if (s.type === 'scale' && s.value != null) { const b = Math.min(10, Math.max(1, Math.round(s.value))) - 1; counts[b]++; sum += s.value; n++; }
            }));
        });
        return { buckets: counts, total: n, mean: n > 0 ? sum / n : 0 };
    }, [pubs, scores]);
    if (total === 0) return null;
    const maxCount = Math.max(...buckets, 1);
    const meanPct = ((mean - 1) / 9) * 100;
    const barColor = s => s >= 9 ? 'var(--color-brand)' : s >= 7 ? 'color-mix(in srgb, var(--color-brand) 75%, #000)' : s >= 5 ? '#f59e0b' : '#fbbf24';
    return (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-md">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div>
                    <h3 className="text-lg font-black text-text font-display">Score Distribution</h3>
                    <p className="text-xs text-muted mt-1">How your group's {total.toLocaleString()} individual scores are spread across 1–10.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted font-semibold uppercase tracking-[0.08em]">Group Mean</p>
                    <p className="text-[clamp(1.8rem,3vw,2.4rem)] font-black tabular-nums text-brand font-display leading-none">{mean.toFixed(2)}</p>
                </div>
            </div>
            <div className="relative pb-6">
                <div className="absolute top-0 bottom-6 w-[2px] bg-brand z-[2] pointer-events-none" style={{ left: `calc(${meanPct}% + 5%)`, opacity: animated ? 0.7 : 0, transition: 'opacity 0.6s ease 0.8s' }}>
                    <span className="absolute top-0 left-[6px] text-[10px] font-black text-brand whitespace-nowrap tabular-nums">avg {mean.toFixed(1)}</span>
                </div>
                <div className="flex items-end gap-1 h-[140px]">
                    {buckets.map((count, i) => {
                        const score = i + 1;
                        const heightPct = (count / maxCount) * 100;
                        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                        const isHovered = hoveredBucket === i;
                        const color = barColor(score);
                        return (
                            <div key={score} className="flex-1 flex flex-col items-center gap-[3px] cursor-default h-full justify-end relative" onMouseEnter={() => setHoveredBucket(i)} onMouseLeave={() => setHoveredBucket(null)}>
                                {isHovered && count > 0 && (
                                    <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-text text-bg rounded-md px-2 py-1 text-[11px] font-bold whitespace-nowrap pointer-events-none z-10 shadow-md">Score {score}: {count} ({pct}%)</div>
                                )}
                                <div className="w-full relative overflow-hidden rounded-t-sm" style={{ height: animated ? `${Math.max(heightPct, count > 0 ? 4 : 0)}%` : '0%', transition: `height ${0.35 + i * 0.04}s cubic-bezier(0.16, 1, 0.3, 1)` }}>
                                    <div className="absolute inset-0 rounded-t-sm" style={{ background: isHovered ? `linear-gradient(180deg, ${color}, ${color}cc)` : `linear-gradient(180deg, ${color}bb, ${color}88)`, boxShadow: isHovered ? `0 -4px 12px ${color}88` : 'none', transition: 'background 150ms ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-1 mt-1">
                    {buckets.map((_, i) => (<div key={i} className={`flex-1 text-center text-[11px] tabular-nums transition-colors duration-150 ${hoveredBucket === i ? 'font-black text-brand' : 'font-semibold text-muted'}`}>{i + 1}</div>))}
                </div>
            </div>
            <div className="flex flex-wrap gap-8 pt-5 border-t border-border">
                {[
                    { label: 'Most common score', value: `${buckets.indexOf(Math.max(...buckets)) + 1}/10` },
                    { label: 'Scores of 8+',      value: `${((buckets.slice(7).reduce((a, b) => a + b, 0) / total) * 100).toFixed(0)}%` },
                    { label: 'Scores below 5',    value: `${((buckets.slice(0, 4).reduce((a, b) => a + b, 0) / total) * 100).toFixed(0)}%` },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <p className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em] mb-1">{label}</p>
                        <p className="text-xl font-black text-brand tabular-nums">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── rater profile card ──────────────────────────────────────────── */
function RaterCard({ name, avg, count, rank, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    const [barAnimated, setBarAnimated] = useState(false);
    useEffect(() => {
        const t1 = setTimeout(() => setVisible(true), delay);
        const t2 = setTimeout(() => setBarAnimated(true), delay + 300);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [delay]);
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarColors = ['var(--color-brand)', 'var(--color-brand-light)', '#f59e0b'];
    const avatarBg = avatarColors[rank] || 'var(--color-brand)';
    const barPct = (avg / 10) * 100;
    const barColor = avg <= 5 ? 'var(--color-error)' : avg <= 7 ? 'var(--color-warning)' : 'var(--color-success)';
    const medals = ['🥇', '🥈', '🥉'];
    return (
        <div 
            className="bg-surface-2 border border-border rounded-xl p-5 flex items-center gap-4"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-16px)',
                transition: 'opacity 0.45s ease, transform 0.45s ease',
            }}
        >
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${avatarBg}dd, ${avatarBg}88)`, boxShadow: `0 2px 8px ${avatarBg}55`, border: `2px solid ${avatarBg}44` }}>
                <span className="text-[13px] font-black text-white tracking-[0.02em]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-text truncate">{name}</span>
                    <span className="text-[11px] bg-surface border border-border rounded-full px-2 py-[1px] text-muted font-semibold shrink-0">{count} ratings</span>
                </div>
                <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: barAnimated ? `${barPct}%` : '0%', background: `linear-gradient(90deg, ${barColor}88, ${barColor})`, transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>
                <div className="mt-1 text-[11px] text-muted font-semibold">Avg score across all rated pubs</div>
            </div>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
                <span className="text-2xl leading-none">{medals[rank]}</span>
                <span className="text-lg font-black tabular-nums" style={{ color: barColor }}>{avg.toFixed(1)}</span>
                <span className="text-[10px] text-muted font-semibold">/10</span>
            </div>
        </div>
    );
}

/* ── divisive split bar ──────────────────────────────────────────── */
function DivisivePubRow({ pub, index, animated }) {
    const spreadPct = Math.min(50, (pub.variance / 10) * 50);
    const leftPct  = Math.max(2, 50 - spreadPct);
    const rightPct = Math.max(2, 50 + spreadPct);
    const ranks = ['#1', '#2', '#3'];
    return (
        <div className="flex items-center gap-3">
            <span className={`min-w-[2rem] text-sm font-black ${index === 0 ? 'text-brand' : 'text-faint'}`}>{ranks[index]}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-text truncate">{pub.name}</span>
                    <span className="text-xs text-muted font-semibold shrink-0 ml-2">avg {pub.mean.toFixed(1)}</span>
                </div>
                <div className="relative h-3 bg-surface-2 rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 rounded-l-full" style={{ width: animated ? `${leftPct}%` : '50%', background: 'linear-gradient(90deg, #dc262688, #dc2626cc)', transition: `width ${0.5 + index * 0.1}s cubic-bezier(0.16, 1, 0.3, 1)` }} />
                    <div className="absolute right-0 top-0 bottom-0 rounded-r-full" style={{ width: animated ? `${100 - rightPct}%` : '50%', background: 'linear-gradient(90deg, #16a34acc, #16a34a88)', transition: `width ${0.5 + index * 0.1}s cubic-bezier(0.16, 1, 0.3, 1)` }} />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-border -translate-x-1/2 z-[1]" />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[#dc2626] font-bold">👎 Harsh</span>
                    <span className="text-[10px] text-[#16a34a] font-bold">Generous 👍</span>
                </div>
            </div>
            <span className="text-xs font-bold bg-brand-highlight text-brand px-2 py-1 rounded-full shrink-0 tabular-nums">var {pub.variance.toFixed(1)}</span>
        </div>
    );
}

/* ── main component ─────────────────────────────────────────────── */
export default function InsightsPage({ pubs, scores, users, criteria }) {
    const safePubs     = pubs     || [];
    const safeScores   = scores   || {};
    const safeUsers    = users    || {};
    const safeCriteria = criteria || [];
    const [divisiveAnimated, setDivisiveAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setDivisiveAnimated(true), 200); return () => clearTimeout(t); }, []);

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
                        critValues.push(score.value); allPubValues.push(score.value);
                        totalScoreSum += score.value; totalScoreCount++;
                        ratedPubIds.add(pub.id);
                        if (!userAverages[score.userId]) userAverages[score.userId] = { total: 0, count: 0 };
                        userAverages[score.userId].total += score.value;
                        userAverages[score.userId].count++;
                    }
                });
                if (critValues.length > 0) {
                    const avg = critValues.reduce((a, b) => a + b, 0) / critValues.length;
                    if (!stats.categoryWinners[critId] || avg > stats.categoryWinners[critId].score)
                        stats.categoryWinners[critId] = { pubName: pub.name, score: avg };
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
            .filter(u => u.count > 5).sort((a, b) => a.avg - b.avg).slice(0, 3);
        stats.pubsRated     = ratedPubIds.size;
        stats.activeMembers = Object.values(userAverages).filter(u => u.count > 0).length;
        stats.groupAverage  = totalScoreCount > 0 ? totalScoreSum / totalScoreCount : 0;
        return stats;
    }, [safePubs, safeScores, safeCriteria]);

    const getUser = uid => { const u = safeUsers[uid]; return u?.nickname || u?.displayName || u?.email || 'Unknown User'; };

    const cardStyle = "bg-surface border border-border rounded-xl p-6 shadow-md";

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-20">

            {/* page header */}
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-black text-text font-display">Group Insights</h2>
                    <p className="text-sm text-muted mt-1">Deep data analytics based on {analytics.totalRatings.toLocaleString()} individual data points.</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {[
                        { label: 'Pubs Rated',     value: analytics.pubsRated,      color: '#d97706' },
                        { label: 'Active Members', value: analytics.activeMembers,  color: '#7c3aed' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-surface border border-border rounded-lg px-4 py-3 text-center min-w-[90px]">
                            <p className="text-lg font-black tabular-nums font-display" style={{ color }}>{value}</p>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-[0.08em]">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* STEP 1: KPI bar — 2 primary stats big, 2 in header above */}
            <div className="flex flex-wrap gap-5">
                <KpiCard icon="🍺" label="Total Ratings" value={analytics.totalRatings} color="var(--color-brand)"  delay={0}   />
                <KpiCard icon="⭐" label="Group Average" value={analytics.groupAverage} color="#059669" suffix="/10" delay={120} />
            </div>

            {/* STEP 2: Top pubs chart + Score Distribution side by side on large screens */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,28rem),1fr))] gap-6">
                <TopPubsChart pubs={safePubs} scores={safeScores} criteria={safeCriteria} />
                <ScoreDistribution pubs={safePubs} scores={safeScores} />
            </div>

            {/* STEP 3: Harshest Critics + Most Divisive side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={cardStyle}>
                    <h3 className="text-lg font-black text-text mb-1 font-display">Harshest Critics</h3>
                    <p className="text-xs text-muted mb-5">Members with the lowest average scores (min. 6 ratings).</p>
                    {analytics.harshCritics.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-4xl mb-2">🍺</p>
                            <p className="text-faint text-sm">Not enough data yet.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {analytics.harshCritics.map((critic, i) => (
                                <RaterCard key={critic.uid} name={getUser(critic.uid)} avg={critic.avg} count={critic.count} rank={i} delay={i * 120} />
                            ))}
                        </div>
                    )}
                </div>

                <div className={cardStyle}>
                    <h3 className="text-lg font-black text-text mb-1 font-display">Most Divisive Pubs</h3>
                    <p className="text-xs text-muted mb-5">Highest variance in ratings — love it or hate it.</p>
                    {analytics.divisivePubs.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-4xl mb-2">🤔</p>
                            <p className="text-faint text-sm">Not enough data yet.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {analytics.divisivePubs.map((pub, i) => (
                                <DivisivePubRow key={pub.name} pub={pub} index={i} animated={divisiveAnimated} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* STEP 4: Category Champions */}
            <div className={cardStyle}>
                <h3 className="text-lg font-black text-text mb-2 font-display">🏆 Category Champions</h3>
                <p className="text-xs text-muted mb-5">The best pub in each scoring category.</p>
                {Object.keys(analytics.categoryWinners).length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-4xl mb-2">🏅</p>
                        <p className="text-faint text-sm">Not enough data yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(analytics.categoryWinners).map(([critId, winner]) => {
                            const criterion = safeCriteria.find(c => c.id === critId);
                            return (
                                <div key={critId} className="bg-brand-highlight rounded-lg p-5 border border-brand-border flex flex-col gap-2">
                                    <p className="text-xs font-bold text-brand uppercase tracking-[0.06em]">{criterion?.name || critId}</p>
                                    <p className="font-black text-text text-base leading-snug flex-1">{winner.pubName}</p>
                                    <p className="text-xl font-black tabular-nums text-brand">{winner.score.toFixed(1)}<span className="text-xs font-semibold text-muted">/10</span></p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
