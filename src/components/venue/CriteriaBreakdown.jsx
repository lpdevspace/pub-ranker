import { useMemo } from 'react';

/**
 * CriteriaBreakdown — aggregates a venue's scores by criterion ID and shows a
 * horizontal-bar comparison. Works on any score documents with shape
 * `{ criterionId, value }`. Friendly fallback labels when raw IDs leak through.
 */

const FRIENDLY = {
    atmosphere: 'Atmosphere',
    service:    'Service',
    beer:       'Beer & drink',
    food:       'Food',
    price:      'Price / value',
    cleanliness:'Cleanliness',
    music:      'Music & vibe',
    garden:     'Garden / outdoor',
    dogfriendly:'Dog-friendly',
    overall:    'Overall',
};

function friendlyLabel(id) {
    if (!id) return 'Unrated';
    const norm = String(id).toLowerCase().replace(/[_\-\s]/g, '');
    return FRIENDLY[norm] || id.charAt(0).toUpperCase() + id.slice(1).replace(/[_-]/g, ' ');
}

export default function CriteriaBreakdown({ scores, loading }) {
    const breakdown = useMemo(() => {
        if (!scores?.length) return [];
        const acc = {};
        for (const s of scores) {
            const id = s.criterionId || 'overall';
            acc[id] ??= { id, label: friendlyLabel(id), total: 0, count: 0 };
            acc[id].total += Number(s.value) || 0;
            acc[id].count += 1;
        }
        return Object.values(acc)
            .map(c => ({ ...c, avg: c.count > 0 ? c.total / c.count : 0 }))
            .sort((a, b) => b.avg - a.avg);
    }, [scores]);

    if (loading) {
        return (
            <div className="p-8 text-center text-xs text-gray-500 italic" data-testid="criteria-breakdown-loading">
                Crunching criteria…
            </div>
        );
    }

    if (breakdown.length === 0) {
        return (
            <div className="p-8 text-center text-xs text-gray-500 italic" data-testid="criteria-breakdown-empty">
                No criteria data yet. Once your customers rate you against multiple
                criteria, the breakdown will appear here.
            </div>
        );
    }

    return (
        <div className="p-5 space-y-3" data-testid="criteria-breakdown">
            {breakdown.map(c => {
                const pct = Math.max(0, Math.min(100, (c.avg / 10) * 100));
                const colorClass =
                    c.avg >= 8 ? 'bg-green-500' :
                    c.avg >= 6 ? 'bg-brand'      :
                    c.avg >= 4 ? 'bg-yellow-500' : 'bg-red-500';

                return (
                    <div key={c.id} data-testid={`criteria-row-${c.id}`}>
                        <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-gray-800 dark:text-gray-200">{c.label}</span>
                            <span className="tabular-nums">
                                <strong className="text-gray-850 dark:text-white">{c.avg.toFixed(1)}</strong>
                                <span className="text-gray-400 dark:text-gray-500"> / 10</span>
                                <span className="text-[10px] text-gray-400 ml-2">({c.count})</span>
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colorClass} rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
