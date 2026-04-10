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
                    <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">👨‍⚖️ The Harsh Critics</h3>
                    <p className="text-xs text-gray-500 mb-4">Users with the lowest average scores given.</p>
                    <div className="space-y-4">
                        {analytics.harshCritics.length === 0 ? <p className="text-sm text-gray-400 italic">Not enough data yet.</p> : 
                            analytics.harshCritics.map((critic, idx) => (
                            <div key={critic.uid}>
                                <div className="flex justify-between text-sm mb-1 font-bold">
                                    <span className="text-gray-800 dark:text-gray-200">#{idx+1} {getUser(critic.uid)}</span>
                                    <span className="text-red-600">{critic.avg.toFixed(2)} Avg</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(critic.avg / 10) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divisive Pubs */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-black text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">⚔️ Most Divisive Pubs</h3>
                    <p className="text-xs text-gray-500 mb-4">Pubs where the group completely disagrees (highest score variance).</p>
                    <div className="space-y-4">
                        {analytics.divisivePubs.length === 0 ? <p className="text-sm text-gray-400 italic">Not enough data yet.</p> : 
                            analytics.divisivePubs.map((pub, idx) => (
                            <div key={pub.name}>
                                <div className="flex justify-between text-sm mb-1 font-bold">
                                    <span className="text-gray-800 dark:text-gray-200">#{idx+1} {pub.name}</span>
                                    <span className="text-purple-600">Avg: {pub.mean.toFixed(1)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
                                    <div className="bg-purple-500 h-2 rounded-full absolute" style={{ left: '20%', right: '20%' }}></div>
                                    <div className="w-3 h-3 bg-white border-2 border-purple-600 rounded-full absolute -top-0.5" style={{ left: `${(pub.mean / 10) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category Winners */}
                <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-black text-brand mb-6 flex items-center gap-2">🏆 Category Winners</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {criteria.filter(c => c.type === 'scale' && !c.archived).map(crit => {
                            const winner = analytics.categoryWinners[crit.id];
                            if (!winner) return null;
                            return (
                                <div key={crit.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-1">Best {crit.name}</p>
                                    <p className="font-black text-gray-900 dark:text-white truncate">{winner.pubName}</p>
                                    <p className="text-brand font-bold mt-1 text-sm">{winner.score.toFixed(2)} / 10</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}