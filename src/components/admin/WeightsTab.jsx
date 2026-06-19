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
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Global Weights</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Adjust the relative importance of each category. Real-time updates are shown in the leaderboard preview below.
                </p>
            </div>

            {active.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No active criteria available to weight.</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sliders panel */}
                <div className="lg:col-span-2 space-y-5 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-0.5">Adjust Weights</h4>
                    <div className="space-y-5">
                        {active.map(c => (
                            <div key={c.id} className="space-y-1 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">{c.name}</label>
                                    <span className="text-xs font-black text-brand bg-brand-subtle dark:bg-brand-highlight/30 px-2 py-0.5 rounded-full select-none">
                                        Multiplier: ×{(localWeights[c.id] ?? 1).toFixed(1)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    value={localWeights[c.id] ?? 1}
                                    onChange={e => setLocalWeights(prev => ({ ...prev, [c.id]: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 font-semibold select-none">
                                    <span>0.0 (ignore)</span>
                                    <span>2.5 (normal)</span>
                                    <span>5.0 (maximum)</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                        <button
                            onClick={handleSaveWeights}
                            disabled={savingWeights || active.length === 0}
                            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl transition-all shadow cursor-pointer disabled:opacity-50"
                        >
                            {savingWeights ? 'Saving Weights…' : '💾 Save Global Weights'}
                        </button>
                    </div>
                </div>

                {/* Simulated Leaderboard Live Preview */}
                <div className="space-y-4">
                    {simulatedLeaderboard.length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200/60 dark:border-gray-700 shadow-sm flex flex-col h-full">
                            <div className="mb-4">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Leaderboard Impact</h4>
                                <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Simulated Live Preview</p>
                            </div>
                            <ol className="space-y-2.5 flex-1">
                                {simulatedLeaderboard.map((pub, i) => (
                                    <li key={pub.id} className="flex items-center gap-3 text-sm bg-gray-50 dark:bg-gray-900/30 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black shrink-0 ${
                                            i === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                            i === 1 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                                            i === 2 ? 'bg-orange-100 text-orange-850 border border-orange-205' :
                                            'bg-gray-150 dark:bg-gray-750 text-gray-650 dark:text-gray-300'
                                        }`}>
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 text-gray-800 dark:text-gray-250 truncate font-semibold">{pub.name}</span>
                                        <span className="font-mono font-black text-brand text-xs">{pub.avgScore.toFixed(2)}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-3 text-center">Preview recalculates immediately as you drag multipliers above.</p>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-205 dark:border-gray-700 text-center flex items-center justify-center h-48">
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No ratings found to simulate preview.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
