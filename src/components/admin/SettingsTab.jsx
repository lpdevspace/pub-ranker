import React from 'react';

const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5';

function Card({ title, description, children }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
            <div className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h4>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
            <div className="px-5 py-5 space-y-4">
                {children}
            </div>
        </div>
    );
}

function Toggle({ checked, onChange, label, description, color = 'blue' }) {
    const colors = {
        blue:  checked ? 'bg-blue-600'  : 'bg-gray-300 dark:bg-gray-600',
        green: checked ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600',
    };
    return (
        <div className="flex items-start gap-3">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`mt-0.5 relative shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${colors[color]}`}
                style={{ height: '22px', width: '40px' }}
            >
                <span
                    className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform ${
                        checked ? 'translate-x-[18px]' : 'translate-x-0'
                    }`}
                    style={{ width: '18px', height: '18px' }}
                />
            </button>
            <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">{label}</p>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
        </div>
    );
}

export default function SettingsTab({
    editGroupName, setEditGroupName,
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
    // brandColor / setBrandColor kept as props for backwards compat but not rendered
    brandColor, setBrandColor,
}) {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Settings</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your group's appearance and access controls.</p>
            </div>

            {/* ── Branding ───────────────────────────────────────────── */}
            <Card title="Branding" description="How your group appears to members.">
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
                            className="mt-2 w-full max-h-36 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                    )}
                </div>
            </Card>

            {/* ── Privacy ───────────────────────────────────────────── */}
            <Card title="Privacy &amp; Access" description="Control who can find and join your group.">
                <Toggle
                    checked={requireApproval}
                    onChange={setRequireApproval}
                    color="blue"
                    label="Require approval to join"
                    description="New members must be approved by an admin before they can see group content."
                />
                <Toggle
                    checked={isPublic}
                    onChange={setIsPublic}
                    color="green"
                    label="Public group"
                    description="Public groups are listed in the directory and can be found by anyone."
                />
            </Card>

            {/* Save button */}
            <div className="flex justify-end pt-1">
                <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings || !editGroupName.trim()}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                >
                    {isSavingSettings ? 'Saving…' : 'Save Settings'}
                </button>
            </div>

            {/* ── Tools ─────────────────────────────────────────────── */}
            <Card title="Tools" description="Maintenance and data utilities.">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSyncLegacyPubs}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold rounded-lg border border-indigo-200 dark:border-indigo-700 transition-colors"
                    >
                        <span>{isSyncing ? '🔄' : '🔄'}</span>
                        {isSyncing ? 'Syncing…' : 'Sync Legacy Pubs'}
                    </button>
                    <button
                        onClick={handleExportData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                    >
                        <span>📤</span> Export CSV
                    </button>
                </div>
                {isSyncing && syncProgress && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse mt-1">{syncProgress}</p>
                )}
            </Card>
        </div>
    );
}
