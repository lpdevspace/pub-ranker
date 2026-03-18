import React, { useMemo } from 'react';

export default function LeaderboardPage({ scores, allUsers, pubs }) {
    const awards = useMemo(() => {
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
                        };
                    }
                    
                    // Track unique pubs rated
                    userStats[score.userId].pubsRated.add(pubId);

                    // Track averages based on type
                    if (score.type === 'scale') {
                        userStats[score.userId].totalScaleScore += score.value;
                        userStats[score.userId].scaleScoreCount++;
                    } else if (score.type === 'price') {
                        userStats[score.userId].totalPriceScore += score.value;
                        userStats[score.userId].priceScoreCount++;
                    }
                });
            });
        });

        // 2. Format the stats array
        const statsArray = Object.values(userStats).map(stat => ({
            ...stat,
            pubsRatedCount: stat.pubsRated.size,
            avgScaleScore: stat.scaleScoreCount > 0 ? (stat.totalScaleScore / stat.scaleScoreCount) : null,
            avgPriceScore: stat.priceScoreCount > 0 ? (stat.totalPriceScore / stat.priceScoreCount) : null,
        }));

        // 3. Helper to filter users with a minimum number of ratings
        const qualifiedUsers = statsArray.filter(s => s.pubsRatedCount >= 2);

        // 4. Calculate the Winners
        const theRegular = [...statsArray].sort((a, b) => b.pubsRatedCount - a.pubsRatedCount)[0];
        const harshCritic = [...qualifiedUsers].filter(s => s.avgScaleScore !== null).sort((a, b) => a.avgScaleScore - b.avgScaleScore)[0];
        const easilyPleased = [...qualifiedUsers].filter(s => s.avgScaleScore !== null).sort((a, b) => b.avgScaleScore - a.avgScaleScore)[0];
        const bigSpender = [...qualifiedUsers].filter(s => s.avgPriceScore !== null).sort((a, b) => b.avgPriceScore - a.avgPriceScore)[0];

        // Calculate The Explorer
        const pubAddCounts = {};
        pubs.forEach(pub => {
            if (pub.addedBy) {
                pubAddCounts[pub.addedBy] = (pubAddCounts[pub.addedBy] || 0) + 1;
            }
        });
        const theExplorerUserId = Object.keys(pubAddCounts).sort((a, b) => pubAddCounts[b] - pubAddCounts[a])[0];
        const theExplorer = theExplorerUserId ? { userId: theExplorerUserId, addedCount: pubAddCounts[theExplorerUserId] } : null;

        return {
            theRegular,
            harshCritic,
            easilyPleased,
            bigSpender,
            theExplorer
        };
    }, [scores, pubs]);

    const getUserDetails = (userId) => {
        const u = allUsers[userId];
        if (!u) return { name: "Unknown User", avatar: "" };
        return {
            name: u.nickname || u.displayName || u.email || "Unknown User",
            avatar: u.avatarUrl || ""
        };
    };

    const AwardCard = ({ title, emoji, description, winner, statLabel, statValue }) => {
        if (!winner) {
            return (
                <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-gray-300 flex flex-col items-center text-center opacity-60">
                    <div className="text-4xl mb-2">{emoji}</div>
                    <h3 className="text-xl font-bold text-gray-700">{title}</h3>
                    <p className="text-sm text-gray-500 mt-2">Not enough data yet.</p>
                </div>
            );
        }

        const user = getUserDetails(winner.userId);

        return (
            <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500 flex flex-col items-center text-center hover:shadow-lg transition transform hover:-translate-y-1">
                <div className="text-4xl mb-2">{emoji}</div>
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-xs text-gray-500 mb-4">{description}</p>
                
                {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 mb-3" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl mb-3 border-2 border-blue-200">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
                
                <h4 className="font-bold text-lg text-blue-700">{user.name}</h4>
                <div className="mt-3 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                    <span className="text-sm font-semibold text-gray-600 mr-2">{statLabel}:</span>
                    <span className="text-md font-bold text-blue-800">{statValue}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <h2 className="text-3xl font-bold text-gray-800">The Hall of Fame</h2>
                <p className="text-sm text-gray-500">Updates live as you rate pubs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AwardCard 
                    title="The Regular" 
                    emoji="🍻" 
                    description="Most unique pubs rated"
                    winner={awards.theRegular}
                    statLabel="Pubs Visited"
                    statValue={awards.theRegular?.pubsRatedCount}
                />
                <AwardCard 
                    title="The Easily Pleased" 
                    emoji="🤩" 
                    description="Highest average score given"
                    winner={awards.easilyPleased}
                    statLabel="Avg Score"
                    statValue={awards.easilyPleased?.avgScaleScore?.toFixed(1) + "/10"}
                />
                <AwardCard 
                    title="The Harsh Critic" 
                    emoji="🧐" 
                    description="Lowest average score given"
                    winner={awards.harshCritic}
                    statLabel="Avg Score"
                    statValue={awards.harshCritic?.avgScaleScore?.toFixed(1) + "/10"}
                />
                <AwardCard 
                    title="The Big Spender" 
                    emoji="💸" 
                    description="Consistently rates expensive pubs"
                    winner={awards.bigSpender}
                    statLabel="Avg Price Rating"
                    statValue={awards.bigSpender?.avgPriceScore?.toFixed(1) + "/5"}
                />
                <AwardCard 
                    title="The Explorer" 
                    emoji="🗺️" 
                    description="Added the most pubs to the group"
                    winner={awards.theExplorer}
                    statLabel="Pubs Added"
                    statValue={awards.theExplorer?.addedCount}
                />
            </div>
        </div>
    );
}