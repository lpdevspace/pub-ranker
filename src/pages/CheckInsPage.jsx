import { useState, useMemo } from 'react';
import useCheckIns from '../hooks/useCheckIns';
import { getUserDisplayName, getUserAvatar } from '../utils/users';

/* ── helpers ───────────────────────────────────────────────────────────── */
function relativeTime(date) {
    if (!date) return 'Just now';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#b45309','#7c3aed','#0369a1','#047857','#dc2626','#c2410c','#4338ca','#0f766e'];
function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ── skeleton ──────────────────────────────────────────────────────────── */
const shimmer = {
    background: 'linear-gradient(90deg, var(--color-surface-offset) 25%, var(--color-surface-dynamic) 50%, var(--color-surface-offset) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
    borderRadius: 'var(--radius-sm)',
};
function SkeletonCard() {
    return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ ...shimmer, width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ ...shimmer, height: 12, width: '45%' }} />
                <div style={{ ...shimmer, height: 10, width: '65%' }} />
            </div>
            <div style={{ ...shimmer, width: 48, height: 48, borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
        </div>
    );
}

/* ── stats bar ─────────────────────────────────────────────────────────── */
function StatsBar({ checkIns }) {
    const stats = useMemo(() => {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        let todayCount = 0;
        const activeSet = new Set();
        const pubSet    = new Set();
        checkIns.forEach(c => {
            const d = c.createdAt?.toDate ? c.createdAt.toDate() : null;
            if (d && d >= todayStart) { todayCount++; activeSet.add(c.userId); }
            pubSet.add(c.pubId);
        });
        return { todayCount, activeMembers: activeSet.size, uniquePubs: pubSet.size };
    }, [checkIns]);

    const items = [
        { icon: '📍', label: 'Check-ins today', value: stats.todayCount },
        { icon: '👥', label: 'Active today',    value: stats.activeMembers },
        { icon: '🍻', label: 'Pubs checked in', value: stats.uniquePubs },
    ];

    return (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {items.map(({ icon, label, value }) => (
                <div key={label} style={{
                    flex: '1 1 120px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-3) var(--space-4)',
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{icon}</span>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>{label}</p>
                        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-brand)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── check-in card ─────────────────────────────────────────────────────── */
function CheckInCard({ checkIn, pub, displayName, avatarUrl: avatarSrc, isOwn, onDelete, index }) {
    const [visible, setVisible] = useState(false);
    useState(() => { const t = setTimeout(() => setVisible(true), index * 55); return () => clearTimeout(t); });
    // trigger on mount
    import('react').then(({ useEffect: ue }) => {}).catch(() => {});

    const color = avatarColor(displayName);
    const time  = relativeTime(checkIn.createdAt);

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            opacity: 1,
            transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                {/* avatar */}
                {avatarSrc ? (
                    <img src={avatarSrc} alt={displayName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} loading="lazy" width="40" height="40" onError={e => e.target.style.display = 'none'} />
                ) : (
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 2px 6px ${color}44`,
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{initials(displayName)}</span>
                    </div>
                )}

                {/* text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                        checked in at <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{pub?.name || 'Unknown Pub'}</span> · {time}
                    </p>
                    {checkIn.note && (
                        <p style={{
                            fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4,
                            fontStyle: 'italic',
                            borderLeft: '2px solid var(--color-brand)',
                            paddingLeft: 'var(--space-2)',
                        }}>"{checkIn.note}"</p>
                    )}
                </div>

                {/* pub photo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', flexShrink: 0 }}>
                    {pub?.photoURL ? (
                        <img src={pub.photoURL} alt={pub.name} style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '1px solid var(--color-border)' }} loading="lazy" width="48" height="48" />
                    ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', fontSize: '1.4rem' }}>🍺</div>
                    )}
                    {isOwn && (
                        <button
                            onClick={() => onDelete(checkIn.id)}
                            aria-label="Delete check-in"
                            style={{
                                fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                transition: 'color 150ms',
                            }}
                            onMouseEnter={e => e.target.style.color = '#dc2626'}
                            onMouseLeave={e => e.target.style.color = 'var(--color-text-faint)'}
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── page ──────────────────────────────────────────────────────────────── */
export default function CheckInsPage({ db, groupId, pubs = [], allUsers = {}, user }) {
    const { checkIns, loading, deleteCheckIn } = useCheckIns({ db, groupId });
    const [filter, setFilter] = useState('all');

    const getPub = pid => (pubs || []).find(p => p.id === pid) || null;

    const filtered = useMemo(() => {
        if (filter === 'mine') return checkIns.filter(c => c.userId === user?.uid);
        if (filter === 'today') {
            const start = new Date(); start.setHours(0, 0, 0, 0);
            return checkIns.filter(c => {
                const d = c.createdAt?.toDate ? c.createdAt.toDate() : null;
                return d && d >= start;
            });
        }
        return checkIns;
    }, [checkIns, filter, user]);

    const FILTERS = [
        { id: 'all',   label: 'All' },
        { id: 'today', label: '📅 Today' },
        { id: 'mine',  label: '👤 Mine' },
    ];

    return (
        <>
            <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
            <div style={{ maxWidth: '42rem', margin: '0 auto' }} className="space-y-6 animate-fadeIn pb-20">

                <div>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>📍 Check-Ins</h2>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>See where the group is drinking right now.</p>
                </div>

                {!loading && checkIns.length > 0 && <StatsBar checkIns={checkIns} />}

                {/* filters */}
                {!loading && checkIns.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => (
                            <button key={f.id} onClick={() => setFilter(f.id)} style={{
                                padding: 'var(--space-1) var(--space-4)',
                                borderRadius: 'var(--radius-full)',
                                border: filter === f.id ? '2px solid var(--color-brand)' : '1.5px solid var(--color-border)',
                                background: filter === f.id ? 'var(--color-brand)' : 'var(--color-surface)',
                                color: filter === f.id ? '#fff' : 'var(--color-text-muted)',
                                fontFamily: 'var(--font-body)', fontWeight: 700,
                                fontSize: 'var(--text-xs)', cursor: 'pointer',
                                transition: 'all 180ms ease',
                            }}>{f.label}</button>
                        ))}
                    </div>
                )}

                {/* content */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {[0,1,2].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-xl)', padding: 'var(--space-12) var(--space-8)',
                        textAlign: 'center', boxShadow: 'var(--shadow-sm)',
                    }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-3)' }}>📍</span>
                        <p style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                            {filter === 'mine'  ? "You haven't checked in anywhere yet. Hit the 📍 button!" :
                             filter === 'today' ? 'Nobody has checked in today yet.' :
                                                  'No check-ins yet. Tap 📍 to be the first!'}
                        </p>
                        {filter !== 'all' && (
                            <button onClick={() => setFilter('all')} style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>Show all</button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {filtered.map((c, i) => (
                            <CheckInCard
                                key={c.id}
                                checkIn={c}
                                pub={getPub(c.pubId)}
                                displayName={getUserDisplayName(c.userId, allUsers)}
                                avatarUrl={getUserAvatar(c.userId, allUsers)}
                                isOwn={c.userId === user?.uid}
                                onDelete={deleteCheckIn}
                                index={i}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
