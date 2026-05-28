import React from 'react';

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
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3">Create New Criterion</h3>
                <form onSubmit={handleAddCriterion} className="flex flex-col md:flex-row gap-3">
                    <input
                        type="text"
                        value={newCriterionName}
                        onChange={(e) => setNewCriterionName(e.target.value)}
                        placeholder="e.g., Guinness Quality"
                        className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                    />
                    <div className="flex gap-3">
                        <select
                            value={newCriterionType}
                            onChange={(e) => setNewCriterionType(e.target.value)}
                            className="w-40 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white cursor-pointer"
                        >
                            <option value="scale">Scale (1–10)</option>
                            <option value="yes-no">Yes / No</option>
                            <option value="price">Price (£-£££)</option>
                            <option value="currency">Exact Price (£)</option>
                            <option value="text">Written Review</option>
                        </select>
                        <button type="submit" disabled={savingCriterion} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60">
                            Add Rule
                        </button>
                    </div>
                </form>
                {criterionError && <p className="text-xs text-red-500 mt-2 font-bold">{criterionError}</p>}
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">Active Criteria</h3>
                {criteria.map((c) => (
                    <div key={c.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                        c.archived
                            ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                            : 'bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 shadow-sm'
                    }`}>
                        <div className="flex-1 mr-4">
                            {editingCriterionId === c.id ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editingCriterionName}
                                        onChange={(e) => setEditingCriterionName(e.target.value)}
                                        className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white text-sm"
                                    />
                                    <button onClick={() => handleSaveCriterionEdit(c.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded font-bold text-xs hover:bg-green-200">Save</button>
                                    <button onClick={() => setEditingCriterionId(null)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded font-bold text-xs hover:bg-gray-200">Cancel</button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{c.name}</p>
                                        <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{c.type}</span>
                                        {!c.archived && (
                                            <button
                                                onClick={() => { setEditingCriterionId(c.id); setEditingCriterionName(c.name); }}
                                                className="text-blue-500 hover:text-blue-700 text-xs font-bold ml-2"
                                            >Edit</button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Multiplier Weight: {c.weight ?? 1}x</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => canManageSettings && handleArchiveCriterion(c.id, !c.archived, c.name)}
                            disabled={!canManageSettings}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                                !canManageSettings ? 'opacity-50 cursor-not-allowed' : ''
                            } ${
                                c.archived
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                        >
                            {c.archived ? 'Restore' : 'Archive'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
