import { useEffect, useState, useMemo } from 'react';

/**
 * CompetitorBenchmark — shows how this venue ranks vs others in the same
 * location/neighbourhood.
 *
 * Pub Pro: a basic "you're in the top X% of your area" band (anonymised).
 * Pub Plus: full leaderboard with names + scores.
 */
export default function CompetitorBenchmark({ db, venue, showFullLeaderboard }) {
    const [neighbours, setNeighbours] = useState([]);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        if (!venue?.location) { setLoading(false); return; }
        setLoading(true);
        db.collection('pubs')
            .where('location', '==', venue.location)
            .limit(40)
            .get()
            .then(snap => {
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setNeighbours(list);
            })
            .catch(() => setNeighbours([]))
            .finally(() => setLoading(false));
    }, [db, venue?.location, venue?.id]);

    const sorted = useMemo(() => {
        return [...neighbours]
            .filter(n => typeof n.avgScore === 'number' || typeof n.score === 'number')
            .map(n => ({ ...n, score: Number(n.avgScore ?? n.score ?? 0) }))
            .sort((a, b) => b.score - a.score);
    }, [neighbours]);

    const myIndex = sorted.findIndex(n => n.id === venue?.id);
    const myRank  = myIndex >= 0 ? myIndex + 1 : null;
    const total   = sorted.length;

    if (loading) {
        return <div className="p-6 text-xs text-gray-500 italic" data-testid="competitor-loading">Comparing with neighbouring pubs…</div>;
    }

    if (total < 2) {
        return (
            <div className="p-6 text-xs text-gray-500 italic" data-testid="competitor-empty">
                Not enough pubs in <strong>{venue?.location || 'your area'}</strong> yet
                for a benchmark. Encourage your locals to add nearby pubs to spice up
                the leaderboard!
            </div>
        );
    }

    if (!showFullLeaderboard) {
        // Pub Pro tier — show position band only
        const percentile = myRank ? Math.round((1 - (myRank - 1) / total) * 100) : null;
        return (
            <div className="p-5 space-y-3" data-testid="competitor-basic">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Local ranking · {venue?.location}
                </p>
                {myRank ? (
                    <>
                        <p className="text-3xl font-black text-gray-850 dark:text-white">
                            #{myRank}
                            <span className="text-base font-normal text-gray-400"> of {total}</span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            You&apos;re in the <strong>top {100 - percentile + 1}%</strong> of pubs in
                            this area. Upgrade to <strong>Pub Plus</strong> to see the full leaderboard
                            and benchmark against named competitors on every criterion.
                        </p>
                    </>
                ) : (
                    <p className="text-xs text-gray-500 italic">Add your average score by getting your first reviews and we&apos;ll position you.</p>
                )}
            </div>
        );
    }

    // Pub Plus tier — full leaderboard
    return (
        <div className="p-5" data-testid="competitor-full">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                {venue?.location} · top 10 pubs
            </p>
            <ol className="space-y-1">
                {sorted.slice(0, 10).map((p, i) => {
                    const isMe = p.id === venue?.id;
                    return (
                        <li
                            key={p.id}
                            data-testid={`competitor-row-${p.id}`}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs ${
                                isMe ? 'bg-brand text-white font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                            }`}
                        >
                            <span className="tabular-nums opacity-70 w-6">#{i + 1}</span>
                            <span className="flex-1 truncate">{p.name || 'Unnamed pub'}</span>
                            <span className="tabular-nums font-bold">{p.score.toFixed(1)}</span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
