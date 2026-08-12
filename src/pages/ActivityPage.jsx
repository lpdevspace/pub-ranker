import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityPage({ db, groupId, user }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!groupId) return;

        const unsubscribe = db.collection('groups')
            .doc(groupId)
            .collection('activities')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                const acts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setActivities(acts);
                setLoading(false);
            }, err => {
                console.error("Error fetching activities:", err);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [db, groupId]);

    const getActivityMessage = (act) => {
        if (act.type === 'rating') {
            return (
                <span>
                    rated <span className="font-bold text-text">{act.pubName}</span>
                </span>
            );
        }
        if (act.type === 'badge') {
            return (
                <span>
                    unlocked the <span className="font-bold text-brand">{act.badgeName}</span> badge! 🏆
                </span>
            );
        }
        if (act.type === 'crawl') {
            return (
                <span>
                    created a new pub crawl with <span className="font-bold text-brand">{act.pubCount} stops</span>! 🗺️
                </span>
            );
        }
        return <span>did something cool.</span>;
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn pb-24">
            <div className="mb-8">
                <h2 className="font-display text-4xl font-black text-text mb-2">⚡ Activity Feed</h2>
                <p className="font-body text-sm font-semibold text-text-muted">
                    See what your group has been up to in real-time.
                </p>
            </div>

            {loading ? (
                <div className="card-premium p-12 text-center flex flex-col items-center justify-center animate-pulse">
                    <div className="text-4xl mb-4">🍻</div>
                    <p className="font-bold text-text-muted">Loading feed...</p>
                </div>
            ) : activities.length === 0 ? (
                <div className="card-premium p-12 text-center flex flex-col items-center justify-center">
                    <div className="text-5xl mb-4 opacity-50">🦗</div>
                    <h3 className="font-display text-xl font-bold text-text mb-2">It's quiet here...</h3>
                    <p className="font-body text-sm text-text-muted max-w-sm mx-auto">
                        No activity yet. Go rate a pub or unlock a badge to kick things off!
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activities.map(act => (
                        <div key={act.id} className="card-premium p-4 sm:p-6 flex items-start gap-4 bg-surface-offset border border-border hover:border-brand/30 transition-colors">
                            {act.userAvatar ? (
                                <img src={act.userAvatar} alt={act.userName} className="w-12 h-12 rounded-full object-cover shadow-sm border border-border" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white font-black text-lg shadow-sm">
                                    {(act.userName || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2 mb-1">
                                    <h4 className="font-bold text-text truncate">
                                        {act.userName} {getActivityMessage(act)}
                                    </h4>
                                    <span className="text-[10px] sm:text-xs font-semibold text-text-muted whitespace-nowrap">
                                        {act.timestamp ? formatDistanceToNow(act.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                    </span>
                                </div>
                                {act.type === 'rating' && act.ratingCount && (
                                    <p className="text-sm font-semibold text-text-muted mt-1">
                                        Updated {act.ratingCount} {act.ratingCount === 1 ? 'criterion' : 'criteria'}.
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
