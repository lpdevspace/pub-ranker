import React from 'react';

const TYPE_LABELS = { scale: '⭐ Scale (1–10)', price: '💰 Price (1–5)', binary: '✅ Yes / No' };

export default function CriteriaTab({
    criteria,
    newCriterionName, setNewCriterionName,
    newCriterionType, setNewCriterionType,
    newCriterionWeight, setNewCriterionWeight,
    savingCriterion,
    criterionError,
    editingCriterionId, setEditingCriterionId,
    editingCriterionName, setEditingCriterionName,
    canManageSettings,
    handleAddCriterion,
    handleArchiveCriterion,
    handleSaveCriterionEdit,
}) {
    const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
    const active = criteria.filter(c => !c.archived);
    const archived = criteria.filter(c => c.archived);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Rating Criteria</h3>

            {/* Add form */}
            {canManageSettings && (
                <form onSubmit={handleAddCriterion} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Add New Criterion</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                            type="text"
                            value={newCriterionName}
                            onChange={e => setNewCriterionName(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Atmosphere"
                        />
                        <select value={newCriterionType} onChange={e => setNewCriterionType(e.target.value)} className={inputClass}>
                            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input
                            type="number"
                            min="0.1" step="0.1" max="10"
                            value={newCriterionWeight}
                            onChange={e => setNewCriterionWeight(e.target.value)}
                            className={inputClass}
                            placeholder="Weight (default 1)"
                        />
                    </div>
                    {criterionError && <p className="text-xs text-red-500">{criterionError}</p>}
                    <button
                        type="submit"
                        disabled={savingCriterion}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                        {savingCriterion ? 'Adding…' : '+ Add Criterion'}
                    </button>
                </form>
            )}

            {/* Active criteria */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Active ({active.length})</h4>
                {active.length === 0 && <p className="text-sm text-gray-400 italic">No active criteria yet.</p>}
                {active.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                            {editingCriterionId === c.id ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        value={editingCriterionName}
                                        onChange={e => setEditingCriterionName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCriterionEdit(c.id); if (e.key === 'Escape') setEditingCriterionId(null); }}
                                        className="flex-1 text-sm px-2 py-1 border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                    />
                                    <button onClick={() => handleSaveCriterionEdit(c.id)} className="text-xs text-green-600 font-bold">Save</button>
                                    <button onClick={() => setEditingCriterionId(null)} className="text-xs text-gray-400">Cancel</button>
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                    {c.name}
                                    <span className="ml-2 text-xs text-gray-400">{TYPE_LABELS[c.type] || c.type}</span>
                                    <span className="ml-2 text-xs text-blue-500">×{c.weight ?? 1}</span>
                                </p>
                            )}
                        </div>
                        {canManageSettings && editingCriterionId !== c.id && (
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingCriterionId(c.id); setEditingCriterionName(c.name); }} className="text-xs text-blue-500 hover:underline">Edit</button>
                                <button onClick={() => handleArchiveCriterion(c.id, true, c.name)} className="text-xs text-red-500 hover:underline">Archive</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Archived criteria */}
            {archived.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400">Archived ({archived.length})</h4>
                    {archived.map(c => (
                        <div key={c.id} className="flex items-center justify-between opacity-50 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-through">{c.name}</p>
                            {canManageSettings && (
                                <button onClick={() => handleArchiveCriterion(c.id, false, c.name)} className="text-xs text-green-600 hover:underline">Restore</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
