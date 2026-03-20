import React, { useMemo, useState } from 'react';

export default function LeaderboardPage({ scores, allUsers, pubs, criteria = [] }) {
    // 1. THIS IS THE CORRECT SPOT FOR useState!
    // It must be at the top level, outside of useMemo.
    const [selectedUserId, setSelectedUserId] = useState(null);

    const { awards, dynamicAwards, userBadges } = useMemo(() => {
        const userStats = {};

        // 1. Crunch the raw data
        Object.entries(scores).forEach(([pubId, pubScores]) => {
            Object.entries(pubScores).forEach(([criterionId, criterionScores]) => {
                criterionScores.forEach((score) => {
                    if (score.value == null) return;
                    
                    if (!userStats[score.userId]) {
                        userStats[score.userId] = {
                            userId: score.userId,
                            pubsRated: new Set(),
                            totalScaleScore: 0,
                            scaleScoreCount: 0,
                            totalPriceScore: 0,
                            priceScoreCount: 0,
                            textReviewCount: 0,
                            perfectTenCount: 0,
                            highPriceCount: 0,
                            noVoteCount: 0
                        };
                    }
                    
                    userStats[score.userId].pubsRated.add(pubId);

                    if (score.type === 'scale') {
                        userStats[score.userId].totalScaleScore += score.value;
                        userStats[score.userId].scaleScoreCount++;
                        if (score.value === 10) userStats[score.userId].perfectTenCount++;
                    } else if (score.type === 'price') {
                        userStats[score.userId].totalPriceScore += score.value;
                        userStats[score.userId].priceScoreCount++;
                        if (score.value === 5) userStats[score.userId].highPriceCount++;
                    } else if (score.type === 'text' && typeof score.value === 'string' && score.value.trim().length > 0) {
                        userStats[score.userId].textReviewCount++;
                    } else if (score.type === 'yes-no' && score.value === false) {
                        userStats[score.userId].noVoteCount++;
                    }
                });
            });
        });

        const statsArray = Object.values(userStats).map(stat => {
            const pubsRatedCount = stat.pubsRated.size;
            const badges = [];
            
            if (pubsRatedCount >= 1) badges.push({ emoji: '🍻', title: 'First Pint (Rated a pub)' });
            if (pubsRatedCount >= 5) badges.push({ emoji: '🥉', title: 'Bronze Pint (Rated 5+ Pubs)' });
            if (pubsRatedCount >= 20) badges.push({ emoji: '🥇', title: 'Gold Pint (Rated 20+ Pubs)' });
            if (stat.textReviewCount > 0) badges.push({ emoji: '✍️', title: 'The Scribe (Left a written review)' });
            if (stat.perfectTenCount > 0) badges.push({ emoji: '🎯', title: 'Bullseye (Gave a 10/10 rating)' });
            if (stat.highPriceCount > 0) badges.push({ emoji: '💸', title: 'High Roller (Rated a pub 5/5 for price)' });
            if (stat.noVoteCount > 0) badges.push({ emoji: '🛑', title: 'The Veto (Voted No on a feature)' });

            return {
                ...stat,
                pubsRatedCount,
                avgScaleScore: stat.scaleScoreCount > 0 ? (stat.totalScaleScore / stat.scaleScoreCount) : null,
                avgPriceScore: stat.priceScoreCount > 0 ? (stat.totalPriceScore / stat.priceScoreCount) : null,
                badges
            };
        });

        const qualifiedUsers = statsArray.filter(s => s.pubsRatedCount >= 2);

        // 2. Base Awards
        const theRegular = [...statsArray].sort((a, b) => b.pubsRatedCount - a.pubsRatedCount)[0];
        const harshCritic = [...qualifiedUsers].filter(s => s.avgScaleScore !== null).sort((a, b) => a.avgScaleScore - b.avgScaleScore)[0];
        const easilyPleased = [...qualifiedUsers].filter(s => s.avgScaleScore !== null).sort((a, b) => b.avgScaleScore - a.avgScaleScore)[0];
        const bigSpender = [...qualifiedUsers].filter(s => s.avgPriceScore !== null).sort((a, b) => b.avgPriceScore - a.avgPriceScore)[0];

        const pubAddCounts = {};
        pubs.forEach(pub => {
            if (pub.addedBy) {
                pubAddCounts[pub.addedBy] = (pubAddCounts[pub.addedBy] || 0) + 1;
            }
        });
        const theExplorerUserId = Object.keys(pubAddCounts).sort((a, b) => pubAddCounts[b] - pubAddCounts[a])[0];
        const theExplorer = theExplorerUserId ? { userId: theExplorerUserId, addedCount: pubAddCounts[theExplorerUserId] } : null;

        // 3. NEW: DYNAMIC CRITERIA AWARDS!
        const generatedAwards = criteria.filter(c => c.type === 'scale' || c.type === 'price').map(crit => {
            const userAverages = statsArray.map(stat => {
                let total = 0, count = 0;
                Object.entries(scores).forEach(([pubId, pubScores]) => {
                    const critScores = pubScores[crit.id] || [];
                    const userScore = critScores.find(s => s.userId === stat.userId);
                    if (userScore && userScore.value != null && !isNaN(userScore.value)) {
                        total += userScore.value;
                        count++;
                    }
                });
                return { userId: stat.userId, avg: count > 0 ? total/count : null };
            }).filter(u => u.avg !== null);

            if (userAverages.length === 0) return null;

            userAverages.sort((a, b) => b.avg - a.avg); // Sort highest to lowest
            const winner = userAverages[0];

            return {
                id: crit.id,
                title: `${crit.name} Fanatic`,
                emoji: '✨',
                description: `Highest average score for ${crit.name}`,
                winner: { userId: winner.userId },
                statLabel: "Avg Score",
                statValue: winner.avg.toFixed(1)
            };
        }).filter(Boolean);

        return {
            awards: { theRegular, harshCritic, easilyPleased, bigSpender, theExplorer },
            dynamicAwards: generatedAwards,
            userBadges: statsArray.sort((a, b) => b.badges.length - a.badges.length)
        };
    }, [scores, pubs, criteria]);

    const getUserDetails = (userId) => {
        const u = allUsers[userId];
        if (!u) return { name: "Unknown User", avatar: "" };
        return { name: u.nickname || u.displayName || u.email || "Unknown User", avatar: u.avatarUrl || "" };
    };

    const AwardCard = ({ title, emoji, description, winner, statLabel, statValue }) => {
        if (!winner) {
            return (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-t-4 border-gray-300 dark:border-gray-600 flex flex-col items-center text-center opacity-60 transition-colors duration-300">
                    <div className="text-4xl mb-2">{emoji}</div>
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Not enough data yet.</p>
                </div>
            );
        }

        const user = getUserDetails(winner.userId);

        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-t-4 border-blue-500 flex flex-col items-center text-center hover:shadow-lg transition transform hover:-translate-y-1 duration-300">
                <div className="text-4xl mb-2">{emoji}</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{description}</p>
                
                {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 dark:border-blue-700 mb-3" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl mb-3 border-2 border-blue-200 dark:border-blue-700">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
                
                <h4 className="font-bold text-lg text-blue-700 dark:text-blue-400">{user.name}</h4>
                <div className="mt-3 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 mr-2">{statLabel}:</span>
                    <span className="text-md font-bold text-blue-800 dark:text-blue-300">{statValue}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* SECTION 1: THE HALL OF FAME */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">The Hall of Fame</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Updates live as you rate pubs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AwardCard title="The Regular" emoji="🍻" description="Most unique pubs rated" winner={awards.theRegular} statLabel="Pubs Visited" statValue={awards.theRegular?.pubsRatedCount} />
                    <AwardCard title="The Easily Pleased" emoji="🤩" description="Highest average score given" winner={awards.easilyPleased} statLabel="Avg Score" statValue={awards.easilyPleased?.avgScaleScore?.toFixed(1) + "/10"} />
                    <AwardCard title="The Harsh Critic" emoji="🧐" description="Lowest average score given" winner={awards.harshCritic} statLabel="Avg Score" statValue={awards.harshCritic?.avgScaleScore?.toFixed(1) + "/10"} />
                    <AwardCard title="The Big Spender" emoji="💸" description="Consistently rates expensive pubs" winner={awards.bigSpender} statLabel="Avg Price Rating" statValue={awards.bigSpender?.avgPriceScore?.toFixed(1) + "/5"} />
                </div>
            </div>

            {/* SECTION 2: CATEGORY LEADERS (DYNAMIC AWARDS) */}
            {dynamicAwards.length > 0 && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 transition-colors">Category Fanatics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {dynamicAwards.map((award) => (
                            <AwardCard 
                                key={award.id} 
                                title={award.title} 
                                emoji={award.emoji} 
                                description={award.description} 
                                winner={award.winner} 
                                statLabel={award.statLabel} 
                                statValue={award.statValue} 
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 3: THE TROPHY CABINET */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 transition-colors">Trophy Cabinet</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Click on a user to view their stats!</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userBadges.map((userStat) => {
                        const user = getUserDetails(userStat.userId);
                        return (
                            <button 
                                key={userStat.userId} 
                                onClick={() => setSelectedUserId(userStat.userId)}
                                className="w-full text-left bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                            >
                                {/* 2. THIS IS THE MISSING CONTENT WE ADDED BACK! */}
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg flex-shrink-0">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-800 dark:text-white truncate">{user.name}</h4>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {userStat.badges.length > 0 ? (
                                            userStat.badges.map((badge, idx) => (
                                                <span key={idx} title={badge.title} className="text-xl">
                                                    {badge.emoji}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">No badges yet</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- NEW: USER PROFILE MODAL --- */}
            {selectedUserId && (() => {
                const user = getUserDetails(selectedUserId);
                const stat = userBadges.find(s => s.userId === selectedUserId);
                
                // Find their favorite pub (highest scale score)
                let favoritePub = { name: "Hasn't rated enough", score: 0 };
                Object.entries(scores).forEach(([pubId, pubScores]) => {
                    let total = 0, count = 0;
                    Object.values(pubScores).forEach(critScores => {
                        const userScore = critScores.find(s => s.userId === selectedUserId && s.type === 'scale');
                        if (userScore && userScore.value != null) { total += userScore.value; count++; }
                    });
                    if (count > 0) {
                        const avg = total / count;
                        if (avg > favoritePub.score) {
                            favoritePub = { name: pubs.find(p => p.id === pubId)?.name || "Unknown Pub", score: avg };
                        }
                    }
                });

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative border border-gray-200 dark:border-gray-700">
                            {/* Close Button */}
                            <button onClick={() => setSelectedUserId(null)} className="absolute top-3 right-3 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors z-10">✕</button>
                            
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 flex flex-col items-center text-center">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg mb-3" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-4xl shadow-lg mb-3 border-4 border-white dark:border-gray-800">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <h3 className="text-2xl font-bold text-white">{user.name}</h3>
                                <p className="text-blue-100 font-medium">{stat?.pubsRatedCount || 0} Pubs Rated</p>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Favorite Pub</p>
                                    <p className="font-bold text-gray-800 dark:text-white text-lg flex items-center justify-between">
                                        {favoritePub.name} 
                                        {favoritePub.score > 0 && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">{favoritePub.score.toFixed(1)}/10</span>}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-2">Trophy Cabinet</p>
                                    <div className="flex flex-wrap gap-2">
                                        {stat?.badges.length > 0 ? (
                                            stat.badges.map((badge, idx) => (
                                                <div key={idx} title={badge.title} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-2xl hover:scale-110 transition-transform cursor-help">
                                                    {badge.emoji}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">No badges earned yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}