import { useEffect, useState } from 'react';
import PremiumLock from './PremiumLock';

/**
 * MultiVenueOverview — bird's-eye dashboard for Pub Plus chain owners.
 * Pulls each owned venue's recent score average and review count so the user
 * can spot under-performing sites at a glance.
 */
export default function MultiVenueOverview({ db, ownedVenues, plan, onSelectVenue, onUpgrade }) {
    const isPlus = plan?.key === 'pubPlus';
    const [stats, setStats] = useState({});  // venueId → { avg, count, low }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isPlus || ownedVenues.length === 0) {
            setLoading(false);
            return;
        }
        setLoading(true);

        Promise.all(ownedVenues.map(async v => {
            try {
                const snap  = await db.collectionGroup('scores').where('pubId', '==', v.id).get();
                const docs  = snap.docs.map(d => d.data());
                const count = docs.length;
                const sum   = docs.reduce((a, d) => a + (Number(d.value) || 0), 0);
                const avg   = count ? sum / count : 0;
                const low   = avg < 6 && count >= 5;
                return [v.id, { avg, count, low }];
            } catch (_) {
                return [v.id, { avg: 0, count: 0, low: false }];
            }
        })).then(entries => {
            setStats(Object.fromEntries(entries));
        }).finally(() => setLoading(false));
    }, [db, ownedVenues, isPlus]);

    if (!isPlus) {
        return (
            <div className="space-y-6 animate-fadeIn relative min-h-[400px]" data-testid="multi-venue-locked">
                <div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">All venues at a glance</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Pub Plus only</p>
                </div>
                <div className="h-72 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/40 dark:bg-gray-750/20" />
                <PremiumLock
                    requiredPlan="pubPlus"
                    icon="🏛️"
                    title="Manage every venue from one screen"
                    body="Pub Plus gives chain owners a unified dashboard, spots under-performing sites instantly, and includes 2 featured-listing credits per month."
                    onUpgrade={onUpgrade}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn" data-testid="multi-venue-overview">
            <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">All venues at a glance</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{ownedVenues.length} claimed</p>
            </div>

            {loading ? (
                <p className="text-xs text-gray-500 italic p-8 text-center">Crunching numbers across all your sites…</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ownedVenues.map(v => {
                        const s = stats[v.id] || { avg: 0, count: 0, low: false };
                        return (
                            <button
                                key={v.id}
                                onClick={() => onSelectVenue?.(v.id)}
                                data-testid={`multi-venue-card-${v.id}`}
                                className={`text-left p-4 rounded-2xl border transition shadow-sm hover:shadow-md cursor-pointer ${
                                    s.low
                                        ? 'border-red-300 dark:border-red-800/50 bg-red-50/60 dark:bg-red-900/10'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand/40'
                                }`}
                            >
                                <p className="text-xs font-bold text-gray-850 dark:text-white truncate">{v.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{v.location || v.address || '—'}</p>
                                <div className="flex items-baseline gap-2 mt-3">
                                    <span className="text-xl font-black text-brand tabular-nums">{s.avg.toFixed(1)}</span>
                                    <span className="text-[10px] text-gray-400">/ 10 · {s.count} reviews</span>
                                </div>
                                {s.low && (
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 mt-2">
                                        ⚠ Below 6 — needs attention
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
