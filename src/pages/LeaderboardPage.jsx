import React, { useState, useMemo, useEffect } from 'react';

function PublicProfileModal({ member, onClose, customBadges }) {
    if (!member) return null;

    const { user, ratedCount, perfectTens, writtenReviews, pubsAdded, crawlsCreated, topPubs, totalPoints } = member;
    const displayName = user?.nickname || user?.displayName || user?.email || "Unknown User";

    const badges = customBadges && customBadges.length > 0 ? customBadges.map(b => {
        let earned = false;
        if (b.metric === 'rated') earned = ratedCount >= b.threshold;
        else if (b.metric === 'reviews') earned = writtenReviews >= b.threshold;
        else if (b.metric === 'added') earned = pubsAdded >= b.threshold;
        else if (b.metric === 'tens') earned = perfectTens >= b.threshold;
        else if (b.metric === 'crawls') earned = crawlsCreated >= b.threshold;
        return { ...b, earned };
    }) : [
        { emoji: '🍻', title: 'First Pint', desc: 'Rated your first pub', earned: ratedCount >= 1 },
        { emoji: '🥇', title: 'Gold Pint', desc: 'Rated 20+ pubs', earned: ratedCount >= 20 }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition">✕</button>

                <div className="flex flex-col items-center mb-6">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover shadow-md border-4 border-brand mb-3" onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-brand flex items-center justify-center text-white text-4xl font-black shadow-md mb-3">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white text-center">{displayName}</h3>
                    {user?.bio && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center italic">"{user.bio}"</p>}
                    
                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-900/50">
                        <span className="font-black text-blue-700 dark:text-blue-400">{totalPoints}</span> <span className="text-xs text-blue-600 dark:text-blue-500 font-bold uppercase tracking-wider">Total Points</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-100 dark:border-gray-600 text-center">
                        <p className="text-xl font-black text-gray-800 dark:text-white">{ratedCount}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Pubs Rated</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-100 dark:border-gray-600 text-center">
                        <p className="text-xl font-black text-gray-800 dark:text-white">{writtenReviews}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Reviews</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-100 dark:border-gray-600 text-center">
                        <p className="text-xl font-black text-gray-800 dark:text-white">{crawlsCreated}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Crawls Made</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 text-center">Trophy Cabinet</h4>
                    <div className="grid grid-cols-3 gap-3">
                        {badges.map((badge, idx) => (
                            <div key={idx} className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${badge.earned ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 dark:from-yellow-900/20 dark:to-amber-900/10 dark:border-yellow-700/50 shadow-sm' : 'bg-gray-50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700 opacity-50 grayscale'}`} title={badge.desc}>
                                <span className="text-2xl mb-1 filter drop-shadow-sm">{badge.emoji}</span>
                                <span className={`text-[9px] font-black uppercase tracking-wider leading-tight ${badge.earned ? 'text-yellow-800 dark:text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`}>{badge.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {topPubs.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 text-center">Personal Top 3 Pubs</h4>
                        <div className="space-y-2">
                            {topPubs.map((tp, idx) => (
                                <div key={tp.pubId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                    <div className="flex items-center gap-3 truncate">
                                        <span className="text-lg font-black text-gray-400">#{idx + 1}</span>
                                        <span className="font-bold text-gray-800 dark:text-white truncate">{tp.pub?.name || 'Unknown Pub'}</span>
                                    </div>
                                    <span className="font-black text-brand bg-brand/10 px-2 py-1 rounded text-sm">{tp.avg.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LeaderboardPage({ scores, allUsers, pubs, criteria, db, groupId }) {
    const [activeTab, setActiveTab] = useState('pubs'); 
    const [selectedUserForProfile, setSelectedUserForProfile] = useState(null);
    
    const [gamification, setGamification] = useState({ pointsPerPub: 5, pointsPerReview: 2, pointsPerAdd: 3, pointsPerCrawl: 5, badges: [] });
    const [crawlsList, setCrawlsList] = useState([]);

    useEffect(() => {
        if (!db) return;
        db.collection('global').doc('gamification').get().then(doc => {
            if (doc.exists && doc.data()) {
                setGamification(prev => ({ ...prev, ...doc.data() }));
            }
        }).catch(e => console.error("Error fetching gamification:", e));
    }, [db]);

    // --- FETCH MAP CRAWLS ---
    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db.collection('crawls').where('groupId', '==', groupId).onSnapshot(snap => {
            setCrawlsList(snap.docs.map(doc => doc.data()));
        });
        return () => unsub();
    }, [db, groupId]);

    const rankedPubs = useMemo(() => {
        const enriched = pubs.map(pub => {
            let totalScore = 0; let count = 0;
            criteria.filter(c => c.type === 'scale').forEach(c => {
                const cScores = scores[pub.id]?.[c.id] || [];
                cScores.forEach(s => { if (s.value != null && !isNaN(s.value)) { totalScore += s.value; count++; } });
            });
            return { ...pub, avgScore: count > 0 ? (totalScore / count) : 0, ratingCount: count };
        });
        return enriched.filter(p => p.ratingCount > 0).sort((a, b) => b.avgScore - a.avgScore);
    }, [pubs, scores, criteria]);

    const rankedMembers = useMemo(() => {
        const stats = {};
        
        Object.keys(allUsers).forEach(uid => {
            stats[uid] = { uid, user: allUsers[uid], pubsRated: new Set(), perfectTens: 0, writtenReviews: 0, pubsAdded: 0, crawlsCreated: 0, personalPubScores: {} };
        });

        // Tally Map Crawls
        crawlsList.forEach(c => {
            if (c.createdBy && stats[c.createdBy]) stats[c.createdBy].crawlsCreated++;
        });

        pubs.forEach(pub => {
            if (pub.addedBy && stats[pub.addedBy]) stats[pub.addedBy].pubsAdded++;
        });

        Object.entries(scores).forEach(([pubId, pubCriteria]) => {
            Object.entries(pubCriteria).forEach(([critId, critScores]) => {
                critScores.forEach(s => {
                    if (!stats[s.userId]) return; 
                    const st = stats[s.userId];
                    st.pubsRated.add(pubId);

                    if (s.type === 'scale') {
                        if (s.value === 10) st.perfectTens++;
                        if (!st.personalPubScores[pubId]) st.personalPubScores[pubId] = { total: 0, count: 0 };
                        st.personalPubScores[pubId].total += s.value;
                        st.personalPubScores[pubId].count++;
                    }
                    if (s.type === 'text' && s.value && s.value.toString().trim().length > 0) {
                        st.writtenReviews++;
                    }
                });
            });
        });

        return Object.values(stats).map(st => {
            const topPubs = Object.entries(st.personalPubScores).map(([pId, data]) => {
                return { pubId: pId, avg: data.total / data.count };
            }).sort((a, b) => b.avg - a.avg).slice(0, 3).map(tp => {
                const pubData = pubs.find(p => p.id === tp.pubId);
                return { ...tp, pub: pubData };
            });

            const ratedCount = st.pubsRated.size;
            
            // CALCULATE TOTAL POINTS INCL CRAWLS
            const totalPoints = (ratedCount * (gamification.pointsPerPub || 5)) + 
                                (st.writtenReviews * (gamification.pointsPerReview || 2)) + 
                                (st.pubsAdded * (gamification.pointsPerAdd || 3)) +
                                (st.crawlsCreated * (gamification.pointsPerCrawl || 5));

            return { ...st, ratedCount, topPubs, totalPoints };
        }).filter(st => st.totalPoints > 0).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [scores, pubs, allUsers, gamification, crawlsList]); 

    return (
        <div className="space-y-6 animate-fadeIn relative">
            {selectedUserForProfile && (
                <PublicProfileModal member={selectedUserForProfile} onClose={() => setSelectedUserForProfile(null)} customBadges={gamification.badges} />
            )}

            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white transition-colors">Leaderboards</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">See the top pints, and the top pintmen.</p>
                </div>
            </div>

            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl max-w-md mx-auto shadow-inner">
                <button onClick={() => setActiveTab('pubs')} className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${activeTab === 'pubs' ? 'bg-white dark:bg-gray-800 text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    🏆 Top Pubs
                </button>
                <button onClick={() => setActiveTab('members')} className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${activeTab === 'members' ? 'bg-white dark:bg-gray-800 text-brand shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    🍻 Top Members
                </button>
            </div>

            {activeTab === 'pubs' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn">
                    <div className="bg-gradient-to-r from-brand to-purple-600 p-6 text-white text-center">
                        <span className="text-5xl drop-shadow-lg mb-2 block">🏆</span>
                        <h3 className="text-2xl font-black">Hall of Fame</h3>
                        <p className="text-sm font-medium opacity-90">The absolute best pubs, ranked by average score.</p>
                    </div>
                    
                    <div className="p-2 sm:p-4">
                        {rankedPubs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 font-medium">No pubs have been rated yet. Start drinking!</div>
                        ) : (
                            <div className="space-y-3">
                                {rankedPubs.map((pub, index) => {
                                    let medal = ""; let bgColor = "bg-gray-50 dark:bg-gray-700/50"; let borderColor = "border-gray-100 dark:border-gray-600";
                                    if (index === 0) { medal = "🥇"; bgColor = "bg-yellow-50 dark:bg-yellow-900/10"; borderColor = "border-yellow-200 dark:border-yellow-800/50"; }
                                    else if (index === 1) { medal = "🥈"; bgColor = "bg-gray-100 dark:bg-gray-600/30"; borderColor = "border-gray-300 dark:border-gray-500"; }
                                    else if (index === 2) { medal = "🥉"; bgColor = "bg-orange-50 dark:bg-orange-900/10"; borderColor = "border-orange-200 dark:border-orange-800/50"; }
                                    
                                    return (
                                        <div key={pub.id} className={`flex items-center p-4 rounded-xl border ${bgColor} ${borderColor} shadow-sm transition-transform hover:-translate-y-0.5`}>
                                            <div className="w-12 flex-shrink-0 text-center font-black text-2xl text-gray-400 dark:text-gray-500">
                                                {medal || `#${index + 1}`}
                                            </div>
                                            {pub.photoURL ? (
                                                <img src={pub.photoURL} alt={pub.name} className="w-12 h-12 rounded-full object-cover ml-2 mr-4 shadow-sm border-2 border-white dark:border-gray-700" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xl ml-2 mr-4 shadow-sm">🍺</div>
                                            )}
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h4 className="text-lg font-bold text-gray-800 dark:text-white truncate leading-tight mb-0.5">{pub.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.location || 'Unknown'}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <span className="block text-2xl font-black text-brand drop-shadow-sm">{pub.avgScore.toFixed(1)}</span>
                                                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">{pub.ratingCount} Ratings</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'members' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn">
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white text-center">
                        <span className="text-5xl drop-shadow-lg mb-2 block">🍻</span>
                        <h3 className="text-2xl font-black">The Top Crawlers</h3>
                        <p className="text-sm font-medium opacity-90">Ranked by pubs visited, reviews written, and contributions.</p>
                    </div>
                    
                    <div className="p-2 sm:p-4">
                        {rankedMembers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 font-medium">No active members yet. Invite some friends!</div>
                        ) : (
                            <div className="space-y-3">
                                {rankedMembers.map((member, index) => {
                                    const { user, totalPoints, ratedCount, writtenReviews, crawlsCreated } = member;
                                    const displayName = user?.nickname || user?.displayName || user?.email || "Unknown User";
                                    let medal = ""; 
                                    if (index === 0) medal = "👑";
                                    else if (index === 1) medal = "🥈";
                                    else if (index === 2) medal = "🥉";
                                    
                                    return (
                                        <div 
                                            key={member.uid} 
                                            onClick={() => setSelectedUserForProfile(member)}
                                            className="flex flex-col sm:flex-row sm:items-center p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition cursor-pointer"
                                        >
                                            <div className="flex items-center flex-1 min-w-0 mb-3 sm:mb-0">
                                                <div className="w-8 flex-shrink-0 text-center font-black text-xl text-gray-400 dark:text-gray-500 mr-2">
                                                    {medal || `#${index + 1}`}
                                                </div>
                                                {user?.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt={displayName} className="w-12 h-12 rounded-full object-cover mr-4 shadow-sm border-2 border-white dark:border-gray-600" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl mr-4 shadow-sm">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white truncate leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">{displayName}</h4>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                                        {ratedCount} Visited • {writtenReviews} Reviews • {crawlsCreated} Crawls
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end sm:w-auto w-full border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-600 pt-3 sm:pt-0 sm:pl-4">
                                                <span className="text-xs text-gray-500 sm:hidden uppercase font-bold tracking-wider">Score</span>
                                                <div className="text-right">
                                                    <span className="block text-2xl font-black text-blue-600 dark:text-blue-400 drop-shadow-sm leading-none">{totalPoints}</span>
                                                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Points</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}