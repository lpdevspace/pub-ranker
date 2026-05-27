import React, { useState, useMemo, useEffect } from 'react';
import { computeBadges, BADGE_CATEGORIES, TIER_STYLES } from '../utils/badgeEngine';
import BadgeCard from '../components/BadgeCard';
import BadgeActivityFeed from '../components/BadgeActivityFeed';
import useBadgeUnlocks from '../hooks/useBadgeUnlocks';
import { getUserDisplayName } from '../utils/users';

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
const AVATAR_COLORS = ['#b45309','#7c3aed','#0369a1','#047857','#dc2626','#c2410c','#4338ca','#0f766e'];
function avatarColor(idx) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

function formatDate(ts) {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Leaderboard row ──────────────────────────────────────────────────────────
function LeaderRow({ rank, member, count, total, isCurrentUser }) {
    const pct  = total > 0 ? (count / total) * 100 : 0;
    const name = getUserDisplayName(member);
    return (
        <div style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '0.75rem',
            padding:     '0.6rem 1rem',
            borderRadius:'0.75rem',
            background:  isCurrentUser ? 'rgba(217,119,6,0.08)' : 'transparent',
            border:      isCurrentUser ? '1.5px solid rgba(217,119,6,0.25)' : '1.5px solid transparent',
        }}>
            <span style={{
                minWidth:   '1.5rem',
                fontWeight: 900,
                fontSize:   '0.8rem',
                color:      rank <= 3 ? ['#b45309','#9ca3af','#cd7f32'][rank-1] : 'var(--color-text-faint, #9ca3af)',
                textAlign:  'right',
            }}>
                {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
            </span>
            <div style={{
                width:44, height:44, borderRadius:'50%',
                background:avatarColor(rank),
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:900, fontSize:'0.7rem',
                flexShrink:0, overflow:'hidden',
            }}>
                {member?.avatarUrl
                    ? <img src={member.avatarUrl} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" width="44" height="44" />
                    : initials(name)
                }
            </div>
            <span style={{ flex:1, fontWeight:700, fontSize:'0.85rem', color:'var(--color-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {name}{isCurrentUser ? ' (you)' : ''}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <div style={{ width:80, height:6, background:'var(--color-surface-offset, #e5e7eb)', borderRadius:'9999px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'#d97706', borderRadius:'9999px', transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
                </div>
                <span style={{ fontSize:'0.75rem', fontWeight:900, color:'#d97706', minWidth:'2rem', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{count}</span>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AchievementsPage({
    pubs = [], criteria = [], scores = {},
    users = [], allUsers = {},
    user, db, groupId,
}) {
    const [selectedUserId, setSelectedUserId] = useState(user?.uid || null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [crawlsCreated, setCrawlsCreated]   = useState(0);
    const [animated, setAnimated]             = useState(false);

    // Phase 2 — Firestore badge persistence
    const { earnedBadges, toastQueue, setToastQueue } = useBadgeUnlocks(db, groupId);

    useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

    useEffect(() => {
        if (!db || !groupId || !selectedUserId) return;
        setCrawlsCreated(0);
        db.collection('crawls')
            .where('groupId', '==', groupId)
            .where('createdBy', '==', selectedUserId)
            .get()
            .then(snap => setCrawlsCreated(snap.size))
            .catch(() => {});
    }, [db, groupId, selectedUserId]);

    const memberList = useMemo(() => {
        const arr = Array.isArray(users) ? users : Object.values(allUsers);
        return arr.filter(u => u && u.uid);
    }, [users, allUsers]);

    const selectedMember = useMemo(() =>
        memberList.find(u => u.uid === selectedUserId) || memberList[0],
        [memberList, selectedUserId]
    );

    const badges = useMemo(() =>
        selectedUserId
            ? computeBadges(selectedUserId, pubs, scores, criteria, memberList, crawlsCreated)
            : [],
        [selectedUserId, pubs, scores, criteria, memberList, crawlsCreated]
    );

    // Phase 2: merge Firestore earnedAt timestamps into badge objects
    const firestoreBadges = useMemo(() => {
        const userFirestoreMap = earnedBadges[selectedUserId] || [];
        const earnedAtById = {};
        userFirestoreMap.forEach(b => { earnedAtById[b.id] = b.earnedAt; });
        return badges.map(b => ({
            ...b,
            earnedAt: earnedAtById[b.id] || null,
        }));
    }, [badges, earnedBadges, selectedUserId]);

    const earnedBadgeList = firestoreBadges.filter(b => b.earned);
    const lockedBadges    = firestoreBadges.filter(b => !b.earned);

    const filteredBadges = useMemo(() => {
        const earned = firestoreBadges.filter(b => b.earned  && (activeCategory === 'all' || b.category === activeCategory));
        const locked = firestoreBadges.filter(b => !b.earned && (activeCategory === 'all' || b.category === activeCategory));
        return [...earned, ...locked];
    }, [firestoreBadges, activeCategory]);

    // Recently unlocked — sorted by earnedAt if available, else definition order
    const recentlyUnlocked = useMemo(() => {
        const sorted = [...earnedBadgeList].sort((a, b) => {
            const aMs = a.earnedAt?.toMillis?.() ?? 0;
            const bMs = b.earnedAt?.toMillis?.() ?? 0;
            return bMs - aMs;
        });
        return sorted.slice(0, 3);
    }, [earnedBadgeList]);

    const tierOrder = { legendary: 4, gold: 3, silver: 2, bronze: 1 };
    const rarestBadge = [...earnedBadgeList].sort((a, b) => (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0))[0];

    const leaderboard = useMemo(() => {
        return memberList.map(member => {
            const memberBadges = computeBadges(member.uid, pubs, scores, criteria, memberList, 0);
            return { member, count: memberBadges.filter(b => b.earned).length };
        }).sort((a, b) => b.count - a.count);
    }, [memberList, pubs, scores, criteria]);

    const totalBadges = firestoreBadges.length;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: '3rem' }}>

            {/* ── Page Title ── */}
            <div style={{ marginBottom: '1.5rem', opacity: animated ? 1 : 0, transform: animated ? 'none' : 'translateY(-8px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
                <h2 style={{ fontSize: 'var(--text-xl, 1.5rem)', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>🏅 Achievements</h2>
                <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Unlock badges by visiting, rating and contributing to the group</p>
            </div>

            {/* ── Phase 2: Group Activity Feed ── */}
            <div style={{ opacity: animated ? 1 : 0, transition: 'opacity 0.4s ease 0.03s' }}>
                <BadgeActivityFeed
                    db={db}
                    groupId={groupId}
                    currentUserId={user?.uid}
                    users={memberList}
                />
            </div>

            {/* ── Member Switcher ── */}
            {memberList.length > 1 && (
                <div style={{
                    display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem',
                    opacity: animated ? 1 : 0, transition: 'opacity 0.4s ease 0.05s',
                }}>
                    {memberList.map((member, idx) => {
                        const name     = getUserDisplayName(member);
                        const isActive = member.uid === selectedUserId;
                        return (
                            <button
                                key={member.uid}
                                onClick={() => setSelectedUserId(member.uid)}
                                style={{
                                    display:'flex', alignItems:'center', gap:'0.4rem',
                                    padding:'0.35rem 0.75rem 0.35rem 0.35rem',
                                    borderRadius:'9999px',
                                    border:`2px solid ${isActive ? '#d97706' : 'transparent'}`,
                                    background: isActive ? 'rgba(217,119,6,0.1)' : 'var(--color-surface, #f9fafb)',
                                    cursor:'pointer', transition:'all 180ms ease',
                                    fontWeight: isActive ? 800 : 600,
                                    fontSize:'0.8rem',
                                    color: isActive ? '#d97706' : 'var(--color-text-muted)',
                                }}
                            >
                                <div style={{
                                    width:28, height:28, borderRadius:'50%',
                                    background:avatarColor(idx),
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    color:'#fff', fontWeight:900, fontSize:'0.65rem',
                                    flexShrink:0, overflow:'hidden',
                                }}>
                                    {member.avatarUrl
                                        ? <img src={member.avatarUrl} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" width="28" height="28" />
                                        : initials(name)
                                    }
                                </div>
                                <span>{name.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Summary Strip ── */}
            <div style={{
                display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.75rem', marginBottom:'1.5rem',
                opacity: animated ? 1 : 0, transform: animated ? 'none' : 'translateY(8px)',
                transition:'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
            }}>
                <div style={{ background:'var(--color-surface)', borderRadius:'1rem', padding:'1rem', textAlign:'center', border:'1px solid var(--color-border, #e5e7eb)' }}>
                    <p style={{ fontSize:'1.8rem', fontWeight:900, color:'#d97706', margin:0, fontVariantNumeric:'tabular-nums' }}>{earnedBadgeList.length}</p>
                    <p style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-text-muted)', margin:'0.2rem 0 0' }}>Earned</p>
                </div>
                <div style={{ background:'var(--color-surface)', borderRadius:'1rem', padding:'1rem', textAlign:'center', border:'1px solid var(--color-border, #e5e7eb)' }}>
                    <p style={{ fontSize:'1.8rem', fontWeight:900, color:'var(--color-text)', margin:0, fontVariantNumeric:'tabular-nums' }}>{totalBadges}</p>
                    <p style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-text-muted)', margin:'0.2rem 0 0' }}>Total</p>
                </div>
                <div style={{ background:'var(--color-surface)', borderRadius:'1rem', padding:'1rem', textAlign:'center', border:'1px solid var(--color-border, #e5e7eb)' }}>
                    <p style={{ fontSize:'1.8rem', fontWeight:900, color: rarestBadge ? TIER_STYLES[rarestBadge.tier]?.ring : 'var(--color-text-faint)', margin:0 }}>
                        {rarestBadge ? rarestBadge.emoji : '—'}
                    </p>
                    <p style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-text-muted)', margin:'0.2rem 0 0' }}>Rarest</p>
                </div>
            </div>

            {/* ── Recently Unlocked Spotlight — sorted by earnedAt ── */}
            {recentlyUnlocked.length > 0 && (
                <div style={{ marginBottom:'1.5rem', opacity: animated ? 1 : 0, transition:'opacity 0.4s ease 0.15s' }}>
                    <p style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-text-muted)', marginBottom:'0.6rem' }}>Recent Unlocks</p>
                    <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                        {recentlyUnlocked.map(badge => (
                            <div key={badge.id} style={{
                                display:'flex', alignItems:'center', gap:'0.6rem',
                                padding:'0.5rem 0.9rem 0.5rem 0.6rem',
                                borderRadius:'9999px',
                                background:TIER_STYLES[badge.tier]?.bg,
                                border:`1.5px solid ${TIER_STYLES[badge.tier]?.ring}44`,
                            }}>
                                <span style={{ fontSize:'1.2rem' }}>{badge.emoji}</span>
                                <div>
                                    <p style={{ margin:0, fontSize:'0.75rem', fontWeight:800, color:TIER_STYLES[badge.tier]?.ring }}>{badge.name}</p>
                                    {/* Phase 2: show actual earn date */}
                                    {badge.earnedAt
                                        ? <p style={{ margin:0, fontSize:'0.6rem', color:'var(--color-text-muted)' }}>Earned {formatDate(badge.earnedAt)}</p>
                                        : <p style={{ margin:0, fontSize:'0.6rem', color:'var(--color-text-muted)' }}>{badge.description}</p>
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Category Tabs ── */}
            <div style={{
                display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'1.25rem',
                opacity: animated ? 1 : 0, transition:'opacity 0.4s ease 0.2s',
            }}>
                {BADGE_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        style={{
                            padding:'0.35rem 0.85rem', borderRadius:'9999px',
                            border:`2px solid ${activeCategory === cat.id ? '#d97706' : 'transparent'}`,
                            background: activeCategory === cat.id ? 'rgba(217,119,6,0.1)' : 'var(--color-surface, #f9fafb)',
                            cursor:'pointer', fontSize:'0.78rem',
                            fontWeight: activeCategory === cat.id ? 800 : 600,
                            color: activeCategory === cat.id ? '#d97706' : 'var(--color-text-muted)',
                            transition:'all 180ms ease',
                            display:'flex', alignItems:'center', gap:'0.3rem',
                        }}
                    >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                        {cat.id !== 'all' && (
                            <span style={{
                                background: activeCategory === cat.id ? '#d97706' : 'var(--color-surface-offset, #e5e7eb)',
                                color:      activeCategory === cat.id ? '#fff' : 'var(--color-text-muted)',
                                borderRadius:'9999px', padding:'0 0.35rem',
                                fontSize:'0.6rem', fontWeight:900, fontVariantNumeric:'tabular-nums',
                            }}>
                                {firestoreBadges.filter(b => b.earned && b.category === cat.id).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Badge Grid — BadgeCard receives earnedAt for tooltip/label ── */}
            <div style={{
                display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(6rem, 1fr))', gap:'0.75rem',
                marginBottom:'2.5rem',
                opacity: animated ? 1 : 0, transform: animated ? 'none' : 'translateY(12px)',
                transition:'opacity 0.4s ease 0.25s, transform 0.4s ease 0.25s',
            }}>
                {filteredBadges.length === 0 ? (
                    <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'3rem 1rem', color:'var(--color-text-muted)' }}>
                        <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🔍</div>
                        <p style={{ fontSize:'0.9rem', fontWeight:700 }}>No badges in this category yet</p>
                    </div>
                ) : (
                    filteredBadges.map(badge => (
                        <BadgeCard key={badge.id} badge={badge} size="md" showProgress />
                    ))
                )}
            </div>

            {/* ── Badge Leaderboard ── */}
            <div style={{
                opacity: animated ? 1 : 0, transform: animated ? 'none' : 'translateY(12px)',
                transition:'opacity 0.4s ease 0.35s, transform 0.4s ease 0.35s',
            }}>
                <h3 style={{ fontSize:'0.85rem', fontWeight:900, color:'var(--color-text)', marginBottom:'0.75rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>🏆 Badge Leaderboard</h3>
                <div style={{ background:'var(--color-surface)', borderRadius:'1rem', border:'1px solid var(--color-border, #e5e7eb)', overflow:'hidden' }}>
                    {leaderboard.map(({ member, count }, idx) => (
                        <LeaderRow
                            key={member.uid}
                            rank={idx + 1}
                            member={member}
                            count={count}
                            total={totalBadges}
                            isCurrentUser={member.uid === user?.uid}
                        />
                    ))}
                    {leaderboard.length === 0 && (
                        <div style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-muted)', fontSize:'0.85rem' }}>No members yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
