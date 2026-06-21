import { useMemo } from 'react';

/**
 * TrendChart — last-30-days avg score vs prior-30-days, plus a sparkline of
 * weekly buckets. Pure SVG so we don't add a chart library dependency just
 * for one widget.
 */

function bucketByWeek(scores, weeks = 12) {
    const now    = Date.now();
    const week   = 7 * 24 * 60 * 60 * 1000;
    const oldest = now - weeks * week;

    const buckets = Array.from({ length: weeks }, () => ({ sum: 0, count: 0 }));
    for (const s of scores) {
        const ts = s.createdAt?.toDate ? s.createdAt.toDate().getTime()
                  : s.createdAt?.seconds ? s.createdAt.seconds * 1000
                  : typeof s.createdAt === 'string' ? Date.parse(s.createdAt) : 0;
        if (!ts || ts < oldest) continue;
        const idx = Math.min(weeks - 1, Math.floor((ts - oldest) / week));
        buckets[idx].sum   += Number(s.value) || 0;
        buckets[idx].count += 1;
    }
    return buckets.map(b => b.count > 0 ? b.sum / b.count : null);
}

export default function TrendChart({ scores, loading }) {
    const stats = useMemo(() => {
        if (!scores?.length) return null;
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        let recentSum = 0, recentN = 0, priorSum = 0, priorN = 0;
        for (const s of scores) {
            const ts = s.createdAt?.toDate ? s.createdAt.toDate().getTime()
                      : s.createdAt?.seconds ? s.createdAt.seconds * 1000
                      : typeof s.createdAt === 'string' ? Date.parse(s.createdAt) : 0;
            if (!ts) continue;
            const ageDays = (now - ts) / day;
            const val = Number(s.value) || 0;
            if (ageDays <= 30)                 { recentSum += val; recentN++; }
            else if (ageDays <= 60)            { priorSum  += val; priorN++; }
        }

        const recentAvg = recentN ? recentSum / recentN : 0;
        const priorAvg  = priorN  ? priorSum  / priorN  : 0;
        const delta     = recentAvg - priorAvg;

        return {
            recentAvg, recentN, priorAvg, priorN, delta,
            buckets: bucketByWeek(scores, 12),
        };
    }, [scores]);

    if (loading) return <div className="p-6 text-xs text-gray-500 italic" data-testid="trend-chart-loading">Loading trends…</div>;
    if (!stats || stats.recentN + stats.priorN === 0) {
        return (
            <div className="p-6 text-xs text-gray-500 italic" data-testid="trend-chart-empty">
                Trends will appear once you have 60 days of scoring history.
            </div>
        );
    }

    const validBuckets = stats.buckets.filter(b => b !== null);
    const minB = validBuckets.length ? Math.min(...validBuckets) : 0;
    const maxB = validBuckets.length ? Math.max(...validBuckets) : 10;
    const range = Math.max(1, maxB - minB);

    const w = 320, h = 60;
    const step = w / Math.max(1, stats.buckets.length - 1);

    const points = stats.buckets.map((v, i) => {
        if (v === null) return null;
        const x = i * step;
        const y = h - ((v - minB) / range) * (h - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean).join(' ');

    const deltaColor = stats.delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const deltaSign  = stats.delta >= 0 ? '+' : '';

    return (
        <div className="p-5 space-y-3" data-testid="trend-chart">
            <div className="flex justify-between items-baseline">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Last 30 days</p>
                    <p className="text-2xl font-black text-gray-850 dark:text-white tabular-nums">
                        {stats.recentAvg.toFixed(1)}<span className="text-xs font-normal text-gray-400"> / 10</span>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">vs prior 30</p>
                    <p className={`text-base font-black ${deltaColor} tabular-nums`}>
                        {deltaSign}{stats.delta.toFixed(2)}
                    </p>
                </div>
            </div>

            <svg
                viewBox={`0 0 ${w} ${h}`}
                width="100%" height={h}
                role="img"
                aria-label="12-week score trend"
                style={{ overflow: 'visible' }}
            >
                {points && (
                    <polyline
                        points={points}
                        fill="none"
                        stroke="var(--color-brand)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                {stats.buckets.map((v, i) => {
                    if (v === null) return null;
                    const x = i * step;
                    const y = h - ((v - minB) / range) * (h - 6) - 3;
                    return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--color-brand)" />;
                })}
            </svg>

            <div className="flex justify-between text-[9px] text-gray-400 tabular-nums">
                <span>12 wks ago</span>
                <span>{stats.recentN} reviews · last 30d</span>
                <span>Now</span>
            </div>
        </div>
    );
}
