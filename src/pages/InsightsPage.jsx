import React, { useMemo } from 'react';

export default function InsightsPage({ pubs, scores, users, criteria }) {
    // Guard all props against undefined
    const safePubs = pubs || [];
    const safeScores = scores || {};
    const safeUsers = users || {};
    const safeCriteria = criteria || [];

    const analytics = useMemo(() => {
        let stats = { totalRatings: 0, divisivePubs: [], harshCritics: [], categoryWinners: {} };
        const userAverages = {};
        const pubVariances = [];

        safePubs.forEach(pub => {
            const pubScores = safeScores[pub.id] || {};
            let allPubValues = [];
            Object.entries(pubScores).forEach(([critId, critScores]) => {
                const criterion = safeCriteria.find(c => c.id === critId);
                if (!criterion) return;
                let critValues = [];
                (critScores || []).forEach(score => {
                    stats.totalRatings++;
                    if (score.type === 'scale' && score.value !== null) {
                        critValues.push(score.value);
                        allPubValues.push(score.value);
                        if (!userAverages[score.userId]) userAverages[score.userId] = { total: 0, count: 0 };
                        userAverages[score.userId].total += score.value;
                        userAverages[score.userId].count++;
                    }
                });
                if (critValues.length > 0) {
                    const avg = critValues.reduce((a, b) => a + b, 0) / critValues.length;
                    if (!stats.categoryWinners[critId] || avg > stats.categoryWinners[critId].score) {
                        stats.categoryWinners[critId] = { pubName: pub.name, score: avg };
                    }
                }
            });
            if (allPubValues.length > 2) {
                const mean = allPubValues.reduce((a, b) => a + b, 0) / allPubValues.length;
                const variance = allPubValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allPubValues.length;
                pubVariances.push({ name: pub.name, variance, mean });
            }
        });

        stats.divisivePubs = pubVariances.sort((a, b) => b.variance - a.variance).slice(0, 3);
        stats.harshCritics = Object.entries(userAverages)
            .map(([uid, data]) => ({ uid, avg: data.total / data.count, count: data.count }))
            .filter(u => u.count > 5)
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 3);
        return stats;
    }, [safePubs, safeScores, safeCriteria]);

    const getUser = (uid) => {
        const u = safeUsers[uid];
        return u?.nickname || u?.displayName || u?.email || 'Unknown User';
    };

    const cardStyle = {
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-md)'
    };

    return (
        <div style={{ maxWidth: '56rem', margin: '0 auto' }} className="space-y-8 animate-fadeIn pb-20">
            <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Group Insights</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Deep data analytics based on {analytics.totalRatings} individual data points.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-6)' }}>

                {/* Harsh Critics */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Harshest Critics</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Members with the lowest average scores (min. 6 ratings).</p>
                    {analytics.harshCritics.length === 0 ? (
                        <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>Not enough data yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {analytics.harshCritics.map((critic, i) => (
                                <div key={critic.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <span style={{ fontSize: 'var(--text-lg)' }}>{['1st','2nd','3rd'][i]}</span>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>{getUser(critic.uid)}</p>
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{critic.count} ratings</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 'var(--text-xl)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--color-brand)' }}>{critic.avg.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Most Divisive */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Most Divisive Pubs</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Highest variance in ratings - love it or hate it.</p>
                    {analytics.divisivePubs.length === 0 ? (
                        <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>Not enough data yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {analytics.divisivePubs.map((pub, i) => (
                                <div key={pub.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <span style={{ fontSize: 'var(--text-lg)' }}>{['#1','#2','#3'][i]}</span>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>{pub.name}</p>
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>avg {pub.mean.toFixed(1)}</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, background: 'var(--color-brand-highlight)', color: 'var(--color-brand)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-full)' }}>variance {pub.variance.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Champions */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>Category Champions</h3>
                {Object.keys(analytics.categoryWinners).length === 0 ? (
                    <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>Not enough data yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--space-4)' }}>
                        {Object.entries(analytics.categoryWinners).map(([critId, winner]) => {
                            const criterion = safeCriteria.find(c => c.id === critId);
                            return (
                                <div key={critId} style={{ background: 'var(--color-brand-highlight)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--color-brand-border)' }}>
                                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>{criterion?.name || critId}</p>
                                    <p style={{ fontWeight: 900, color: 'var(--color-text)', fontSize: 'var(--text-sm)', lineHeight: 1.3 }}>{winner.pubName}</p>
                                    <p style={{ fontSize: 'var(--text-xl)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--color-brand)', marginTop: 'var(--space-1)' }}>{winner.score.toFixed(1)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
