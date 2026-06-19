import React from 'react';

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors shadow-sm';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 ml-1';

function Card({ title, description, children }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h4>
                {description && <p className="text-xs text-gray-400 dark:text-gray-550 mt-0.5">{description}</p>}
            </div>
            <div className="p-5 flex-1 space-y-4">
                {children}
            </div>
        </div>
    );
}

function Toggle({ checked, onChange, label, description, color = 'blue' }) {
    const colors = {
        blue:  checked ? 'bg-brand'  : 'bg-gray-200 dark:bg-gray-700',
        green: checked ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700',
    };
    return (
        <div className="flex items-start gap-3">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`mt-0.5 relative shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${colors[color]}`}
                style={{ height: '22px', width: '40px' }}
            >
                <span
                    className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform ${
                        checked ? 'translate-x-[18px]' : 'translate-x-0'
                    }`}
                    style={{ width: '18px', height: '18px' }}
                />
            </button>
            <div className="space-y-0.5">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-tight">{label}</p>
                {description && <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{description}</p>}
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
    brandColor, setBrandColor,
}) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Settings</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your group's profile, privacy rules, and data integrations.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Branding */}
                <div className="space-y-6">
                    <Card title="Group Branding" description="Customise group name, logo, and cover images.">
                        <div>
                            <label className={labelClass}>Group Name</label>
                            <input
                                type="text"
                                value={editGroupName}
                                onChange={e => setEditGroupName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. The Beer Enthusiasts"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Base City / Region</label>
                            <input
                                type="text"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. Wolverhampton"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Theme Accent Color</label>
                            <div className="flex flex-wrap gap-2.5 items-center mt-1 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                {[
                                    { value: '#b45309', label: 'Ale' },
                                    { value: '#881337', label: 'Stout' },
                                    { value: '#14532d', label: 'Hop' },
                                    { value: '#7c3aed', label: 'Cider' },
                                    { value: '#0369a1', label: 'Gin' },
                                    { value: '#dc2626', label: 'Wine' }
                                ].map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setBrandColor(c.value)}
                                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer ${
                                            brandColor === c.value ? 'border-gray-800 dark:border-white shadow-md' : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: c.value }}
                                        title={c.label}
                                    >
                                        {brandColor === c.value && (
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1.5" />
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-500 dark:text-gray-400 select-none">
                                    <input
                                        type="color"
                                        value={brandColor}
                                        onChange={e => setBrandColor(e.target.value)}
                                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-650 bg-transparent cursor-pointer p-0.5"
                                    />
                                    Custom
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Cover Photo URL</label>
                            <input
                                type="url"
                                value={editGroupCover}
                                onChange={e => setEditGroupCover(e.target.value)}
                                className={inputClass}
                                placeholder="https://images.unsplash.com/..."
                            />
                            {safeEditGroupCover && (
                                <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner group">
                                    <img
                                        src={safeEditGroupCover}
                                        alt="Cover preview"
                                        className="w-full h-24 object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white bg-black/40 px-2 py-0.5 rounded-full">Preview</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column: Privacy, Access & Utilities */}
                <div className="space-y-6">
                    <Card title="Privacy &amp; Permissions" description="Set joining rules and directory searchability.">
                        <div className="space-y-5">
                            <Toggle
                                checked={requireApproval}
                                onChange={setRequireApproval}
                                color="blue"
                                label="Require Admin Approval"
                                description="New members must be manually accepted in the Members tab before joining."
                            />
                            
                            <div className="w-full h-px bg-gray-150 dark:bg-gray-750" />

                            <Toggle
                                checked={isPublic}
                                onChange={setIsPublic}
                                color="green"
                                label="Make Group Public"
                                description="Public groups are searchable in the directory by any registered user."
                            />
                        </div>
                    </Card>

                    <Card title="Maintenance Tools" description="Data backup and legacy synchronisation.">
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSyncLegacyPubs}
                                disabled={isSyncing}
                                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-subtle dark:bg-brand-highlight text-brand font-bold rounded-xl border border-brand-border/40 hover:bg-brand hover:text-white transition-all disabled:opacity-50 text-sm cursor-pointer shadow-sm"
                            >
                                <span>{isSyncing ? '🔄' : '🔄'}</span>
                                {isSyncing ? 'Syncing Pubs…' : 'Sync Legacy Google Places'}
                            </button>
                            {isSyncing && syncProgress && (
                                <p className="text-[10px] text-brand font-bold animate-pulse text-center">{syncProgress}</p>
                            )}
                            
                            <button
                                onClick={handleExportData}
                                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-250 font-bold rounded-xl border border-gray-200 dark:border-gray-650 transition-all text-sm cursor-pointer shadow-sm"
                            >
                                <span>📤</span> Export Group Data (CSV)
                            </button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Save bar */}
            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings || !editGroupName.trim()}
                    className="px-6 py-3 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-xl text-sm font-bold transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isSavingSettings ? 'Saving Changes…' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}
