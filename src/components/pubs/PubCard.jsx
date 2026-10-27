import React from 'react';
import {
    MapPin,
    Star,
    Edit2,
    Trash2,
    Beer,
    Sparkles,
    Flame
} from 'lucide-react';

function getTierBadge(avg, count) {
    if (count === 0 || avg === 0) {
        return { 
            label: 'Hit List', 
            badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700',
            emoji: '🎯'
        };
    }
    if (avg >= 9.0) {
        return { 
            label: 'Legendary', 
            badgeClass: 'badge-score-diamond',
            emoji: '👑'
        };
    }
    if (avg >= 8.0) {
        return { 
            label: 'Elite Pour', 
            badgeClass: 'badge-score-gold',
            emoji: '⭐'
        };
    }
    if (avg >= 7.0) {
        return { 
            label: 'Solid Local', 
            badgeClass: 'badge-score-silver',
            emoji: '🍻'
        };
    }
    return { 
        label: 'Average', 
        badgeClass: 'badge-score-bronze',
        emoji: '🍺'
    };
}

export default function PubCard({
    pub,
    onViewDetail,
    onRate,
    canManageGroup,
    onEdit,
    onDelete,
}) {
    const isVisited = pub.status === 'visited' || (pub.ratingCount && pub.ratingCount > 0);
    const tier = getTierBadge(pub.avgScore || 0, pub.ratingCount || 0);

    const hasLiveBusy = pub.busyStatus && pub.busyStatusUpdatedAt &&
        (Date.now() - (pub.busyStatusUpdatedAt?.toMillis ? pub.busyStatusUpdatedAt.toMillis() : Date.now())) < 3 * 60 * 60 * 1000;

    return (
        <div
            onClick={() => onViewDetail(pub)}
            className="card-fun flex flex-col group cursor-pointer"
        >
            {/* Card Cover Photo with Floating Badges */}
            <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 border-b border-[var(--color-border)] flex items-center justify-center text-4xl">
                {pub.photoURL ? (
                    <img
                        src={pub.photoURL}
                        alt={pub.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                        loading="lazy"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80';
                        }}
                    />
                ) : (
                    <img
                        src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80"
                        alt={pub.name}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-all duration-500 group-hover:scale-108"
                        loading="lazy"
                    />
                )}

                {/* Subtle scrim gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-black/20 to-transparent pointer-events-none" />

                {/* Top Floating Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5 ${tier.badgeClass}`}>
                        <span>{tier.emoji}</span>
                        <span>{tier.label}</span>
                    </span>

                    {pub.pintPrice && (
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-950/80 text-amber-400 border border-white/10 backdrop-blur-md shadow-md">
                            £{pub.pintPrice.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Live Status indicator */}
                {hasLiveBusy && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${
                            pub.busyStatus === 'packed' ? 'bg-red-500' : pub.busyStatus === 'lively' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`} />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                            {pub.busyStatus}
                        </span>
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                    <h3 className="font-display text-xl sm:text-2xl font-black text-[var(--color-text)] group-hover:text-amber-500 transition-colors truncate">
                        {pub.name}
                    </h3>

                    <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{pub.location || pub.address || 'Central London'}</span>
                    </p>

                    {/* Fun Amenity Chips */}
                    {pub.amenities && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {pub.amenities.isDogFriendly && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border)]">
                                    🐶 Dogs
                                </span>
                            )}
                            {pub.amenities.hasBeerGarden && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border)]">
                                    ☀️ Garden
                                </span>
                            )}
                            {pub.amenities.hasSportsTv && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border)]">
                                    📺 Sports
                                </span>
                            )}
                            {pub.amenities.servesFood && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border)]">
                                    🍔 Food
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Card Bottom: Score & Rate Button */}
                <div className="pt-3.5 border-t border-[var(--color-divider)] flex items-center justify-between gap-2">
                    <div>
                        {isVisited && pub.ratingCount > 0 ? (
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-display text-2xl font-black text-[var(--color-text)] tabular-nums">
                                    ★ {pub.avgScore ? pub.avgScore.toFixed(1) : '—'}
                                </span>
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                    ({pub.ratingCount} {pub.ratingCount === 1 ? 'rating' : 'ratings'})
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5" />
                                <span>Unrated</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => onRate(pub)}
                            className="btn-fun-primary !py-1.5 !px-3.5 !text-xs"
                            title="Rate this pub"
                        >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Rate</span>
                        </button>

                        {canManageGroup && (
                            <>
                                <button
                                    onClick={() => onEdit(pub)}
                                    className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition"
                                    title="Edit pub"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onDelete(pub.id)}
                                    className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
                                    title="Delete pub"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
