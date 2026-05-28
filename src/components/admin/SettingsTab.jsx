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
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Group Brand &amp; Identity</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Group Name</label>
                        <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Brand Theme Color</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-10 w-16 p-1 border dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-800" />
                            <span className="text-sm font-mono text-gray-500">{brandColor.toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">This color will be used for primary buttons and accents across your group's dashboard.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cover Photo URL (Displays on Dashboard)</label>
                        <input type="text" value={editGroupCover} onChange={e => setEditGroupCover(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white mb-3" />
                        {safeEditGroupCover && <img src={safeEditGroupCover} alt="Cover Preview" className="h-32 w-full object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-600" onError={(e) => { e.target.style.display = 'none'; }} />}
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Private Group (Approvals)</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Require admin approval before new members can join via the invite link.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={requireApproval} onChange={() => setRequireApproval(!requireApproval)} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 space-y-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Group City / Region</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. London, Manchester, New York" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-600 pt-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">🌍 Publish to Global Leaderboard</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Allow your group to be featured on the public homepage to attract new members.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isPublic} onChange={() => setIsPublic(!isPublic)} className="sr-only peer" />
                        <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-400">Export Group Data</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-300">Download a .csv file of all your pubs, locations, and their statuses for use in Excel.</p>
                </div>
                <button onClick={handleExportData} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    📥 Download CSV
                </button>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800 space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-orange-800 dark:text-orange-400">Database Maintenance</h3>
                    <p className="text-sm text-orange-600 dark:text-orange-300">If you have older pubs missing cover photos and Google data, you can force a sync here.</p>
                </div>
                <button onClick={handleSyncLegacyPubs} disabled={isSyncing} className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50 flex flex-col items-center justify-center">
                    {isSyncing ? (
                        <>
                            <span>🔄 Syncing... Please do not close this page.</span>
                            <span className="text-xs font-normal mt-1 opacity-80">{syncProgress}</span>
                        </>
                    ) : '🔄 Sync Legacy Pubs with Google'}
                </button>
            </div>

            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50">
                {isSavingSettings ? 'Saving...' : '💾 Save Settings'}
            </button>
        </div>
    );
}
