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
    const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors shadow-sm';
    const active = criteria.filter(c => !c.archived);
    const archived = criteria.filter(c => c.archived);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Rating Criteria</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Define the categories members will score pubs on.
                </p>
            </div>

            {/* Add form */}
            {canManageSettings && (
                <form onSubmit={handleAddCriterion} className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 space-y-4 border border-gray-200/60 dark:border-gray-700 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-0.5">Add New Rating Category</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Category Name</label>
                            <input
                                type="text"
                                value={newCriterionName}
                                onChange={e => setNewCriterionName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. Beer Selection, Vibe"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Rating Type</label>
                            <select value={newCriterionType} onChange={e => setNewCriterionType(e.target.value)} className={inputClass}>
                                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Default Weight</label>
                            <input
                                type="number"
                                min="0.1" step="0.1" max="10"
                                value={newCriterionWeight}
                                onChange={e => setNewCriterionWeight(e.target.value)}
                                className={inputClass}
                                placeholder="Weight (default 1)"
                            />
                        </div>
                    </div>
                    {criterionError && <p className="text-xs text-red-500 dark:text-red-400 font-bold">{criterionError}</p>}
                    
                    <div className="flex justify-end pt-1">
                        <button
                            type="submit"
                            disabled={savingCriterion || !newCriterionName.trim()}
                            className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {savingCriterion ? 'Creating…' : '＋ Create Category'}
                        </button>
                    </div>
                </form>
            )}

            {/* Active criteria */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-1">Active Criteria ({active.length})</h4>
                {active.length === 0 && <p className="text-sm text-gray-450 dark:text-gray-500 italic ml-1">No active criteria set yet.</p>}
                
                <div className="grid grid-cols-1 gap-3">
                    {active.map(c => (
                        <div key={c.id} className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:border-brand-border/30 transition-colors">
                            <div className="flex-1 min-w-0">
                                {editingCriterionId === c.id ? (
                                    <div className="flex items-center gap-2 max-w-lg">
                                        <input
                                            autoFocus
                                            value={editingCriterionName}
                                            onChange={e => setEditingCriterionName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveCriterionEdit(c.id); if (e.key === 'Escape') setEditingCriterionId(null); }}
                                            className="flex-1 text-sm px-3 py-1.5 border border-brand/50 rounded-lg bg-white dark:bg-gray-900 text-gray-850 dark:text-gray-100 focus:outline-none shadow-inner"
                                        />
                                        <button onClick={() => handleSaveCriterionEdit(c.id)} className="text-xs text-green-600 dark:text-green-400 font-bold hover:underline cursor-pointer">Save</button>
                                        <button onClick={() => setEditingCriterionId(null)} className="text-xs text-gray-400 dark:text-gray-500 hover:underline cursor-pointer">Cancel</button>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{c.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-700 px-2 py-0.5 rounded-full select-none">
                                                {TYPE_LABELS[c.type] || c.type}
                                            </span>
                                            <span className="text-[10px] font-black text-brand bg-brand-subtle dark:bg-brand-highlight/30 px-2.5 py-0.5 rounded-full select-none">
                                                Weight: ×{c.weight ?? 1}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {canManageSettings && editingCriterionId !== c.id && (
                                <div className="flex gap-3 text-xs shrink-0 font-bold">
                                    <button 
                                        onClick={() => { setEditingCriterionId(c.id); setEditingCriterionName(c.name); }} 
                                        className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer"
                                    >
                                        Rename
                                    </button>
                                    <button 
                                        onClick={() => handleArchiveCriterion(c.id, true, c.name)} 
                                        className="text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                                    >
                                        Archive
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Archived criteria */}
            {archived.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-750">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-550 ml-1">Archived History ({archived.length})</h4>
                    <div className="grid grid-cols-1 gap-2.5">
                        {archived.map(c => (
                            <div key={c.id} className="flex items-center justify-between opacity-50 bg-gray-50 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-700 rounded-xl px-4 py-3">
                                <span className="text-xs text-gray-600 dark:text-gray-450 line-through truncate font-medium">{c.name}</span>
                                {canManageSettings && (
                                    <button 
                                        onClick={() => handleArchiveCriterion(c.id, false, c.name)} 
                                        className="text-xs text-green-600 dark:text-green-400 font-bold hover:underline cursor-pointer"
                                    >
                                        Restore
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
