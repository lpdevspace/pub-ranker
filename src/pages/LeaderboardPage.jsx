import React, { useState, useMemo, useEffect } from 'react';

/* ── Category Champions ─────────────────────────────────────────── */
function CategoryChampions({ rankedPubs, safeScores, safeCriteria }) {
    if (rankedPubs.length === 0) return null;

    const mostVisited = [...rankedPubs].sort((a, b) => b.ratingCount - a.ratingCount)[0];

    const perfectScores = {};
    rankedPubs.forEach(pub => {
        let tens = 0;
        safeCriteria.filter(c => c.type === 'scale').forEach(c => {
            (safeScores[pub.id]?.[c.id] || []).forEach(s => {
                if (s.value === 10) tens++;
            });
        });
        perfectScores[pub.id] = tens;
    });
    const mostPerfect = [...rankedPubs].sort((a, b) => (perfectScores[b.id] || 0) - (perfectScores[a.id] || 0))[0];

    const consistency = {};
    rankedPubs.forEach(pub => {
        const allVals = [];
        safeCriteria.filter(c => c.type === 'scale').forEach(c => {
            (safeScores[pub.id]?.[c.id] || []).forEach(s => {
                if (s.value != null && !isNaN(s.value)) allVals.push(s.value);
            });
        });
        if (allVals.length >= 3) {
            const mean = allVals.reduce((a, b) => a + b, 0) / allVals.length;
            const std = Math.sqrt(allVals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allVals.length);
            consistency[pub.id] = std;
        }
    });
    const consistentPubs = rankedPubs.filter(p => consistency[p.id] !== undefined);
    const mostConsistent = consistentPubs.length > 0 ? consistentPubs.sort((a, b) => consistency[a.id] - consistency[b.id])[0] : null;

    const hiddenGem = rankedPubs.filter(p => p.avgScore >= 7 && p.ratingCount <= 3).length > 0
        ? rankedPubs.filter(p => p.avgScore >= 7).sort((a, b) => a.ratingCount - b.ratingCount)[0] : null;

    const champions = [
        { key: 'top', emoji: '🏆', title: 'Top Rated', desc: 'Highest average', pub: rankedPubs[0], stat: rankedPubs[0]?.avgScore.toFixed(1), statLabel: 'avg' },
        { key: 'visited', emoji: '👣', title: 'Most Visited', desc: 'Most ratings', pub: mostVisited, stat: mostVisited?.ratingCount, statLabel: 'ratings' },
        { key: 'perfect', emoji: '💯', title: 'Perfection', desc: 'Most 10s', pub: mostPerfect, stat: perfectScores[mostPerfect?.id] || 0, statLabel: 'tens' },
        mostConsistent && { key: 'consistent', emoji: '🎯', title: 'Consistent', desc: 'Lowest variance', pub: mostConsistent, stat: consistency[mostConsistent?.id]?.toFixed(1), statLabel: 'var' },
        hiddenGem && { key: 'gem', emoji: '💎', title: 'Hidden Gem', desc: 'High score, low traffic', pub: hiddenGem, stat: hiddenGem?.avgScore.toFixed(1), statLabel: 'avg' },
    ].filter(Boolean);

    return (
        <div className="mb-8">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 border-b border-divider pb-2">Category Champions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {champions.map(champ => (
                    <div key={champ.key} className="bg-surface-offset rounded-xl p-5 flex flex-col items-center text-center border border-border shadow-inner">
                        <div className="relative mb-3">
                            <img src={champ.pub?.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo'} alt={champ.pub?.name || 'Placeholder'} className="w-14 h-14 rounded-full object-cover shadow-sm" />
                            <span className="absolute -bottom-1 -right-1 text-xl">{champ.emoji}</span>
                        </div>
                        <p className="font-body text-[10px] font-bold text-muted uppercase tracking-wider mb-1">{champ.title}</p>
                        <p className="font-display text-sm font-bold text-text line-clamp-1 mb-2 w-full">{champ.pub?.name || '—'}</p>
                        <p className="font-display text-lg font-black text-brand tabular-nums leading-none">{champ.stat}<span className="font-body text-[9px] font-bold text-text-faint ml-1">{champ.statLabel}</span></p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Podiums ─────────────────────────────────────────────────── */
function Podium({ items, type, onSelect }) {
    if (items.length === 0) return null;
    const order = [items[1], items[0], items[2]].filter(Boolean);
    const cfg = {
        0: { h: 'h-24', label: '2ND', emoji: '🥈' },
        1: { h: 'h-32', label: '1ST', emoji: '👑' },
        2: { h: 'h-16', label: '3RD', emoji: '🥉' }
    };
    const slotIdx = [items[1] ? 0 : null, 1, items[2] ? 2 : null];

    return (
        <div className="flex items-end justify-center gap-2 sm:gap-4 pt-6 pb-4 border-b border-divider mb-6">
            {order.map((item, idx) => {
                const slot = slotIdx[idx];
                if (slot === null || !item) return null;
                const config = cfg[slot];
                
                const isMember = type === 'members';
                const name = isMember ? (item.user?.nickname || item.user?.displayName || 'Unknown') : item.name;
                const img = isMember ? item.user?.avatarUrl : item.photoURL;
                const stat = isMember ? item.totalPoints : item.avgScore.toFixed(1);
                const statLabel = isMember ? 'pts' : 'avg';

                return (
                    <div 
                        key={item.id || item.uid} 
                        className={`flex flex-col items-center flex-1 max-w-[120px] ${isMember ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        onClick={() => isMember && onSelect && onSelect(item)}
                    >
                        {slot === 1 && <span className="text-2xl mb-2 animate-bounce">👑</span>}
                        <div className="mb-3">
                                <img src={img || (!isMember ? 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo' : 'https://placehold.co/100x100/1e293b/ffffff?text=' + name.charAt(0).toUpperCase())} alt={name} className="w-14 h-14 rounded-full object-cover shadow-sm" />
                        </div>
                        <p className="text-xs font-bold text-text text-center line-clamp-1 w-full px-1 mb-1">{name}</p>
                        <p className="text-sm font-black text-brand mb-3">{stat}<span className="text-[9px] font-bold text-text-faint ml-0.5">{statLabel}</span></p>
                        
                        <div className={`w-full ${config.h} bg-surface-offset border-t-2 ${slot === 1 ? 'border-brand' : 'border-divider'} rounded-t-md flex flex-col items-center justify-start pt-3 gap-1`}>
                            <span className="text-[10px] font-black text-muted uppercase tracking-wider">{config.label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Points Breakdown Bar ───────────────────────────────────────── */
function PointsBreakdown({ ratedCount, writtenReviews, pubsAdded, crawlsCreated, gamification }) {
    const ppp = gamification?.pointsPerPub || 5;
    const ppr = gamification?.pointsPerReview || 2;
    const ppa = gamification?.pointsPerAdd || 3;
    const ppc = gamification?.pointsPerCrawl || 5;

    const segments = [
        { label: 'Pubs visited', value: ratedCount * ppp, color: 'bg-brand' },
        { label: 'Reviews', value: writtenReviews * ppr, color: 'bg-indigo-500' },
        { label: 'Pubs added', value: pubsAdded * ppa, color: 'bg-emerald-500' },
        { label: 'Crawls made', value: crawlsCreated * ppc, color: 'bg-purple-500' },
    ].filter(s => s.value > 0);

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return null;

    return (
        <div className="w-full">
            <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
                {segments.map(seg => <div key={seg.label} className={seg.color} style={{ width: `${(seg.value / total) * 100}%` }} title={`${seg.label}: ${seg.value} pts`} />)}
            </div>
        </div>
    );
}

/* ── Public Profile Modal ───────────────────────────────────────── */
function PublicProfileModal({ member, onClose, gamification }) {
    if (!member) return null;

    const { user, ratedCount, writtenReviews, pubsAdded, crawlsCreated, topPubs, totalPoints } = member;
    const displayName = user?.nickname || user?.displayName || user?.email || 'Unknown User';

    const badges = [
        { emoji: '🍺', title: 'First Pint', earned: ratedCount >= 1 },
        { emoji: '🏅', title: 'Gold Pint', earned: ratedCount >= 20 },
        { emoji: '🗣️', title: 'Critic', earned: writtenReviews >= 10 },
        { emoji: '🗺️', title: 'Explorer', earned: pubsAdded >= 5 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="card-premium p-6 md:p-8 max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text bg-transparent border-none text-xl cursor-pointer">✕</button>

                <div className="flex flex-col items-center mb-6">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover mb-3" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-surface-offset flex items-center justify-center text-3xl font-black mb-3 border border-divider">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h3 className="text-xl font-bold text-text">{displayName}</h3>
                    {user?.bio && <p className="text-xs text-muted mt-1 italic text-center">"{user.bio}"</p>}
                    
                    <div className="mt-3 bg-brand text-white px-3 py-1 rounded-full text-sm font-black">
                        {totalPoints} pts
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[['Rated', ratedCount], ['Reviews', writtenReviews], ['Crawls', crawlsCreated]].map(([label, val]) => (
                        <div key={label} className="bg-surface-offset p-2 rounded-lg text-center border border-divider">
                            <p className="text-lg font-black text-text">{val}</p>
                            <p className="text-[9px] text-muted font-bold uppercase tracking-wider">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="mb-6">
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 text-center">Trophies</h4>
                    <div className="grid grid-cols-4 gap-2">
                        {badges.map((b, i) => (
                            <div key={i} className={`flex flex-col items-center p-2 rounded-lg border text-center ${b.earned ? 'bg-surface border-brand-border' : 'bg-surface-offset border-divider opacity-40 grayscale'}`}>
                                <span className="text-lg mb-1">{b.emoji}</span>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-text line-clamp-1 w-full">{b.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {topPubs && topPubs.length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 text-center">Top 3 Pubs</h4>
                        <div className="flex flex-col gap-2">
                            {topPubs.map((tp, idx) => (
                                <div key={tp.pubId} className="flex justify-between items-center bg-surface-offset p-2 rounded-lg border border-divider">
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="text-xs font-black text-text-faint">#{idx + 1}</span>
                                        <span className="text-xs font-bold text-text truncate">{tp.pub?.name || 'Unknown'}</span>
                                    </div>
                                    <span className="text-xs font-black text-brand">{tp.avg.toFixed(1)}</span>
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
    const [gamification, setGamification] = useState({ pointsPerPub: 5, pointsPerReview: 2, pointsPerAdd: 3, pointsPerCrawl: 5 });
    const [crawlsList, setCrawlsList] = useState([]);

    const safePubs     = pubs     || [];
    const safeScores   = scores   || {};
    const safeUsers    = Array.isArray(users) ? Object.fromEntries(users.map(u => [u.uid || u.id, u])) : (users || {});
    const safeCriteria = criteria || [];

    useEffect(() => {
        if (!db) return;
        db.collection('global').doc('gamification').get()
            .then(doc => { if (doc.exists && doc.data()) setGamification(prev => ({ ...prev, ...doc.data() })); })
            .catch(e => console.error(e));
    }, [db]);

    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db.collection('crawls').where('groupId', '==', groupId).onSnapshot(snap => setCrawlsList(snap.docs.map(d => d.data())));
        return () => unsub();
    }, [db, groupId]);

    const rankedPubs = useMemo(() => {
        const enriched = safePubs.map(pub => {
            let totalScore = 0, count = 0;
            safeCriteria.filter(c => c.type === 'scale').forEach(c => {
                (safeScores[pub.id]?.[c.id] || []).forEach(s => { if (s.value != null && !isNaN(s.value)) { totalScore += s.value; count++; } });
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
                    if (s.type === 'text' && s.value?.trim()) st.writtenReviews++;
                });
            });
        });

        const ppp = gamification.pointsPerPub;
        const ppr = gamification.pointsPerReview;
        const ppa = gamification.pointsPerAdd;
        const ppc = gamification.pointsPerCrawl;

        return Object.values(stats).map(st => {
            st.ratedCount = st.pubsRated.size;
            st.totalPoints = (st.ratedCount * ppp) + (st.writtenReviews * ppr) + (st.pubsAdded * ppa) + (st.crawlsCreated * ppc);
            st.topPubs = Object.entries(st.personalPubScores)
                .map(([pid, data]) => ({ pubId: pid, avg: data.total / data.count, pub: safePubs.find(p => p.id === pid) }))
                .filter(x => x.pub).sort((a, b) => b.avg - a.avg).slice(0, 3);
            return st;
        }).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [safeUsers, safePubs, safeScores, crawlsList, gamification]);

    return (
        <div className="space-y-8 animate-fadeIn pb-24">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="relative z-10">
                    <h2 className="font-display text-3xl md:text-4xl font-bold mb-1 text-text">Leaderboards</h2>
                    <p className="font-body text-sm font-semibold text-muted">Rankings for pubs and group members.</p>
                </div>
            </div>

            <div className="flex p-1.5 bg-surface-offset rounded-xl border border-border max-w-sm shadow-inner">
                <button onClick={() => setActiveTab('pubs')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-none cursor-pointer ${activeTab === 'pubs' ? 'bg-surface text-text shadow-sm' : 'bg-transparent text-muted hover:text-text'}`}>🍺 Top Pubs</button>
                <button onClick={() => setActiveTab('members')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-none cursor-pointer ${activeTab === 'members' ? 'bg-surface text-text shadow-sm' : 'bg-transparent text-muted hover:text-text'}`}>👤 Top Members</button>
            </div>

            <div className="card-premium p-6 md:p-8">
                {activeTab === 'pubs' ? (
                    <>
                        <Podium items={rankedPubs.slice(0, 3)} type="pubs" />
                        <CategoryChampions rankedPubs={rankedPubs} safeScores={safeScores} safeCriteria={safeCriteria} />
                        
                        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">All Ranked Pubs</h3>
                        <div className="flex flex-col gap-3">
                            {rankedPubs.slice(3).map((pub, i) => (
                                <div key={pub.id} className="flex items-center gap-3 md:gap-4 p-3 bg-surface-offset rounded-lg border border-divider">
                                    <span className="text-sm font-black text-text-faint w-6 text-center">#{i + 4}</span>
                                    <img src={pub.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo'} alt={pub.name} className="w-10 h-10 rounded-lg object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-text truncate">{pub.name}</p>
                                        <p className="text-[10px] text-muted truncate">{pub.ratingCount} ratings</p>
                                    </div>
                                    <div className="text-lg font-black text-brand tabular-nums">{pub.avgScore.toFixed(1)}</div>
                                </div>
                            ))}
                            {rankedPubs.length <= 3 && <p className="text-sm text-text-faint text-center py-4">No more pubs to display.</p>}
                        </div>
                    </>
                ) : (
                    <>
                        <Podium items={rankedMembers.slice(0, 3)} type="members" onSelect={setSelectedUserForProfile} />
                        
                        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">All Members</h3>
                        <div className="flex flex-col gap-3">
                            {rankedMembers.map((member, i) => {
                                const name = member.user?.nickname || member.user?.displayName || 'Unknown';
                                return (
                                    <div key={member.uid} className="flex flex-col gap-2 p-3 bg-surface-offset rounded-lg border border-divider cursor-pointer hover:border-brand/40 transition-colors" onClick={() => setSelectedUserForProfile(member)}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-text-faint w-6 text-center">#{i + 1}</span>
                                            {member.user?.avatarUrl ? (
                                                <img src={member.user.avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-lg border border-divider">{name.charAt(0).toUpperCase()}</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-text truncate">{name}</p>
                                            </div>
                                            <div className="text-base font-black text-brand tabular-nums">{member.totalPoints} <span className="text-[9px] font-bold text-text-faint">pts</span></div>
                                        </div>
                                        <div className="pl-12 w-full">
                                            <PointsBreakdown ratedCount={member.ratedCount} writtenReviews={member.writtenReviews} pubsAdded={member.pubsAdded} crawlsCreated={member.crawlsCreated} gamification={gamification} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {selectedUserForProfile && (
                <PublicProfileModal 
                    member={selectedUserForProfile} 
                    gamification={gamification}
                    onClose={() => setSelectedUserForProfile(null)} 
                />
            )}
        </div>
    );
}
