import React from 'react';
import {
    MapPin,
    Star,
    Edit2,
    Trash2,
    Clock,
    Camera,
    Users,
    Beer,
    Compass,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { getLiveOpeningStatus } from '../../services/pubEnrichmentService';
import LiveBusyGraph from './LiveBusyGraph';

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
    rank = null,
    onViewDetail,
    onRate,
    onOpenStreetView,
    canManageGroup,
    onEdit,
    onDelete,
}) {
    const isVisited = pub.status === 'visited' || (pub.ratingCount && pub.ratingCount > 0);
    const tier = getTierBadge(pub.avgScore || 0, pub.ratingCount || 0);
    const liveStatus = getLiveOpeningStatus(pub.openingHours);

    return (
        <div
            onClick={() => onViewDetail(pub)}
            className="card-fun flex flex-col group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
        >
            {/* Card Cover Photo with Floating Badges & Street View Action */}
            <div className="relative h-48 w-full shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 border-b border-[var(--color-border)] flex items-center justify-center text-4xl">
                {pub.photoURL ? (
                    <img
                        src={pub.photoURL}
                        alt={pub.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
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
                        className="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-all duration-700 group-hover:scale-108"
                        loading="lazy"
                    />
                )}

                {/* Subtle scrim gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-black/30 to-black/20 pointer-events-none" />

                {/* Top Row: Tier / Rank Medal + Pint Price */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-1.5">
                        {rank && rank <= 3 && (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg border border-white/20">
                                #{rank}
                            </span>
                        )}
                        <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5 ${tier.badgeClass}`}>
                            <span>{tier.emoji}</span>
                            <span>{tier.label}</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {pub.pintPrice && (
                            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-950/85 text-amber-400 border border-white/10 backdrop-blur-md shadow-md">
                                £{pub.pintPrice.toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Street View Quick Peek Button (Hover Trigger on Photo) */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenStreetView) onOpenStreetView(pub);
                        else onViewDetail(pub);
                    }}
                    className="absolute top-12 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md transition-all opacity-90 hover:opacity-100 hover:scale-110 z-10 cursor-pointer"
                    title="View 360° Street View Facade"
                >
                    <Camera className="w-4 h-4 text-amber-400" />
                </button>

                {/* Bottom Photo Overlay: Live Opening Status */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
                    <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border shadow-sm flex items-center gap-1.5 ${
                        liveStatus.badgeType === 'open'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                            : liveStatus.badgeType === 'closing-soon'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                            : 'bg-slate-950/80 text-slate-300 border-slate-700/50'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            liveStatus.badgeType === 'open'
                                ? 'bg-emerald-400 animate-pulse'
                                : liveStatus.badgeType === 'closing-soon'
                                ? 'bg-amber-400 animate-ping'
                                : 'bg-slate-500'
                        }`} />
                        <span>{liveStatus.statusText}</span>
                    </div>

                    {pub.busyStatus && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/75 text-amber-300 backdrop-blur-md border border-white/10">
                            {pub.busyStatus === 'packed' ? '🔥 Packed' : pub.busyStatus === 'lively' ? '🍻 Lively' : '😴 Quiet'}
                        </span>
                    )}
                </div>
            </div>

            {/* Card Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display text-xl sm:text-2xl font-black text-[var(--color-text)] group-hover:text-amber-500 transition-colors truncate">
                                {pub.name}
                            </h3>
                        </div>

                        {/* Subtitle: Operator / Brewery & Location */}
                        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5 truncate font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>
                                {pub.operator ? `${pub.operator} · ` : ''}
                                {pub.location || pub.address || 'Central London'}
                            </span>
                        </p>
                    </div>

                    {/* Vibe Summary preview if present */}
                    {pub.vibeSummary && (
                        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 italic border-l-2 border-amber-500/40 pl-2 py-0.5 bg-[var(--color-surface-offset)]/50 rounded-r">
                            &ldquo;{pub.vibeSummary}&rdquo;
                        </p>
                    )}

                    {/* Amenity Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {pub.realAle && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                                🍺 Cask Ale
                            </span>
                        )}
                        {pub.amenities?.hasBeerGarden && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border)]">
                                ☀️ Garden
                            </span>
                        )}
                        {pub.amenities?.isDogFriendly && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border)]">
                                🐶 Dogs
                            </span>
                        )}
                        {pub.amenities?.servesFood && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold border border-[var(--color-border)]">
                                🍔 Food
                            </span>
                        )}
                    </div>

                    {/* Today's Traffic Mini Sparkline */}
                    <div className="pt-2">
                        <LiveBusyGraph busyStatus={pub.busyStatus} compact={true} />
                    </div>
                </div>

                {/* Card Footer: Rating Verdict + Quick Actions */}
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
                            <div className="flex items-center gap-1.5 text-amber-500">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">Unrated Hit List</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => onRate(pub)}
                            className="btn-fun-primary !py-1.5 !px-3.5 !text-xs shadow-md font-black flex items-center gap-1"
                            title="Score and review this pub"
                        >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Rate</span>
                        </button>

                        {canManageGroup && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onEdit(pub)}
                                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition"
                                    title="Edit pub"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(pub.id)}
                                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
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
