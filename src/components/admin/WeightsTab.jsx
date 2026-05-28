import React from 'react';

export default function WeightsTab({
    criteria,
    localWeights, setLocalWeights,
    savingWeights,
    simulatedLeaderboard,
    handleSaveWeights,
}) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-6">
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        🔮 Live Preview (Top 5)
                    </h4>
                    <div className="space-y-2">
                        {simulatedLeaderboard.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">Rate some pubs to see the preview.</p>
                        ) : (
                            simulatedLeaderboard.map((pub, idx) => (
                                <div key={pub.id} className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <span className="font-bold text-gray-700 dark:text-gray-200">
                                        <span className="text-gray-400 mr-2">#{idx + 1}</span>{pub.name}
                                    </span>
                                    <span className="font-black text-blue-600 dark:text-blue-400">{pub.avgScore.toFixed(2)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Global Criteria Weights</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Adjust how important each criterion is. This will permanently alter the leaderboard rankings for everyone in the group.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {criteria.filter(c => !c.archived).map((c) => (
                        <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm hover:border-blue-300 transition-colors">
                            <div className="flex justify-between text-sm mb-3">
                                <span className="font-bold text-gray-700 dark:text-gray-300 truncate pr-2">{c.name}</span>
                                <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded font-black dark:text-blue-400">
                                    {(localWeights[c.id] ?? c.weight ?? 1).toFixed(1)}x
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.1"
                                value={localWeights[c.id] ?? c.weight ?? 1}
                                onChange={(e) => setLocalWeights(prev => ({ ...prev, [c.id]: parseFloat(e.target.value) }))}
                                className="w-full accent-blue-600 cursor-pointer"
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleSaveWeights}
                    disabled={savingWeights}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 mt-6"
                >
                    {savingWeights ? 'Updating Database...' : '💾 Save & Update Leaderboard'}
                </button>
            </div>
        </div>
    );
}
