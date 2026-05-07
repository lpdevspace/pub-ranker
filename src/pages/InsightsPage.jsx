import React, { useMemo } from 'react';

export default function InsightsPage({ pubs, scores, allUsers, criteria }) {
    
    // Calculate deep analytics
    const analytics = useMemo(() => {
        let stats = {
            totalRatings: 0,
            divisivePubs: [],
            harshCritics: [],
            categoryWinners: {}
        };

        const userAverages = {};
        const pubVariances = [];

        // Pre-calculate data
        pubs.forEach(pub => {
            const pubScores = scores[pub.id] || {};
            let allPubValues = [];

            Object.entries(pubScores).forEach(([critId, critScores]) => {
                const criterion = criteria.find(c => c.id === critId);
                if (!criterion) return;

                let critValues = [];
                critScores.forEach(score => {
                    stats.totalRatings++;
                    if (score.type === 'scale' && score.value !== null) {
                        critValues.push(score.value);
                        allPubValues.push(score.value);
                        
                        // Track User Averages for "Harsh Critic"
                        if (!userAverages[score.userId]) userAverages[score.userId] = { total: 0, count: 0 };
                        userAverages[score.userId].total += score.value;
                        userAverages[score.userId].count++;
                    }
                });

                // Track Category Winners
                if (critValues.length > 0) {
                    const avg = critValues.reduce((a, b) => a + b, 0) / critValues.length;
                    if (!stats.categoryWinners[critId] || avg > stats.categoryWinners[critId].score) {
                        stats.categoryWinners[critId] = { pubName: pub.name, score: avg };
                    }
                }
            });

            // Calculate Variance for "Most Divisive Pub"
            if (allPubValues.length > 2) {
                const mean = allPubValues.reduce((a, b) => a + b, 0) / allPubValues.length;
                const variance = allPubValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allPubValues.length;
                pubVariances.push({ name: pub.name, variance, mean });
            }
        });

        stats.divisivePubs = pubVariances.sort((a, b) => b.variance - a.variance).slice(0, 3);
        
        stats.harshCritics = Object.entries(userAverages)
            .map(([uid, data]) => ({ uid, avg: data.total / data.count, count: data.count }))
            .filter(u => u.count > 5) // Only count people with more than 5 ratings
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 3);

        return stats;
    }, [pubs, scores, criteria]);

    const getUser = (uid) => allUsers[uid]?.displayName || allUsers[uid]?.email || 'Unknown User';

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
            <div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-white">Group Insights</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Deep data analytics based on {analytics.totalRatings} individual data points.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Harsh Critic Leaderboard */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-1">🔪 Harshest Critics</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Members with the lowest average scores (min. 6 ratings).</p>
                    {analytics.harshCritics.length === 0 ? (
                        <p className="text-gray-400 text-sm">Not enough data yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {analytics.harshCritics.map((critic, i) => (
                                <div key={critic.uid} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{['🥇','🥈','🥉'][i]}</span>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white text-sm">{getUser(critic.uid)}</p>
                                            <p className="text-xs text-gray-500">{critic.count} ratings</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">{critic.avg.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Most Divisive Pubs */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-1">⚔️ Most Divisive Pubs</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Highest variance in ratings — love it or hate it.</p>
                    {analytics.divisivePubs.length === 0 ? (
                        <p className="text-gray-400 text-sm">Not enough data yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {analytics.divisivePubs.map((pub, i) => (
                                <div key={pub.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{['🔥','💥','⚡'][i]}</span>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white text-sm">{pub.name}</p>
                                            <p className="text-xs text-gray-500">avg {pub.mean.toFixed(1)}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">σ² {pub.variance.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Winners */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-black text-gray-800 dark:text-white mb-4">🏆 Category Champions</h3>
                {Object.keys(analytics.categoryWinners).length === 0 ? (
                    <p className="text-gray-400 text-sm">Not enough data yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(analytics.categoryWinners).map(([critId, winner]) => {
                            const criterion = criteria.find(c => c.id === critId);
                            return (
                                <div key={critId} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">{criterion?.name || critId}</p>
                                    <p className="font-black text-gray-800 dark:text-white text-sm leading-snug">{winner.pubName}</p>
                                    <p className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400 mt-1">{winner.score.toFixed(1)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
