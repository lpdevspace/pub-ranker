import React from 'react';

export default function WeightsTab({
    criteria,
    localWeights, setLocalWeights,
    savingWeights,
    simulatedLeaderboard,
    handleSaveWeights,
}) {
    const active = criteria.filter(c => !c.archived);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Global Weights</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Adjust how much each criterion contributes to the overall leaderboard score.
                </p>
            </div>

            {active.length === 0 && (
                <p className="text-sm text-gray-400 italic">No active criteria to weight.</p>
            )}

            <div className="space-y-4">
                {active.map(c => (
                    <div key={c.id}>
                        <div className="flex justify-between mb-1">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{c.name}</label>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">×{(localWeights[c.id] ?? 1).toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={localWeights[c.id] ?? 1}
                            onChange={e => setLocalWeights(prev => ({ ...prev, [c.id]: parseFloat(e.target.value) }))}
                            className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                            <span>0 (ignore)</span>
                            <span>5 (max)</span>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleSaveWeights}
                disabled={savingWeights}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
                {savingWeights ? 'Saving…' : '💾 Save Weights'}
            </button>

            {/* Live preview */}
            {simulatedLeaderboard.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">📊 Preview: Top 5 with current weights</h4>
                    <ol className="space-y-2">
                        {simulatedLeaderboard.map((pub, i) => (
                            <li key={pub.id} className="flex items-center gap-3 text-sm">
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">{i + 1}</span>
                                <span className="flex-1 text-gray-800 dark:text-gray-200 truncate">{pub.name}</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{pub.avgScore.toFixed(2)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
