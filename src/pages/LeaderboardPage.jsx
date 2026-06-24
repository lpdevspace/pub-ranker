import React, { useState, useMemo, useEffect } from 'react';

/* ── Category Champions ───────────────────────────────────────────────────── */
function CategoryChampions({ rankedPubs, safeScores, safeCriteria }) {
    if (rankedPubs.length === 0) return null;

    const mostVisited = [...rankedPubs].sort((a, b) => b.ratingCount - a.ratingCount)[0];

    const perfectScores = {};
    rankedPubs.forEach(pub => {
        let tens = 0;
        safeCriteria.filter(c => c.type === 'scale').forEach(c => {
            (safeScores[pub.id]?.[c.id] || []).forEach(s => { if (s.value === 10) tens++; });
        });
        perfectScores[pub.id] = tens;
    });
    const mostPerfect = [...rankedPubs].sort((a, b) => (perfectScores[b.id] || 0) - (perfectScores[a.id] || 0))[0];

    const consistency = {};
    rankedPubs.forEach(pub => {
        const allVals = [];
        safeCriteria.filter(c => c.type === 'scale').forEach(c => {
            (safeScores[pub.id]?.[c.id] || []).forEach(s => { if (s.value != null && !isNaN(s.value)) allVals.push(s.value); });
        });
        if (allVals.length >= 3) {
            const mean = allVals.reduce((a, b) => a + b, 0) / allVals.length;
            const std  = Math.sqrt(allVals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allVals.length);
            consistency[pub.id] = std;
        }
    });
    const consistentPubs = rankedPubs.filter(p => consistency[p.id] !== undefined);
    const mostConsistent = consistentPubs.length > 0
        ? consistentPubs.sort((a, b) => consistency[a.id] - consistency[b.id])[0]
        : null;

    const hiddenGem = rankedPubs.filter(p => p.avgScore >= 7 && p.ratingCount <= 3).length > 0
        ? rankedPubs.filter(p => p.avgScore >= 7).sort((a, b) => a.ratingCount - b.ratingCount)[0]
        : null;

    const champions = [
        {
            key: 'top', emoji: '🏆', title: 'Top Rated', desc: 'Highest average score',
            pub: rankedPubs[0], stat: rankedPubs[0]?.avgScore.toFixed(1), statLabel: 'avg',
            accentColor: 'var(--color-brand)',
        },
        {
            key: 'visited', emoji: '👣', title: 'Most Visited', desc: 'Most individual ratings',
            pub: mostVisited, stat: mostVisited?.ratingCount, statLabel: 'ratings',
            accentColor: '#3b82f6',
        },
        {
            key: 'perfect', emoji: '💯', title: 'Perfection', desc: 'Most 10/10 scores',
            pub: mostPerfect, stat: perfectScores[mostPerfect?.id] || 0, statLabel: 'tens',
            accentColor: '#10b981',
        },
        mostConsistent && {
            key: 'consistent', emoji: '🎯', title: 'Most Consistent', desc: 'Lowest score variance',
            pub: mostConsistent, stat: consistency[mostConsistent?.id]?.toFixed(1), statLabel: 'σ deviation',
            accentColor: '#8b5cf6',
        },
        hiddenGem && {
            key: 'gem', emoji: '💎', title: 'Hidden Gem', desc: 'High score, few ratings',
            pub: hiddenGem, stat: hiddenGem?.avgScore.toFixed(1), statLabel: 'avg',
            accentColor: 'var(--color-copper)',
        },
    ].filter(Boolean);

    return (
        <div className="px-4 sm:px-6 pt-4 pb-2">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                <span className="text-xs font-black text-text-muted uppercase tracking-widest">Category Champions</span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {champions.map(champ => (
                    <div
                        key={champ.key}
                        className="relative flex flex-col items-center text-center p-3 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                        style={{
                            background: `color-mix(in srgb, ${champ.accentColor} 8%, var(--color-surface-2))`,
                            border: `1px solid color-mix(in srgb, ${champ.accentColor} 25%, var(--color-border))`,
                        }}
                    >
                        {/* top stripe */}
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: champ.accentColor }} />

                        <div className="mt-2 mb-2 relative">
                            {champ.pub?.photoURL ? (
                                <img
                                    src={champ.pub.photoURL} alt={champ.pub.name}
                                    className="w-12 h-12 rounded-full object-cover shadow-sm"
                                    style={{ border: `2px solid var(--color-surface)`, ring: `2px solid ${champ.accentColor}` }}
                                    loading="lazy" width="48" height="48"
                                />
                            ) : (
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                                    style={{ background: 'var(--color-surface-offset)', border: `2px solid var(--color-surface)` }}
                                >
                                    🍺
                                </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 text-base leading-none">{champ.emoji}</span>
                        </div>

                        <p
                            className="text-[9px] font-black uppercase tracking-widest mb-0.5"
                            style={{ color: champ.accentColor }}
                        >{champ.title}</p>

                        <p className="text-xs font-black text-text leading-tight line-clamp-2 mb-1 px-1">
                            {champ.pub?.name || '—'}
                        </p>

                        <div className="text-sm font-black" style={{ color: champ.accentColor }}>
                            {champ.stat}
                            <span className="text-[9px] font-bold text-text-faint ml-0.5">{champ.statLabel}</span>
                        </div>

                        <p className="text-[9px] text-text-faint mt-0.5 leading-tight">{champ.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Pub Podium ─────────────────────────────────────────────────────────────────── */
function PubPodium({ pubs }) {
    if (pubs.length === 0) return null;

    const order = [pubs[1], pubs[0], pubs[2]].filter(Boolean);
    const podiumConfig = {
        0: {
            height: 'h-20',
            bgStyle: { background: 'var(--color-surface-offset)', borderTop: '4px solid var(--color-border)' },
            textStyle: { color: 'var(--color-text-muted)' },
            ringStyle: { outline: '3px solid var(--color-border)' },
            label: '2nd', emoji: '🥈',
        },
        1: {
            height: 'h-28',
            bgStyle: { background: 'color-mix(in srgb, var(--color-brand) 10%, var(--color-surface-2))', borderTop: '4px solid var(--color-brand)' },
            textStyle: { color: 'var(--color-brand)' },
            ringStyle: { outline: '3px solid var(--color-brand)' },
            label: '1st', emoji: '🥇',
        },
        2: {
            height: 'h-14',
            bgStyle: { background: 'color-mix(in srgb, var(--color-copper) 10%, var(--color-surface-2))', borderTop: '4px solid var(--color-copper)' },
            textStyle: { color: 'var(--color-copper)' },
            ringStyle: { outline: '3px solid var(--color-copper)' },
            label: '3rd', emoji: '🥉',
        },
    };
    const slotForOrderIndex = [pubs[1] ? 0 : null, 1, pubs[2] ? 2 : null];

    return (
        <div className="flex items-end justify-center gap-3 sm:gap-6 px-4 pt-6 pb-2">
            {order.map((pub, orderIdx) => {
                const slot = slotForOrderIndex[orderIdx];
                if (slot === null || !pub) return null;
                const cfg = podiumConfig[slot];
                return (
                    <div key={pub.id} className="flex flex-col items-center flex-1 max-w-[140px]">
                        <div className="mb-2 rounded-full overflow-hidden" style={cfg.ringStyle}>
                            {pub.photoURL
                                ? <img src={pub.photoURL} alt={pub.name} className="w-16 h-16 rounded-full object-cover" loading="lazy" width="64" height="64" />
                                : <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: 'var(--color-surface-offset)' }}>🍺</div>
                            }
                        </div>
                        <p className="text-center text-xs font-black text-text leading-tight mb-1 line-clamp-2 px-1">{pub.name}</p>
                        <span className="text-lg font-black mb-2" style={cfg.textStyle}>{pub.avgScore.toFixed(1)}</span>
                        <div className={`w-full ${cfg.height} rounded-t-lg flex flex-col items-center justify-start pt-2 gap-1`} style={cfg.bgStyle}>
                            <span className="text-xl">{cfg.emoji}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={cfg.textStyle}>{cfg.label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Member Podium ──────────────────────────────────────────────────────────────── */
function MemberPodium({ members, onSelect }) {
    if (members.length === 0) return null;

    const order = [members[1], members[0], members[2]].filter(Boolean);
    const podiumConfig = {
        0: {
            height: 'h-20',
            bgStyle: { background: 'var(--color-surface-offset)', borderTop: '4px solid var(--color-border)' },
            textStyle: { color: 'var(--color-text-muted)' },
            ringStyle: { outline: '3px solid var(--color-border)' },
            label: '2nd', emoji: '🥈',
        },
        1: {
            height: 'h-28',
            bgStyle: { background: 'color-mix(in srgb, var(--color-brand) 10%, var(--color-surface-2))', borderTop: '4px solid var(--color-brand)' },
            textStyle: { color: 'var(--color-brand)' },
            ringStyle: { outline: '3px solid var(--color-brand)' },
            label: '1st', emoji: '👑',
        },
        2: {
            height: 'h-14',
            bgStyle: { background: 'color-mix(in srgb, var(--color-copper) 10%, var(--color-surface-2))', borderTop: '4px solid var(--color-copper)' },
            textStyle: { color: 'var(--color-copper)' },
            ringStyle: { outline: '3px solid var(--color-copper)' },
            label: '3rd', emoji: '🥉',
        },
    };
    const slotForOrderIndex = [members[1] ? 0 : null, 1, members[2] ? 2 : null];

    return (
        <div className="flex items-end justify-center gap-3 sm:gap-6 px-4 pt-6 pb-2">
            {order.map((member, orderIdx) => {
                const slot = slotForOrderIndex[orderIdx];
                if (slot === null || !member) return null;
                const cfg = podiumConfig[slot];
                const displayName = member.user?.nickname || member.user?.displayName || member.user?.email || 'Unknown';
                return (
                    <button
                        key={member.uid}
                        onClick={() => onSelect(member)}
                        className="flex flex-col items-center flex-1 max-w-[140px] group cursor-pointer bg-transparent border-0 p-0"
                    >
                        {slot === 1 && (
                            <span className="text-2xl mb-1 animate-bounce" style={{ animationDuration: '2s' }}>👑</span>
                        )}
                        <div className="mb-2 rounded-full overflow-hidden transition-transform group-hover:scale-105" style={cfg.ringStyle}>
                            {member.user?.avatarUrl
                                ? <img src={member.user.avatarUrl} alt={displayName} className="w-16 h-16 rounded-full object-cover" loading="lazy" width="64" height="64" />
                                : <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black" style={{ background: 'var(--color-brand)' }}>
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            }
                        </div>
                        <p className="text-center text-xs font-black text-text leading-tight mb-1 line-clamp-2 px-1">{displayName}</p>
                        <span className="text-base font-black mb-2" style={cfg.textStyle}>
                            {member.totalPoints} <span className="text-[10px] font-bold text-text-faint">pts</span>
                        </span>
                        <div className={`w-full ${cfg.height} rounded-t-lg flex flex-col items-center justify-start pt-2 gap-1`} style={cfg.bgStyle}>
                            <span className="text-xl">{slot !== 1 ? cfg.emoji : '🏆'}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={cfg.textStyle}>{cfg.label}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

/* ── Points Breakdown Bar ─────────────────────────────────────────────────────────────── */
function PointsBreakdown({ ratedCount, writtenReviews, pubsAdded, crawlsCreated, gamification }) {
    const ppp = gamification.pointsPerPub    || 5;
    const ppr = gamification.pointsPerReview || 2;
    const ppa = gamification.pointsPerAdd    || 3;
    const ppc = gamification.pointsPerCrawl  || 5;

    const segments = [
        { label: 'Pubs visited', value: ratedCount * ppp,     color: 'var(--color-brand)',  count: ratedCount,     unit: 'pubs'    },
        { label: 'Reviews',      value: writtenReviews * ppr,  color: '#3b82f6',             count: writtenReviews, unit: 'reviews' },
        { label: 'Pubs added',   value: pubsAdded * ppa,       color: '#10b981',             count: pubsAdded,      unit: 'added'   },
        { label: 'Crawls made',  value: crawlsCreated * ppc,   color: '#8b5cf6',             count: crawlsCreated,  unit: 'crawls'  },
    ].filter(s => s.value > 0);

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return null;

    return (
        <div className="mt-2">
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
                {segments.map(seg => (
                    <div
                        key={seg.label}
                        className="transition-all duration-500"
                        style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
                        title={`${seg.label}: ${seg.value} pts`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {segments.map(seg => (
                    <span key={seg.label} className="flex items-center gap-1 text-[10px] text-text-muted">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: seg.color }} />
                        {seg.count} {seg.unit}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ── Public Profile Modal ─────────────────────────────────────────────────────────────── */
function PublicProfileModal({ member, onClose, customBadges }) {
    if (!member) return null;

    const { user, ratedCount, perfectTens, writtenReviews, pubsAdded, crawlsCreated, topPubs, totalPoints } = member;
    const displayName = user?.nickname || user?.displayName || user?.email || 'Unknown User';

    const badges = customBadges && customBadges.length > 0 ? customBadges.map(b => {
        let earned = false;
        if (b.metric === 'rated')        earned = ratedCount     >= b.threshold;
        else if (b.metric === 'reviews') earned = writtenReviews >= b.threshold;
        else if (b.metric === 'added')   earned = pubsAdded      >= b.threshold;
        else if (b.metric === 'tens')    earned = perfectTens    >= b.threshold;
        else if (b.metric === 'crawls')  earned = crawlsCreated  >= b.threshold;
        return { ...b, earned };
    }) : [
        { emoji: '🍺', title: 'First Pint',  desc: 'Rated your first pub', earned: ratedCount >= 1 },
        { emoji: '🏅', title: 'Gold Pint',   desc: 'Rated 20+ pubs',       earned: ratedCount >= 20 },
    ];

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
            style={{ background: 'var(--color-overlay)' }}
            onClick={onClose}
        >
            <div
                className="p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full relative max-h-[90vh] overflow-y-auto"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text transition border-none cursor-pointer"
                    style={{ background: 'var(--color-surface-offset)' }}
                >✕</button>

                <div className="flex flex-col items-center mb-6">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover shadow-md mb-3" style={{ border: '4px solid var(--color-brand)' }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                        <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-black shadow-md mb-3" style={{ background: 'var(--color-brand)' }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h3 className="text-2xl font-black text-text text-center" style={{ fontFamily: 'var(--font-display)' }}>{displayName}</h3>
                    {user?.bio && <p className="text-sm text-text-muted mt-2 text-center italic">"{user.bio}"</p>}
                    <div
                        className="mt-4 px-4 py-2 rounded-full border"
                        style={{ background: 'var(--color-brand-subtle)', borderColor: 'var(--color-brand-border)' }}
                    >
                        <span className="font-black text-brand">{totalPoints}</span>{' '}
                        <span className="text-xs text-brand font-bold uppercase tracking-wider">Total Points</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[['Pubs Rated', ratedCount], ['Reviews', writtenReviews], ['Crawls Made', crawlsCreated]].map(([label, val]) => (
                        <div
                            key={label}
                            className="p-2 rounded-xl text-center border"
                            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
                        >
                            <p className="text-xl font-black text-text">{val}</p>
                            <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="mb-6">
                    <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 text-center">Trophy Cabinet</h4>
                    <div className="grid grid-cols-3 gap-3">
                        {badges.map((badge, idx) => (
                            <div
                                key={idx}
                                title={badge.desc}
                                className="flex flex-col items-center p-2 rounded-xl border text-center transition-all"
                                style={badge.earned ? {
                                    background: 'var(--color-brand-subtle)',
                                    borderColor: 'var(--color-brand-border)',
                                    boxShadow: 'var(--shadow-warm-sm)',
                                } : {
                                    background: 'var(--color-surface-2)',
                                    borderColor: 'var(--color-border)',
                                    opacity: 0.5,
                                    filter: 'grayscale(1)',
                                }}
                            >
                                <span className="text-2xl mb-1">{badge.emoji}</span>
                                <span
                                    className="text-[9px] font-black uppercase tracking-wider leading-tight"
                                    style={{ color: badge.earned ? 'var(--color-brand)' : 'var(--color-text-muted)' }}
                                >{badge.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {topPubs && topPubs.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 text-center">Personal Top 3 Pubs</h4>
                        <div className="space-y-2">
                            {topPubs.map((tp, idx) => (
                                <div
                                    key={tp.pubId}
                                    className="flex justify-between items-center p-3 rounded-lg border"
                                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <span className="text-lg font-black text-text-muted">#{idx + 1}</span>
                                        <span className="font-bold text-text truncate">{tp.pub?.name || 'Unknown Pub'}</span>
                                    </div>
                                    <span
                                        className="font-black text-brand text-sm px-2 py-1 rounded border flex-shrink-0"
                                        style={{ background: 'var(--color-brand-subtle)', borderColor: 'var(--color-brand-border)' }}
                                    >{tp.avg.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LeaderboardPage({ scores, users, pubs, criteria, db, groupId }) {
    const [activeTab, setActiveTab] = useState('pubs');
    const [selectedUserForProfile, setSelectedUserForProfile] = useState(null);
    const [gamification, setGamification] = useState({ pointsPerPub: 5, pointsPerReview: 2, pointsPerAdd: 3, pointsPerCrawl: 5, badges: [] });
    const [crawlsList, setCrawlsList] = useState([]);

    const safePubs     = pubs     || [];
    const safeScores   = scores   || {};
    const safeUsers    = Array.isArray(users)
        ? Object.fromEntries(users.map(u => [u.uid || u.id, u]))
        : (users || {});
    const safeCriteria = criteria || [];

    useEffect(() => {
        if (!db) return;
        db.collection('global').doc('gamification').get()
            .then(doc => { if (doc.exists && doc.data()) setGamification(prev => ({ ...prev, ...doc.data() })); })
            .catch(e => console.error('Error fetching gamification:', e));
    }, [db]);

    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db.collection('crawls').where('groupId', '==', groupId)
            .onSnapshot(snap => setCrawlsList(snap.docs.map(d => d.data())));
        return () => unsub();
    }, [db, groupId]);

    const rankedPubs = useMemo(() => {
        const enriched = safePubs.map(pub => {
            let totalScore = 0, count = 0;
            safeCriteria.filter(c => c.type === 'scale').forEach(c => {
                (safeScores[pub.id]?.[c.id] || []).forEach(s => {
                    if (s.value != null && !isNaN(s.value)) { totalScore += s.value; count++; }
                });
            });
            return { ...pub, avgScore: count > 0 ? totalScore / count : 0, ratingCount: count };
        });
        return enriched.filter(p => p.ratingCount > 0).sort((a, b) => b.avgScore - a.avgScore);
    }, [safePubs, safeScores, safeCriteria]);

    const rankedMembers = useMemo(() => {
        const stats = {};
        Object.keys(safeUsers).forEach(uid => {
            stats[uid] = { uid, user: safeUsers[uid], pubsRated: new Set(), perfectTens: 0, writtenReviews: 0, pubsAdded: 0, crawlsCreated: 0, personalPubScores: {} };
        });
        crawlsList.forEach(c => { if (c.createdBy && stats[c.createdBy]) stats[c.createdBy].crawlsCreated++; });
        safePubs.forEach(pub => { if (pub.addedBy && stats[pub.addedBy]) stats[pub.addedBy].pubsAdded++; });
        Object.entries(safeScores).forEach(([pubId, pubCriteria]) => {
            Object.entries(pubCriteria || {}).forEach(([, critScores]) => {
                (critScores || []).forEach(s => {
                    if (!stats[s.userId]) return;
                    const st = stats[s.userId];
                    st.pubsRated.add(pubId);
                    if (s.type === 'scale') {
                        if (s.value === 10) st.perfectTens++;
                        if (!st.personalPubScores[pubId]) st.personalPubScores[pubId] = { total: 0, count: 0 };
                        st.personalPubScores[pubId].total += s.value;
                        st.personalPubScores[pubId].count++;
                    }
                    if (s.type === 'text' && s.value?.toString().trim().length > 0) st.writtenReviews++;
                });
            });
        });
        return Object.values(stats).map(st => {
            const topPubs = Object.entries(st.personalPubScores)
                .map(([pId, data]) => ({ pubId: pId, avg: data.total / data.count }))
                .sort((a, b) => b.avg - a.avg).slice(0, 3)
                .map(tp => ({ ...tp, pub: safePubs.find(p => p.id === tp.pubId) }));
            const ratedCount = st.pubsRated.size;
            const totalPoints =
                (ratedCount          * (gamification.pointsPerPub    || 5)) +
                (st.writtenReviews   * (gamification.pointsPerReview || 2)) +
                (st.pubsAdded        * (gamification.pointsPerAdd    || 3)) +
                (st.crawlsCreated    * (gamification.pointsPerCrawl  || 5));
            return { ...st, ratedCount, topPubs, totalPoints };
        }).filter(st => st.totalPoints > 0).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [safeScores, safePubs, safeUsers, gamification, crawlsList]);

    return (
        <div className="space-y-6 animate-fadeIn relative">
            {selectedUserForProfile && (
                <PublicProfileModal
                    member={selectedUserForProfile}
                    onClose={() => setSelectedUserForProfile(null)}
                    customBadges={gamification.badges}
                />
            )}

            {/* page heading */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
                <div>
                    <h2
                        className="text-3xl font-black leading-tight"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                    >Leaderboards</h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>See the top pints, and the top pintmen.</p>
                </div>
            </div>

            {/* tab switcher */}
            <div
                className="flex p-1 rounded-xl max-w-md mx-auto"
                style={{ background: 'var(--color-surface-offset)', boxShadow: 'inset 0 1px 3px rgb(0 0 0 / 0.08)' }}
            >
                {[['pubs', '🍺 Top Pubs'], ['members', '🏆 Top Members']].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className="flex-1 py-2 text-sm font-black rounded-lg transition-all border-none cursor-pointer"
                        style={activeTab === key ? {
                            background: 'var(--color-surface)',
                            color: 'var(--color-brand)',
                            boxShadow: 'var(--shadow-warm-sm)',
                        } : {
                            background: 'transparent',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── PUBS TAB ── */}
            {activeTab === 'pubs' && (
                <div
                    className="rounded-2xl overflow-hidden animate-fadeIn"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-warm-md)',
                    }}
                >
                    {/* hero banner */}
                    <div
                        className="p-6 text-white text-center"
                        style={{ background: 'linear-gradient(135deg, var(--color-brand-dark, var(--color-brand)), var(--color-brand))' }}
                    >
                        <h3 className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)' }}>🏆 Hall of Fame</h3>
                        <p className="text-sm font-medium opacity-90">The absolute best pubs, ranked by average score.</p>
                    </div>

                    {rankedPubs.length === 0 ? (
                        <div className="text-center py-12 text-text-muted font-medium">No pubs have been rated yet. Start drinking!</div>
                    ) : (
                        <>
                            <PubPodium pubs={rankedPubs.slice(0, 3)} />
                            <CategoryChampions rankedPubs={rankedPubs} safeScores={safeScores} safeCriteria={safeCriteria} />

                            {rankedPubs.length > 3 && (
                                <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
                                    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">The Rest</span>
                                    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                                </div>
                            )}

                            <div className="p-2 sm:p-4 space-y-3 pt-0">
                                {rankedPubs.slice(3).map((pub, index) => (
                                    <div
                                        key={pub.id}
                                        className="flex items-center p-4 rounded-xl shadow-sm transition-transform hover:-translate-y-0.5"
                                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                                    >
                                        <div className="w-10 flex-shrink-0 text-center font-black text-base text-text-muted">#{index + 4}</div>
                                        {pub.photoURL ? (
                                            <img src={pub.photoURL} alt={pub.name} className="w-10 h-10 rounded-full object-cover ml-2 mr-3 shadow-sm" style={{ border: '2px solid var(--color-surface)' }} loading="lazy" width="40" height="40" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg ml-2 mr-3 shadow-sm" style={{ background: 'var(--color-surface-offset)' }}>🍺</div>
                                        )}
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="text-base font-bold text-text truncate leading-tight mb-0.5">{pub.name}</h4>
                                            <p className="text-xs text-text-muted truncate">{pub.location || 'Unknown'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="block text-xl font-black text-brand">{pub.avgScore.toFixed(1)}</span>
                                            <span className="block text-[10px] text-text-muted font-bold uppercase tracking-wider">{pub.ratingCount} Ratings</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── MEMBERS TAB ── */}
            {activeTab === 'members' && (
                <div
                    className="rounded-2xl overflow-hidden animate-fadeIn"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-warm-md)',
                    }}
                >
                    {/* hero banner */}
                    <div
                        className="p-6 text-white text-center"
                        style={{ background: 'linear-gradient(135deg, var(--color-brand-dark, var(--color-brand)), var(--color-brand))' }}
                    >
                        <h3 className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)' }}>🍻 Top Crawlers</h3>
                        <p className="text-sm font-medium opacity-90">Ranked by pubs visited, reviews written, and contributions.</p>
                    </div>

                    {rankedMembers.length === 0 ? (
                        <div className="text-center py-12 text-text-muted font-medium">No active members yet. Invite some friends!</div>
                    ) : (
                        <>
                            <MemberPodium members={rankedMembers.slice(0, 3)} onSelect={setSelectedUserForProfile} />

                            {rankedMembers.length > 3 && (
                                <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
                                    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">The Rest</span>
                                    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                                </div>
                            )}

                            <div className="p-2 sm:p-4 space-y-3 pt-0">
                                {rankedMembers.slice(3).map((member, index) => {
                                    const { user, totalPoints, ratedCount, writtenReviews, pubsAdded, crawlsCreated } = member;
                                    const displayName = user?.nickname || user?.displayName || user?.email || 'Unknown User';
                                    return (
                                        <div
                                            key={member.uid}
                                            onClick={() => setSelectedUserForProfile(member)}
                                            className="flex items-start p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer gap-3"
                                            style={{
                                                background: 'var(--color-surface-2)',
                                                border: '1px solid var(--color-border)',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-brand-border)'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                        >
                                            <div className="w-8 flex-shrink-0 text-center font-black text-base text-text-muted mt-1">#{index + 4}</div>
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid var(--color-surface)' }} loading="lazy" width="40" height="40" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black flex-shrink-0" style={{ background: 'var(--color-brand)' }}>
                                                    {displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="text-base font-bold text-text truncate">{displayName}</h4>
                                                    <span className="text-lg font-black text-brand ml-3 flex-shrink-0">{totalPoints} <span className="text-[10px] font-bold text-text-faint">pts</span></span>
                                                </div>
                                                <PointsBreakdown
                                                    ratedCount={ratedCount}
                                                    writtenReviews={writtenReviews}
                                                    pubsAdded={pubsAdded}
                                                    crawlsCreated={crawlsCreated}
                                                    gamification={gamification}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
