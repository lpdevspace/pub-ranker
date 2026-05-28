import React from 'react';

export default function SettingsTab({
    editGroupName, setEditGroupName,
    brandColor, setBrandColor,
    editGroupCover, setEditGroupCover,
    safeEditGroupCover,
    requireApproval, setRequireApproval,
    city, setCity,
    isPublic, setIsPublic,
    isSavingSettings,
    isSyncing, syncProgress,
    handleSaveSettings,
    handleSyncLegacyPubs,
    handleExportData,
}) {
    const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
    const labelClass = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1';

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Group Settings</h3>

            {/* Group name */}
            <div>
                <label className={labelClass}>Group Name</label>
                <input
                    type="text"
                    value={editGroupName}
                    onChange={e => setEditGroupName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. The Usual Suspects"
                />
            </div>

            {/* Brand colour */}
            <div>
                <label className={labelClass}>Brand Colour</label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={brandColor}
                        onChange={e => setBrandColor(e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{brandColor}</span>
                </div>
            </div>

            {/* Cover photo */}
            <div>
                <label className={labelClass}>Cover Photo URL</label>
                <input
                    type="url"
                    value={editGroupCover}
                    onChange={e => setEditGroupCover(e.target.value)}
                    className={inputClass}
                    placeholder="https://..."
                />
                {safeEditGroupCover && (
                    <img
                        src={safeEditGroupCover}
                        alt="Cover preview"
                        className="mt-2 w-full max-h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                )}
            </div>

            {/* City */}
            <div>
                <label className={labelClass}>City / Region</label>
                <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Wolverhampton"
                />
            </div>

            {/* Toggles */}
            <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                        onClick={() => setRequireApproval(v => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                            requireApproval ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            requireApproval ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Require approval to join</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                        onClick={() => setIsPublic(v => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                            isPublic ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            isPublic ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Public group</span>
                </label>
            </div>

            {/* Save */}
            <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings || !editGroupName.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
                {isSavingSettings ? 'Saving…' : 'Save Settings'}
            </button>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Maintenance */}
            <h4 className="text-base font-bold text-gray-700 dark:text-gray-300">Maintenance</h4>
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleSyncLegacyPubs}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    {isSyncing ? '🔄 Syncing…' : '🔄 Sync Legacy Pubs'}
                </button>
                <button
                    onClick={handleExportData}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    📤 Export Data (CSV)
                </button>
            </div>
            {isSyncing && syncProgress && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">{syncProgress}</p>
            )}
        </div>
    );
}
