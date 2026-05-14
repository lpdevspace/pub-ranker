import React, { useMemo, useState, useEffect } from 'react';

/* ── helpers ────────────────────────────────────────────────────────────── */
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

/* ── podium card ────────────────────────────────────────────────────────── */
const PODIUM_HEIGHTS = ['7rem', '5rem', '5.5rem'];  // 1st tallest
const PODIUM_ORDER   = [1, 0, 2];                  // display order: 2nd, 1st, 3rd
const MEDALS         = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS  = ['#b45309', '#d97706', '#92400e'];

function PodiumCard({ pub, rank, animated }) {
    const tier = tierLabel(pub.avg);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            {/* info above block */}
            <div style={{
                textAlign: 'center', marginBottom: 'var(--space-2)',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateY(0)' : 'translateY(10px)',
                transition: `opacity 0.5s ease ${rank * 0.12}s, transform 0.5s ease ${rank * 0.12}s`,
            }}>
                <div style={{ fontSize: '1.6rem', lineHeight: 1, marginBottom: '2px' }}>{MEDALS[rank]}</div>
                <div style={{
                    fontSize: 'var(--text-xs)', fontWeight: 700,
                    color: 'var(--color-text)',
                    maxWidth: '7rem', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={pub.name}>{pub.name}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: PODIUM_COLORS[rank], fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-display)' }}>{pub.avg.toFixed(1)}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: tier.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{tier.label}</div>
            </div>
            {/* platform block */}
            <div style={{
                width: '100%',
                height: animated ? PODIUM_HEIGHTS[rank] : '0px',
                background: `linear-gradient(180deg, ${PODIUM_COLORS[rank]}dd, ${PODIUM_COLORS[rank]}88)`,
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 -4px 16px ${PODIUM_COLORS[rank]}44`,
                transition: `height 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${rank * 0.1}s`,
                overflow: 'hidden',
            }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', opacity: 0.9 }}>#{rank + 1}</span>
            </div>
        </div>
    );
}

/* ── ranked table row ──────────────────────────────────────────────────── */
function RankedRow({ pub, rank, animated, delay, criteria, userScores }) {
    const [open, setOpen] = useState(false);
    const tier = tierLabel(pub.avg);
    const barPct = (pub.avg / 10) * 100;

    // Per-criterion breakdown for this pub
    const breakdown = useMemo(() => {
        if (!criteria || !userScores) return [];
        return criteria
            .filter(c => c.type === 'scale')
            .map(c => {
                const scores = (userScores[pub.id]?.[c.id] || []).filter(s => s.type === 'scale' && s.value != null);
                if (scores.length === 0) return null;
                const avg = scores.reduce((a, b) => a + b.value, 0) / scores.length;
                return { name: c.name, avg };
            })
            .filter(Boolean);
    }, [criteria, userScores, pub.id]);

    return (
        <div>
            <div
                onClick={() => breakdown.length > 0 && setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: breakdown.length > 0 ? 'pointer' : 'default',
                    background: open ? 'var(--color-surface-2)' : 'transparent',
                    transition: 'background 150ms ease',
                    opacity: animated ? 1 : 0,
                    transform: animated ? 'translateX(0)' : 'translateX(-12px)',
                    transitionProperty: 'opacity, transform, background',
                    transitionDuration: `0.4s, 0.4s, 150ms`,
                    transitionDelay: `${delay}s, ${delay}s, 0s`,
                }}
            >
                {/* rank number */}
                <span style={{
                    minWidth: '2rem', textAlign: 'right',
                    fontSize: 'var(--text-sm)', fontWeight: 900,
                    color: rank < 3 ? PODIUM_COLORS[rank] : 'var(--color-text-faint)',
                    fontVariantNumeric: 'tabular-nums',
                }}>{rank < 3 ? MEDALS[rank] : `#${rank + 1}`}</span>

                {/* pub name */}
                <span style={{
                    minWidth: '8rem', maxWidth: '8rem',
                    fontSize: 'var(--text-sm)', fontWeight: 700,
                    color: 'var(--color-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={pub.name}>{pub.name}</span>

                {/* score bar */}
                <div style={{ flex: 1, height: '10px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: animated ? `${barPct}%` : '0%',
                        background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`,
                        borderRadius: 'var(--radius-full)',
                        transition: `width 0.6s cubic-bezier(0.16,1,0.3,1) ${delay + 0.1}s`,
                    }} />
                </div>

                {/* score + tier */}
                <span style={{ minWidth: '2.8rem', textAlign: 'right', fontSize: 'var(--text-sm)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: tier.color }}>{pub.avg.toFixed(1)}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: tier.color, minWidth: '4.5rem', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tier.label}</span>

                {/* expand chevron */}
                {breakdown.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                )}
            </div>

            {/* category breakdown drawer */}
            {open && breakdown.length > 0 && (
                <div style={{
                    margin: '0 var(--space-4) var(--space-3) calc(2rem + var(--space-3) + 8rem + var(--space-3))',
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                    background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-3) var(--space-4)',
                    border: '1px solid var(--color-border)',
                }}>
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

/* ── main page ─────────────────────────────────────────────────────────────── */
export default function IndividualRankingsPage({ pubs, scores, users, criteria, currentUser }) {
    const safePubs     = pubs     || [];
    const safeScores   = scores   || {};
    const safeUsers    = users    || {};
    const safeCriteria = criteria || [];

    // Build list of members who have rated at least one pub
    const members = useMemo(() => {
        const seen = {};
        safePubs.forEach(pub => {
            Object.values(safeScores[pub.id] || {}).forEach(critScores => {
                (critScores || []).forEach(s => {
                    if (s.userId && !seen[s.userId]) {
                        const u = safeUsers[s.userId];
                        seen[s.userId] = {
                            uid: s.userId,
                            name: u?.nickname || u?.displayName || u?.email || 'Unknown',
                        };
                    }
                });
            });
        });
        return Object.values(seen).sort((a, b) => a.name.localeCompare(b.name));
    }, [safePubs, safeScores, safeUsers]);

    // Default to current user if they exist in members, else first member
    const [selectedUid, setSelectedUid] = useState(null);
    useEffect(() => {
        if (members.length === 0) return;
        if (selectedUid && members.find(m => m.uid === selectedUid)) return;
        const preferred = currentUser?.uid && members.find(m => m.uid === currentUser.uid);
        setSelectedUid(preferred ? preferred.uid : members[0].uid);
    }, [members, currentUser]);

    const selectedMember = members.find(m => m.uid === selectedUid);

    // Compute this member's ranked pubs
    const rankedPubs = useMemo(() => {
        if (!selectedUid) return [];
        const rows = [];
        safePubs.forEach(pub => {
            const pubScores = safeScores[pub.id] || {};
            const myValues = [];
            Object.values(pubScores).forEach(critScores => {
                (critScores || []).forEach(s => {
                    if (s.userId === selectedUid && s.type === 'scale' && s.value != null)
                        myValues.push(s.value);
                });
            });
            if (myValues.length === 0) return;
            rows.push({ id: pub.id, name: pub.name, avg: myValues.reduce((a, b) => a + b, 0) / myValues.length, count: myValues.length });
        });
        return rows.sort((a, b) => b.avg - a.avg);
    }, [selectedUid, safePubs, safeScores]);

    // Per-pub per-criterion scores just for selected user (for breakdown drawers)
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
    const [tableAnimated, setTableAnimated] = useState(false);
    useEffect(() => {
        setPodiumAnimated(false); setTableAnimated(false);
        const t1 = setTimeout(() => setPodiumAnimated(true), 80);
        const t2 = setTimeout(() => setTableAnimated(true), 300);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [selectedUid]);

    const top3       = PODIUM_ORDER.map(i => rankedPubs[i]).filter(Boolean);
    const podiumRows = [rankedPubs[1], rankedPubs[0], rankedPubs[2]].filter(Boolean); // display order
    const restPubs   = rankedPubs.slice(3);

    const memberIndex = members.findIndex(m => m.uid === selectedUid);
    const cardStyle   = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)' };

    return (
        <div style={{ maxWidth: '56rem', margin: '0 auto' }} className="space-y-8 animate-fadeIn pb-20">

            {/* header */}
            <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Individual Rankings</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Each member’s personal pub rankings based solely on their own scores. Click a row to expand category scores.</p>
            </div>

            {/* member switcher */}
            {members.length === 0 ? (
                <div style={{ ...cardStyle, padding: 'var(--space-10)', textAlign: 'center' }}>
                    <p style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>🍺</p>
                    <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>No ratings yet. Start rating pubs to see individual rankings.</p>
                </div>
            ) : (
                <>
                    {/* pill switcher */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {members.map((m, i) => {
                            const isSelected = m.uid === selectedUid;
                            const color = avatarColor(i);
                            return (
                                <button
                                    key={m.uid}
                                    onClick={() => setSelectedUid(m.uid)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                        padding: 'var(--space-2) var(--space-3)',
                                        borderRadius: 'var(--radius-full)',
                                        border: isSelected ? `2px solid ${color}` : '1.5px solid var(--color-border)',
                                        background: isSelected ? `${color}18` : 'var(--color-surface)',
                                        cursor: 'pointer',
                                        transition: 'all 180ms ease',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>{initials(m.name)}</span>
                                    </div>
                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: isSelected ? 800 : 600, color: isSelected ? color : 'var(--color-text-muted)' }}>{m.name}</span>
                                    {isSelected && <span style={{ fontSize: '10px', background: color, color: '#fff', borderRadius: 'var(--radius-full)', padding: '0 6px', fontWeight: 700 }}>{rankedPubs.length}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {rankedPubs.length === 0 ? (
                        <div style={{ ...cardStyle, padding: 'var(--space-10)', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>🤔</p>
                            <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{selectedMember?.name} hasn’t rated any pubs yet.</p>
                        </div>
                    ) : (
                        <>
                            {/* member header bar */}
                            <div style={{
                                ...cardStyle,
                                padding: 'var(--space-4) var(--space-5)',
                                display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap',
                            }}>
                                <div style={{
                                    width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                                    background: `linear-gradient(135deg, ${avatarColor(memberIndex)}dd, ${avatarColor(memberIndex)}88)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 4px 12px ${avatarColor(memberIndex)}44`,
                                    border: `2px solid ${avatarColor(memberIndex)}44`,
                                }}>
                                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>{initials(selectedMember?.name)}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>{selectedMember?.name}</p>
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{rankedPubs.length} pubs rated &bull; personal avg <strong style={{ color: avatarColor(memberIndex) }}>{(rankedPubs.reduce((a, b) => a + b.avg, 0) / rankedPubs.length).toFixed(2)}</strong></p>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                                    {[
                                        { label: 'Highest', value: rankedPubs[0]?.avg.toFixed(1), name: rankedPubs[0]?.name, icon: '👑' },
                                        { label: 'Lowest',  value: rankedPubs[rankedPubs.length - 1]?.avg.toFixed(1), name: rankedPubs[rankedPubs.length - 1]?.name, icon: '👎' },
                                    ].map(({ label, value, name, icon }) => (
                                        <div key={label} style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{icon} {label}</p>
                                            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-brand)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                                            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', maxWidth: '6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* podium (top 3 only) */}
                            {rankedPubs.length >= 2 && (
                                <div style={{ ...cardStyle, padding: 'var(--space-6)' }}>
                                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-5)', fontFamily: 'var(--font-display)' }}>🏆 {selectedMember?.name}’s Top 3</h3>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
                                        {podiumRows.map((pub, displayIdx) => {
                                            // display order: 2nd(1), 1st(0), 3rd(2)
                                            const actualRank = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2;
                                            return pub ? <PodiumCard key={pub.id} pub={pub} rank={actualRank} animated={podiumAnimated} /> : <div key={displayIdx} style={{ flex: 1 }} />;
                                        })}
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
                                        <RankedRow
                                            key={pub.id}
                                            pub={pub}
                                            rank={i}
                                            animated={tableAnimated}
                                            delay={Math.min(i * 0.04, 0.6)}
                                            criteria={safeCriteria}
                                            userScores={userScores}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
