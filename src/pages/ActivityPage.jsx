import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
    Activity,
    Beer,
    Award,
    Compass,
    Sparkles,
    Calendar,
    MessageSquare,
    Clock,
    Flame,
    Users,
    Plus,
    CheckCircle2
} from 'lucide-react';
import { useUI } from '../context/UIContext';

export default function ActivityPage({ db, groupId, user, pubs = [], allUsers = {} }) {
    const { setPage } = useUI();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!groupId || !db) {
            setLoading(false);
            return;
        }

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
                console.error('Error fetching activities:', err);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [db, groupId]);

    const getActivityBadge = (type) => {
        switch (type) {
            case 'rating':
                return {
                    icon: Beer,
                    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
                    label: 'Rating'
                };
            case 'badge':
                return {
                    icon: Award,
                    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
                    label: 'Achievement'
                };
            case 'crawl':
                return {
                    icon: Compass,
                    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
                    label: 'Trail'
                };
            default:
                return {
                    icon: Sparkles,
                    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
                    label: 'Activity'
                };
        }
    };

    const crewMembers = Object.values(allUsers || {});

    return (
        <div className="w-full space-y-8 animate-fadeIn pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[var(--color-divider)] pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                            Live Group Feed
                        </span>
                    </div>
                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
                        Taproom Chronicle
                    </h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        Real-time ratings, honors, and pub crawls happening across your collective.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setPage('pubs')}
                        className="px-4 py-2 rounded-xl bg-[var(--color-brand)] text-[var(--color-text-inverse)] font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log a Review</span>
                    </button>
                    <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Live Stream</span>
                    </div>
                </div>
            </div>

            {/* Main Content Layout: Stream on Left, Tasting Crew & Stats on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left: Activities Stream (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                            Recent Collective Activity
                        </span>
                        <span className="text-xs text-[var(--color-text-faint)]">
                            {activities.length} {activities.length === 1 ? 'event' : 'events'} logged
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center flex flex-col items-center justify-center animate-pulse">
                            <Beer className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
                            <p className="text-sm font-bold text-[var(--color-text-muted)]">
                                Tuning in to the taproom…
                            </p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="p-8 sm:p-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center space-y-4">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center text-3xl">
                                🍺
                            </div>
                            <div className="space-y-1.5 max-w-md mx-auto">
                                <h3 className="font-display font-bold text-lg text-[var(--color-text)]">
                                    Quiet in the Snug
                                </h3>
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                    No live updates have been registered yet. Whenever anyone in your group rates a pub, plans a crawl route, or logs pint prices, it will appear here instantly.
                                </p>
                            </div>
                            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={() => setPage('pubs')}
                                    className="px-4 py-2 rounded-xl bg-[var(--color-brand)] text-[var(--color-text-inverse)] font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Rate a Pub Now</span>
                                </button>
                                <button
                                    onClick={() => setPage('crawl')}
                                    className="px-4 py-2 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-xs transition flex items-center gap-1.5"
                                >
                                    <Compass className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Plan a Crawl</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activities.map(act => {
                                const badge = getActivityBadge(act.type);
                                const Icon = badge.icon;
                                const timeAgo = act.timestamp?.toDate
                                    ? formatDistanceToNow(act.timestamp.toDate(), { addSuffix: true })
                                    : 'Just now';

                                return (
                                    <div
                                        key={act.id}
                                        className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand)]/50 transition flex items-start gap-3.5 group shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                                            <Icon className="w-5 h-5 text-amber-500" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <p className="text-xs sm:text-sm text-[var(--color-text)]">
                                                    <strong className="font-bold text-[var(--color-text)] mr-1">
                                                        {act.userName || 'Member'}
                                                    </strong>
                                                    {act.type === 'rating' && (
                                                        <span>
                                                            rated <strong className="text-[var(--color-brand)] font-semibold">{act.pubName}</strong>
                                                        </span>
                                                    )}
                                                    {act.type === 'badge' && (
                                                        <span>
                                                            unlocked the <strong className="text-purple-400 font-semibold">{act.badgeName}</strong> badge! 🏆
                                                        </span>
                                                    )}
                                                    {act.type === 'crawl' && (
                                                        <span>
                                                            charted a new crawl with <strong className="text-blue-400 font-semibold">{act.pubCount} stops</strong> 🗺️
                                                        </span>
                                                    )}
                                                    {!['rating', 'badge', 'crawl'].includes(act.type) && (
                                                        <span>performed an action in the group</span>
                                                    )}
                                                </p>
                                                <span className="text-[10px] text-[var(--color-text-faint)] font-bold shrink-0">
                                                    {timeAgo}
                                                </span>
                                            </div>

                                            {act.type === 'rating' && act.ratingCount && (
                                                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                                                    Scored {act.ratingCount} criteria.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Tasting Crew & Group Lore (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Tasting Crew Card */}
                    <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)]">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-indigo-400" />
                                <span>The Tasting Crew</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                                {crewMembers.length || 1} Members
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {crewMembers.length === 0 ? (
                                <div className="p-3 rounded-xl bg-[var(--color-surface-2)] text-xs text-[var(--color-text-muted)]">
                                    No members listed yet.
                                </div>
                            ) : (
                                crewMembers.slice(0, 6).map((m, idx) => (
                                    <div
                                        key={m.uid || idx}
                                        className="p-2.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">
                                                {(m.displayName || m.email || 'M').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-[var(--color-text)] truncate">
                                                {m.displayName || m.email?.split('@')[0] || 'Member'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Active
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Pub Crawl Quick Access */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[var(--color-surface)] to-[var(--color-surface)] border border-amber-500/20 space-y-3">
                        <div className="flex items-center gap-2">
                            <Compass className="w-5 h-5 text-amber-500" />
                            <h3 className="font-display font-bold text-sm text-[var(--color-text)]">
                                Ready for the next tavern run?
                            </h3>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                            Connect multiple high-ranking watering holes into an optimized walking crawl with live GPS waypoints.
                        </p>
                        <button
                            onClick={() => setPage('crawl')}
                            className="w-full py-2.5 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] hover:text-[var(--color-brand)] transition flex items-center justify-center gap-2"
                        >
                            <span>Open Crawl Planner</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
