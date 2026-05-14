import React, { useMemo, useState, useEffect } from 'react';

/* ── helpers ────────────────────────────────────────────────────── */
function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avatarColor(index) {
    const palette = ['#b45309','#7c3aed','#0369a1','#047857','#dc2626','#c2410c','#4338ca','#0f766e'];
    return palette[index % palette.length];
}
function tierLabel(avg) {
    if (avg >= 9)   return { label: 'Legendary', color: '#b45309' };
    if (avg >= 7.5) return { label: 'Great',     color: '#d97706' };
    if (avg >= 6)   return { label: 'Good',       color: '#f59e0b' };
    if (avg >= 4)   return { label: 'Decent',     color: '#6b7280' };
    return               { label: 'Poor',       color: '#dc2626' };
}

/* ── podium card ────────────────────────────────────────────────── */
const PODIUM_HEIGHTS = ['7rem', '5rem', '5.5rem'];
const MEDALS         = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS  = ['#b45309', '#d97706', '#92400e'];

function PodiumCard({ pub, rank, animated }) {
    const tier = tierLabel(pub.avg);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)', opacity: animated ? 1 : 0, transform: animated ? 'translateY(0)' : 'translateY(10px)', transition: `opacity 0.5s ease ${rank * 0.12}s, transform 0.5s ease ${rank * 0.12}s` }}>
                <div style={{ fontSize: '1.6rem', lineHeight: 1, marginBottom: '2px' }}>{MEDALS[rank]}</div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text)', maxWidth: '7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pub.name}>{pub.name}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: PODIUM_COLORS[rank], fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-display)' }}>{pub.avg.toFixed(1)}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: tier.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{tier.label}</div>
            </div>
            <div style={{ width: '100%', height: animated ? PODIUM_HEIGHTS[rank] : '0px', background: `linear-gradient(180deg, ${PODIUM_COLORS[rank]}dd, ${PODIUM_COLORS[rank]}88)`, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 -4px 16px ${PODIUM_COLORS[rank]}44`, transition: `height 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${rank * 0.1}s`, overflow: 'hidden' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', opacity: 0.9 }}>#{rank + 1}</span>
            </div>
        </div>
    );
}

/* ── ranked table row ───────────────────────────────────────────── */
function RankedRow({ pub, rank, animated, delay, criteria, userScores }) {
    const [open, setOpen] = useState(false);
    const tier = tierLabel(pub.avg);
    const barPct = (pub.avg / 10) * 100;
    const breakdown = useMemo(() => {
        if (!criteria || !userScores) return [];
        return criteria.filter(c => c.type === 'scale').map(c => {
            const s = (userScores[pub.id]?.[c.id] || []).filter(s => s.type === 'scale' && s.value != null);
            if (s.length === 0) return null;
            return { name: c.name, avg: s.reduce((a, b) => a + b.value, 0) / s.length };
        }).filter(Boolean);
    }, [criteria, userScores, pub.id]);
    return (
        <div>
            <div
                onClick={() => breakdown.length > 0 && setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)', cursor: breakdown.length > 0 ? 'pointer' : 'default', background: open ? 'var(--color-surface-2)' : 'transparent', transition: 'background 150ms ease', opacity: animated ? 1 : 0, transform: animated ? 'translateX(0)' : 'translateX(-12px)', transitionProperty: 'opacity, transform, background', transitionDuration: '0.4s, 0.4s, 150ms', transitionDelay: `${delay}s, ${delay}s, 0s` }}
            >
                <span style={{ minWidth: '2rem', textAlign: 'right', fontSize: 'var(--text-sm)', fontWeight: 900, color: rank < 3 ? PODIUM_COLORS[rank] : 'var(--color-text-faint)', fontVariantNumeric: 'tabular-nums' }}>{rank < 3 ? MEDALS[rank] : `#${rank + 1}`}</span>
                <span style={{ minWidth: '8rem', maxWidth: '8rem', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pub.name}>{pub.name}</span>
                <div style={{ flex: 1, height: '10px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: animated ? `${barPct}%` : '0%', background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`, borderRadius: 'var(--radius-full)', transition: `width 0.6s cubic-bezier(0.16,1,0.3,1) ${delay + 0.1}s` }} />
                </div>
                <span style={{ minWidth: '2.8rem', textAlign: 'right', fontSize: 'var(--text-sm)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: tier.color }}>{pub.avg.toFixed(1)}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: tier.color, minWidth: '4.5rem', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tier.label}</span>
                {breakdown.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                )}
            </div>
            {open && breakdown.length > 0 && (
                <div style={{ margin: '0 var(--space-4) var(--space-3) calc(2rem + var(--space-3) + 8rem + var(--space-3))', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--color-border)' }}>
                    {breakdown.map(b => {
                        const bTier = tierLabel(b.avg);
                        return (
                            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <span style={{ minWidth: '6rem', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>{b.name}</span>
                                <div style={{ flex: 1, height: '6px', background: 'var(--color-surface)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(b.avg / 10) * 100}%`, background: bTier.color, borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: bTier.color, fontVariantNumeric: 'tabular-nums', minWidth: '2rem', textAlign: 'right' }}>{b.avg.toFixed(1)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── main page ──────────────────────────────────────────────────── */
export default function IndividualRankingsPage({ pubs, scores, users, criteria, currentUser }) {
    const safePubs     = pubs     || [];
    const safeScores   = scores   || {};
    const safeUsers    = users    || {};
    const safeCriteria = criteria || [];

    const members = useMemo(() => {
        const seen = {};
        safePubs.forEach(pub => {
            Object.values(safeScores[pub.id] || {}).forEach(critScores => {
                (critScores || []).forEach(s => {
                    if (s.userId && !seen[s.userId]) {
                        const u = safeUsers[s.userId];
                        seen[s.userId] = { uid: s.userId, name: u?.nickname || u?.displayName || u?.email || 'Unknown', avatarUrl: u?.avatarUrl || null };
                    }
                });
            });
        });
        return Object.values(seen).sort((a, b) => a.name.localeCompare(b.name));
    }, [safePubs, safeScores, safeUsers]);

    const [selectedUid, setSelectedUid] = useState(null);
    useEffect(() => {
        if (members.length === 0) return;
        if (selectedUid && members.find(m => m.uid === selectedUid)) return;
        const preferred = currentUser?.uid && members.find(m => m.uid === currentUser.uid);
        setSelectedUid(preferred ? preferred.uid : members[0].uid);
    }, [members, currentUser]);

    const selectedMember = members.find(m => m.uid === selectedUid);
    const memberIndex    = members.findIndex(m => m.uid === selectedUid);
    const accentColor    = avatarColor(memberIndex);

    const rankedPubs = useMemo(() => {
        if (!selectedUid) return [];
        const rows = [];
        safePubs.forEach(pub => {
            const myValues = [];
            Object.values(safeScores[pub.id] || {}).forEach(critScores => {
                (critScores || []).forEach(s => {
                    if (s.userId === selectedUid && s.type === 'scale' && s.value != null) myValues.push(s.value);
                });
            });
            if (myValues.length === 0) return;
            rows.push({ id: pub.id, name: pub.name, avg: myValues.reduce((a, b) => a + b, 0) / myValues.length, count: myValues.length });
        });
        return rows.sort((a, b) => b.avg - a.avg);
    }, [selectedUid, safePubs, safeScores]);

    const userScores = useMemo(() => {
        if (!selectedUid) return {};
        const result = {};
        safePubs.forEach(pub => {
            result[pub.id] = {};
            Object.entries(safeScores[pub.id] || {}).forEach(([critId, critScores]) => {
                result[pub.id][critId] = (critScores || []).filter(s => s.userId === selectedUid);
            });
        });
        return result;
    }, [selectedUid, safePubs, safeScores]);

    const [podiumAnimated, setPodiumAnimated] = useState(false);
    const [tableAnimated,  setTableAnimated]  = useState(false);
    useEffect(() => {
        setPodiumAnimated(false); setTableAnimated(false);
        const t1 = setTimeout(() => setPodiumAnimated(true), 80);
        const t2 = setTimeout(() => setTableAnimated(true), 300);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [selectedUid]);

    const podiumRows = [rankedPubs[1], rankedPubs[0], rankedPubs[2]].filter(Boolean);
    const podiumOrderRanks = [1, 0, 2];

    const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)' };

    // Personal stats
    const personalAvg = rankedPubs.length > 0 ? rankedPubs.reduce((a, b) => a + b.avg, 0) / rankedPubs.length : 0;
    const bestPub  = rankedPubs[0];
    const worstPub = rankedPubs[rankedPubs.length - 1];
    const topTierCount = rankedPubs.filter(p => p.avg >= 7.5).length;

    return (
        <div style={{ maxWidth: '64rem', margin: '0 auto' }} className="space-y-8 animate-fadeIn pb-20">

            {/* page header */}
            <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Individual Rankings</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Each member's personal pub rankings based solely on their own scores. Click a row to expand category scores.</p>
            </div>

            {members.length === 0 ? (
                <div style={{ ...cardStyle, padding: 'var(--space-16)', textAlign: 'center' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🍺</p>
                    <p style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 'var(--text-base)' }}>No ratings yet. Start rating pubs to see individual rankings.</p>
                </div>
            ) : (
                <>
                    {/* member pill switcher */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {members.map((m, i) => {
                            const isSelected = m.uid === selectedUid;
                            const color = avatarColor(i);
                            return (
                                <button
                                    key={m.uid}
                                    onClick={() => setSelectedUid(m.uid)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-full)', border: isSelected ? `2px solid ${color}` : '1.5px solid var(--color-border)', background: isSelected ? `${color}18` : 'var(--color-surface)', cursor: 'pointer', transition: 'all 180ms ease', fontFamily: 'var(--font-body)' }}
                                >
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}dd, ${color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>{initials(m.name)}</span>
                                    </div>
                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: isSelected ? 800 : 600, color: isSelected ? color : 'var(--color-text-muted)' }}>{m.name}</span>
                                    {isSelected && <span style={{ fontSize: '10px', background: color, color: '#fff', borderRadius: 'var(--radius-full)', padding: '0 6px', fontWeight: 700 }}>{rankedPubs.length}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {rankedPubs.length === 0 ? (
                        <div style={{ ...cardStyle, padding: 'var(--space-16)', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>🤔</p>
                            <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{selectedMember?.name} hasn't rated any pubs yet.</p>
                        </div>
                    ) : (
                        <>
                            {/* member hero strip */}
                            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                                {/* coloured top accent bar */}
                                <div style={{ height: '4px', background: `linear-gradient(90deg, ${accentColor}, ${accentColor}66)` }} />
                                <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                                    {/* avatar */}
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${accentColor}44`, border: `2px solid ${accentColor}44` }}>
                                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>{initials(selectedMember?.name)}</span>
                                    </div>
                                    {/* name + sub */}
                                    <div style={{ flex: 1, minWidth: '8rem' }}>
                                        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>{selectedMember?.name}</p>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>{rankedPubs.length} pubs rated</p>
                                    </div>
                                    {/* stat chips */}
                                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                                        {[
                                            { label: 'Personal Avg', value: personalAvg.toFixed(2), suffix: '/10', color: accentColor },
                                            { label: 'Best',         value: bestPub?.avg.toFixed(1), suffix: '', color: '#b45309',   sub: bestPub?.name },
                                            { label: 'Worst',        value: worstPub?.avg.toFixed(1), suffix: '', color: '#dc2626',  sub: worstPub?.name },
                                            { label: '7.5+ Pubs',    value: topTierCount,              suffix: '', color: '#059669' },
                                        ].map(({ label, value, suffix, color, sub }) => (
                                            <div key={label} style={{ textAlign: 'center', minWidth: '60px' }}>
                                                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</p>
                                                <p style={{ fontSize: 'clamp(1.3rem, 2vw, 1.6rem)', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}{suffix}</p>
                                                {sub && <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', maxWidth: '5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px auto 0' }} title={sub}>{sub}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* podium + full table side by side on wide screens */}
                            <div style={{ display: 'grid', gridTemplateColumns: rankedPubs.length >= 2 ? 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))' : '1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

                                {rankedPubs.length >= 2 && (
                                    <div style={{ ...cardStyle, padding: 'var(--space-6)' }}>
                                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-5)', fontFamily: 'var(--font-display)' }}>🏆 {selectedMember?.name}'s Top 3</h3>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
                                            {podiumRows.map((pub, displayIdx) => {
                                                const actualRank = podiumOrderRanks[displayIdx];
                                                return pub ? <PodiumCard key={pub.id} pub={pub} rank={actualRank} animated={podiumAnimated} /> : <div key={displayIdx} style={{ flex: 1 }} />;
                                            })}
                                        </div>
                                        {/* tier legend */}
                                        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                                            {[{ color: '#b45309', label: 'Legendary 9+' }, { color: '#d97706', label: 'Great 7.5+' }, { color: '#f59e0b', label: 'Good 6+' }, { color: '#6b7280', label: 'Decent 4+' }].map(({ color, label }) => (
                                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                                                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* full ranked table */}
                                <div style={cardStyle}>
                                    <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-3)' }}>
                                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Full Rankings</h3>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Click any row to expand category scores.</p>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--color-border)' }}>
                                        {rankedPubs.map((pub, i) => (
                                            <RankedRow key={pub.id} pub={pub} rank={i} animated={tableAnimated} delay={Math.min(i * 0.04, 0.6)} criteria={safeCriteria} userScores={userScores} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
