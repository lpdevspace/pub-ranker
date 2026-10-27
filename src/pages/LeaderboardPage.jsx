import React, { useState, useMemo, useEffect } from 'react';
import {
    Trophy,
    Award,
    Flame,
    Gem,
    Target,
    Crown,
    Medal,
    Swords,
    ChevronRight,
    X,
    Star,
    Beer,
    MapPin,
    ArrowRight
} from 'lucide-react';
import { SAMPLE_CRAWLS } from '../data/sampleTavernData';

/* ── Category Champions ─────────────────────────────────────────── */
function CategoryChampions({ rankedPubs, safeScores, safeCriteria }) {
    if (rankedPubs.length === 0) return null;

    const mostVisited = [...rankedPubs].sort((a, b) => b.ratingCount - a.ratingCount)[0];

    const perfectScores = {};
    rankedPubs.forEach(pub => {
        let tens = 0;
        safeCriteria.filter(c => c.type === 'scale').forEach(c => {
            (safeScores[pub.id]?.[c.id] || []).forEach(s => {
                if (s.value === 10) tens++;
            });
        });
        perfectScores[pub.id] = tens;
    });
    const mostPerfect = [...rankedPubs].sort((a, b) => (perfectScores[b.id] || 0) - (perfectScores[a.id] || 0))[0];

    const consistency = {};
    rankedPubs.forEach(pub => {
        const allVals = [];
        safeCriteria.filter(c => c.type === 'scale').forEach(c => {
            (safeScores[pub.id]?.[c.id] || []).forEach(s => {
                if (s.value != null && !isNaN(s.value)) allVals.push(s.value);
            });
        });
        if (allVals.length >= 3) {
            const mean = allVals.reduce((a, b) => a + b, 0) / allVals.length;
            const std = Math.sqrt(allVals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allVals.length);
            consistency[pub.id] = std;
        }
    });
    const consistentPubs = rankedPubs.filter(p => consistency[p.id] !== undefined);
    const mostConsistent = consistentPubs.length > 0 ? consistentPubs.sort((a, b) => consistency[a.id] - consistency[b.id])[0] : null;

    const hiddenGem = rankedPubs.filter(p => p.avgScore >= 7 && p.ratingCount <= 3).length > 0
        ? rankedPubs.filter(p => p.avgScore >= 7).sort((a, b) => a.ratingCount - b.ratingCount)[0] : null;

    const champions = [
        { key: 'top', icon: Crown, title: 'Top Rated', desc: 'Highest Average', pub: rankedPubs[0], stat: rankedPubs[0]?.avgScore.toFixed(1), statLabel: 'avg', color: 'text-amber-500' },
        { key: 'visited', icon: Flame, title: 'Most Visited', desc: 'Most Ratings', pub: mostVisited, stat: mostVisited?.ratingCount, statLabel: 'ratings', color: 'text-orange-500' },
        { key: 'perfect', icon: Trophy, title: 'Perfection', desc: 'Most Perfect 10s', pub: mostPerfect, stat: perfectScores[mostPerfect?.id] || 0, statLabel: 'tens', color: 'text-yellow-500' },
        mostConsistent && { key: 'consistent', icon: Target, title: 'Consistent', desc: 'Lowest Variance', pub: mostConsistent, stat: consistency[mostConsistent?.id]?.toFixed(1), statLabel: 'variance', color: 'text-emerald-500' },
        hiddenGem && { key: 'gem', icon: Gem, title: 'Hidden Gem', desc: 'High Score, Low Crowd', pub: hiddenGem, stat: hiddenGem?.avgScore.toFixed(1), statLabel: 'avg', color: 'text-indigo-400' },
    ].filter(Boolean);

    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                Category Champions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {champions.map(champ => {
                    const Icon = champ.icon;
                    return (
                        <div
                            key={champ.key}
                            className="card-tavern p-4 flex flex-col items-center text-center border border-[var(--color-border)] hover:border-[var(--color-brand)]/50 transition"
                        >
                            <div className="relative mb-2.5">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--color-surface-offset)] border border-[var(--color-border)] flex items-center justify-center text-xl font-bold bg-amber-500/10 text-amber-500">
                                    {champ.pub?.photoURL ? (
                                        <img
                                            src={champ.pub.photoURL}
                                            alt={champ.pub.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : null}
                                    <span className="select-none">🍺</span>
                                </div>
                                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                    <Icon className={`w-3.5 h-3.5 ${champ.color}`} />
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider">
                                {champ.title}
                            </span>
                            <h4 className="font-display text-sm font-normal text-[var(--color-text)] truncate w-full mt-0.5 mb-1.5">
                                {champ.pub?.name || '—'}
                            </h4>
                            <div className="mt-auto">
                                <span className="font-display text-xl font-normal text-[var(--color-brand)] tabular-nums leading-none">
                                    {champ.stat}
                                </span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] ml-1">
                                    {champ.statLabel}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Tavern Podium ─────────────────────────────────────────────── */
function Podium({ items, type, onSelect }) {
    if (items.length === 0) return null;
    const order = [items[1], items[0], items[2]].filter(Boolean);
    const cfg = {
        0: { h: 'h-24 sm:h-28', label: '2nd Place', tierClass: 't-silver text-stone-900', badge: '🥈' },
        1: { h: 'h-32 sm:h-36', label: 'Champion', tierClass: 't-gold text-stone-900', badge: '👑' },
        2: { h: 'h-16 sm:h-20', label: '3rd Place', tierClass: 't-bronze text-white', badge: '🥉' }
    };
    const slotIdx = [items[1] ? 0 : null, 1, items[2] ? 2 : null];

    return (
        <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2 border-b border-[var(--color-divider)]">
            {order.map((item, idx) => {
                const slot = slotIdx[idx];
                if (slot === null || !item) return null;
                const config = cfg[slot];

                const isMember = type === 'members';
                const name = isMember ? (item.user?.nickname || item.user?.displayName || item.user?.email?.split('@')[0] || 'Member') : item.name;
                const img = isMember ? item.user?.avatarUrl : item.photoURL;
                const stat = isMember ? item.totalPoints : item.avgScore.toFixed(1);
                const statLabel = isMember ? 'pts' : 'rating';

                return (
                    <div
                        key={item.id || item.uid}
                        className={`flex flex-col items-center flex-1 max-w-[130px] ${isMember ? 'cursor-pointer hover:opacity-90' : ''}`}
                        onClick={() => isMember && onSelect && onSelect(item)}
                    >
                        {slot === 1 && (
                            <span className="text-2xl mb-1 animate-bounce">👑</span>
                        )}

                        <div className="relative mb-2">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[var(--color-surface-offset)] border-2 border-[var(--color-border)] shadow-md flex items-center justify-center font-black text-xl text-amber-500 bg-amber-500/10">
                                {img ? (
                                    <img
                                        src={img}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : null}
                                <span className="select-none">{name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="absolute -bottom-1 -right-1 text-sm">
                                {config.badge}
                            </span>
                        </div>

                        <p className="font-display text-sm font-normal text-[var(--color-text)] text-center truncate w-full px-1">
                            {name}
                        </p>
                        <p className="text-xs font-black text-[var(--color-brand)] mb-2 tabular-nums">
                            {stat} <span className="text-[9px] font-bold text-[var(--color-text-faint)]">{statLabel}</span>
                        </p>

                        <div className={`w-full ${config.h} rounded-t-2xl flex flex-col items-center justify-start pt-3 shadow-md ${config.tierClass}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">
                                {config.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Points Breakdown Bar ───────────────────────────────────────── */
function PointsBreakdown({ ratedCount, writtenReviews, pubsAdded, crawlsCreated, gamification }) {
    const ppp = gamification?.pointsPerPub || 5;
    const ppr = gamification?.pointsPerReview || 2;
    const ppa = gamification?.pointsPerAdd || 3;
    const ppc = gamification?.pointsPerCrawl || 5;

    const segments = [
        { label: 'Visits', value: ratedCount * ppp, color: 'bg-amber-500' },
        { label: 'Reviews', value: writtenReviews * ppr, color: 'bg-indigo-500' },
        { label: 'Pubs Added', value: pubsAdded * ppa, color: 'bg-emerald-500' },
        { label: 'Crawls', value: crawlsCreated * ppc, color: 'bg-purple-500' },
    ].filter(s => s.value > 0);

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return null;

    return (
        <div className="w-full space-y-1">
            <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 bg-[var(--color-surface-offset)]">
                {segments.map(seg => (
                    <div
                        key={seg.label}
                        className={seg.color}
                        style={{ width: `${(seg.value / total) * 100}%` }}
                        title={`${seg.label}: ${seg.value} pts`}
                    />
                ))}
            </div>
            <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-faint)] font-bold">
                {segments.map(seg => (
                    <span key={seg.label} className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${seg.color}`} />
                        <span>{seg.label}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ── Versus Mode Component ──────────────────────────────────────── */
function VersusMode({ pubs, scores, criteria }) {
    const visitedPubs = useMemo(() => {
        return pubs.filter(p => p.avgScore && p.avgScore > 0);
    }, [pubs]);

    const [pubAId, setPubAId] = useState(visitedPubs[0]?.id || '');
    const [pubBId, setPubBId] = useState(visitedPubs[1]?.id || '');

    const pubA = useMemo(() => pubs.find(p => p.id === pubAId), [pubs, pubAId]);
    const pubB = useMemo(() => pubs.find(p => p.id === pubBId), [pubs, pubBId]);

    const scaleCriteria = useMemo(() => criteria.filter(c => c.type === 'scale'), [criteria]);

    const getPubCriteriaAvg = (pubId, critId) => {
        const critScores = scores[pubId]?.[critId] || [];
        const valid = critScores.filter(s => s.value != null && !isNaN(s.value));
        if (valid.length === 0) return 0;
        return valid.reduce((sum, s) => sum + s.value, 0) / valid.length;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pub A Select */}
                <div className="card-tavern p-4 border border-[var(--color-border)] space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Corner 1 (Tavern A)
                    </label>
                    <select
                        value={pubAId}
                        onChange={e => setPubAId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-brand)] cursor-pointer"
                    >
                        {visitedPubs.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.avgScore ? p.avgScore.toFixed(1) : '—'})
                            </option>
                        ))}
                    </select>

                    {pubA && (
                        <div className="flex items-center gap-3 pt-2">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--color-surface-offset)] shrink-0">
                                {pubA.photoURL ? (
                                    <img src={pubA.photoURL} alt={pubA.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl">🍺</div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-display text-lg text-[var(--color-text)] leading-tight">{pubA.name}</h4>
                                <p className="text-xs text-[var(--color-text-muted)]">{pubA.location || 'Local Pub'}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pub B Select */}
                <div className="card-tavern p-4 border border-[var(--color-border)] space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Corner 2 (Tavern B)
                    </label>
                    <select
                        value={pubBId}
                        onChange={e => setPubBId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-brand)] cursor-pointer"
                    >
                        {visitedPubs.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.avgScore ? p.avgScore.toFixed(1) : '—'})
                            </option>
                        ))}
                    </select>

                    {pubB && (
                        <div className="flex items-center gap-3 pt-2">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--color-surface-offset)] shrink-0">
                                {pubB.photoURL ? (
                                    <img src={pubB.photoURL} alt={pubB.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl">🍺</div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-display text-lg text-[var(--color-text)] leading-tight">{pubB.name}</h4>
                                <p className="text-xs text-[var(--color-text-muted)]">{pubB.location || 'Local Pub'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Head-to-Head Comparison Table */}
            {pubA && pubB && (
                <div className="card-tavern p-5 sm:p-6 border border-[var(--color-border)] space-y-6">
                    {/* Overall Score Matchup */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
                        <div className="text-center flex-1">
                            <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Tavern A</span>
                            <p className="font-display text-3xl font-normal text-[var(--color-text)] tabular-nums mt-0.5">
                                {pubA.avgScore ? pubA.avgScore.toFixed(1) : '—'}
                            </p>
                        </div>

                        <div className="px-4 text-center">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-xs">
                                VS
                            </div>
                        </div>

                        <div className="text-center flex-1">
                            <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Tavern B</span>
                            <p className="font-display text-3xl font-normal text-[var(--color-text)] tabular-nums mt-0.5">
                                {pubB.avgScore ? pubB.avgScore.toFixed(1) : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Criteria Breakdown */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                            Criterion Breakdown
                        </h4>

                        <div className="space-y-3">
                            {scaleCriteria.map(c => {
                                const scoreA = getPubCriteriaAvg(pubA.id, c.id);
                                const scoreB = getPubCriteriaAvg(pubB.id, c.id);
                                const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'TIE';

                                return (
                                    <div key={c.id} className="p-3 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)]">
                                        <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text)] mb-2">
                                            <span className={`${winner === 'A' ? 'text-amber-500 font-extrabold' : ''}`}>
                                                {scoreA > 0 ? scoreA.toFixed(1) : '—'}
                                            </span>
                                            <span className="text-[var(--color-text-muted)]">{c.name}</span>
                                            <span className={`${winner === 'B' ? 'text-amber-500 font-extrabold' : ''}`}>
                                                {scoreB > 0 ? scoreB.toFixed(1) : '—'}
                                            </span>
                                        </div>

                                        {/* Dual Bar */}
                                        <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-surface)] gap-1">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    winner === 'A' ? 'bg-amber-500' : 'bg-stone-500'
                                                }`}
                                                style={{ width: `${(scoreA / 10) * 100}%` }}
                                            />
                                            <div
                                                className={`h-full rounded-full transition-all ml-auto ${
                                                    winner === 'B' ? 'bg-amber-500' : 'bg-stone-500'
                                                }`}
                                                style={{ width: `${(scoreB / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pint Price Comparison */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)] text-xs">
                        <span className="font-bold text-amber-500">
                            {pubA.pintPrice ? `£${pubA.pintPrice.toFixed(2)}` : 'No price recorded'}
                        </span>
                        <span className="font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-[10px]">
                            Pint Price Benchmark
                        </span>
                        <span className="font-bold text-amber-500">
                            {pubB.pintPrice ? `£${pubB.pintPrice.toFixed(2)}` : 'No price recorded'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Public Member Profile Modal ────────────────────────────────── */
function PublicProfileModal({ member, onClose, gamification }) {
    if (!member) return null;

    const { user, ratedCount, writtenReviews, pubsAdded, crawlsCreated, topPubs, totalPoints } = member;
    const displayName = user?.nickname || user?.displayName || user?.email?.split('@')[0] || 'Member';

    const badges = [
        { emoji: '🍺', title: 'First Pint', desc: 'Rated 1+ pubs', earned: ratedCount >= 1 },
        { emoji: '🏅', title: 'Tavern Regular', desc: 'Rated 10+ pubs', earned: ratedCount >= 10 },
        { emoji: '👑', title: 'Gold Master', desc: 'Rated 25+ pubs', earned: ratedCount >= 25 },
        { emoji: '✍️', title: 'Grand Critic', desc: '10+ notes left', earned: writtenReviews >= 10 },
        { emoji: '🗺️', title: 'Cartographer', desc: 'Added 5+ pubs', earned: pubsAdded >= 5 },
        { emoji: '🚶', title: 'Trail Master', desc: 'Created 2+ crawls', earned: crawlsCreated >= 2 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="card-tavern p-6 sm:p-8 max-w-md w-full relative border border-[var(--color-border)] shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--color-surface-offset)] border-2 border-[var(--color-border)] shadow-md mb-3">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-amber-500/10 text-amber-500">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h3 className="font-display text-2xl text-[var(--color-text)]">{displayName}</h3>
                    {user?.bio && (
                        <p className="text-xs text-[var(--color-text-muted)] italic mt-1 max-w-xs">
                            &ldquo;{user.bio}&rdquo;
                        </p>
                    )}

                    <div className="mt-3 px-3 py-1 rounded-full bg-[var(--color-brand)] text-stone-900 font-extrabold text-xs shadow-sm">
                        {totalPoints} Total Member Points
                    </div>
                </div>

                {/* Core Stats Row */}
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { label: 'Pubs Rated', val: ratedCount },
                        { label: 'Reviews', val: writtenReviews },
                        { label: 'Crawls', val: crawlsCreated }
                    ].map(st => (
                        <div key={st.label} className="p-2.5 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)] text-center">
                            <p className="font-display text-xl text-[var(--color-text)] tabular-nums">{st.val}</p>
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{st.label}</p>
                        </div>
                    ))}
                </div>

                {/* Badge Collection */}
                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider text-center">
                        Trophy Badges
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                        {badges.map((b, i) => (
                            <div
                                key={i}
                                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                                    b.earned
                                        ? 'bg-[var(--color-surface-offset)] border-amber-500/40 text-[var(--color-text)]'
                                        : 'bg-[var(--color-surface-offset)]/40 border-[var(--color-divider)] opacity-30 grayscale'
                                }`}
                            >
                                <span className="text-xl mb-1">{b.emoji}</span>
                                <span className="text-[10px] font-bold truncate w-full">{b.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top 3 Personal Pubs */}
                {topPubs && topPubs.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider text-center">
                            Member&apos;s Highest Rated
                        </h4>
                        <div className="space-y-1.5">
                            {topPubs.map((tp, idx) => (
                                <div key={tp.pubId} className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)] text-xs">
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="w-5 h-5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center text-[10px] font-bold shrink-0">
                                            #{idx + 1}
                                        </span>
                                        <span className="font-semibold text-[var(--color-text)] truncate">{tp.pub?.name}</span>
                                    </div>
                                    <span className="font-bold text-[var(--color-brand)] tabular-nums">{tp.avg.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Main Leaderboard Page Component ────────────────────────────── */
export default function LeaderboardPage({
    scores = {},
    users = [],
    pubs = [],
    criteria = [],
    db,
    groupId
}) {
    const [activeTab, setActiveTab] = useState('pubs'); // 'pubs' | 'members' | 'versus'
    const [selectedUserForProfile, setSelectedUserForProfile] = useState(null);
    const [gamification, setGamification] = useState({
        pointsPerPub: 5,
        pointsPerReview: 2,
        pointsPerAdd: 3,
        pointsPerCrawl: 5
    });
    const [crawlsList, setCrawlsList] = useState([]);

    const safePubs     = pubs || [];
    const safeScores   = scores || {};
    const safeUsers    = Array.isArray(users) ? Object.fromEntries(users.map(u => [u.uid || u.id, u])) : (users || {});
    const safeCriteria = criteria || [];

    useEffect(() => {
        if (!db) return;
        db.collection('global').doc('gamification').get()
            .then(doc => {
                if (doc.exists && doc.data()) {
                    setGamification(prev => ({ ...prev, ...doc.data() }));
                }
            })
            .catch(e => console.error(e));
    }, [db]);

    useEffect(() => {
        if (!groupId) return;
        if (groupId === 'demo-group') {
            setCrawlsList(SAMPLE_CRAWLS);
            return;
        }
        if (!db) return;
        const unsub = db.collection('crawls')
            .where('groupId', '==', groupId)
            .onSnapshot(snap => setCrawlsList(snap.docs.map(d => d.data())));
        return () => unsub();
    }, [db, groupId]);

    // Ranked Pubs
    const rankedPubs = useMemo(() => {
        const enriched = safePubs.map(pub => {
            let totalScore = 0;
            let count = 0;
            safeCriteria.filter(c => c.type === 'scale').forEach(c => {
                (safeScores[pub.id]?.[c.id] || []).forEach(s => {
                    if (s.value != null && !isNaN(s.value)) {
                        totalScore += s.value;
                        count++;
                    }
                });
            });
            return {
                ...pub,
                avgScore: count > 0 ? totalScore / count : 0,
                ratingCount: count
            };
        });
        return enriched.filter(p => p.ratingCount > 0).sort((a, b) => b.avgScore - a.avgScore);
    }, [safePubs, safeScores, safeCriteria]);

    // Ranked Members
    const rankedMembers = useMemo(() => {
        const stats = {};
        Object.keys(safeUsers).forEach(uid => {
            stats[uid] = {
                uid,
                user: safeUsers[uid],
                pubsRated: new Set(),
                perfectTens: 0,
                writtenReviews: 0,
                pubsAdded: 0,
                crawlsCreated: 0,
                personalPubScores: {}
            };
        });

        crawlsList.forEach(c => {
            if (c.createdBy && stats[c.createdBy]) stats[c.createdBy].crawlsCreated++;
        });

        safePubs.forEach(pub => {
            if (pub.addedBy && stats[pub.addedBy]) stats[pub.addedBy].pubsAdded++;
        });

        Object.entries(safeScores).forEach(([pubId, pubCriteria]) => {
            Object.entries(pubCriteria || {}).forEach(([, critScores]) => {
                (critScores || []).forEach(s => {
                    if (!stats[s.userId]) return;
                    const st = stats[s.userId];
                    st.pubsRated.add(pubId);
                    if (s.type === 'scale') {
                        if (s.value === 10) st.perfectTens++;
                        if (!st.personalPubScores[pubId]) st.personalPubScores[pubId] = { total: 0, count: 0 };
                        st.personalPubScores[pubId].total += s.value;
                        st.personalPubScores[pubId].count++;
                    }
                    if (s.type === 'text' && s.value?.trim()) st.writtenReviews++;
                });
            });
        });

        const ppp = gamification.pointsPerPub;
        const ppr = gamification.pointsPerReview;
        const ppa = gamification.pointsPerAdd;
        const ppc = gamification.pointsPerCrawl;

        return Object.values(stats).map(st => {
            st.ratedCount = st.pubsRated.size;
            st.totalPoints = (st.ratedCount * ppp) + (st.writtenReviews * ppr) + (st.pubsAdded * ppa) + (st.crawlsCreated * ppc);
            st.topPubs = Object.entries(st.personalPubScores)
                .map(([pid, data]) => ({
                    pubId: pid,
                    avg: data.total / data.count,
                    pub: safePubs.find(p => p.id === pid)
                }))
                .filter(x => x.pub)
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 3);
            return st;
        }).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [safeUsers, safePubs, safeScores, crawlsList, gamification]);

    return (
        <div className="w-full space-y-6 animate-fadeIn pb-24">
            {/* Header: Title and Subtitle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-divider)] pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">👑</span>
                        <h1 className="font-display text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight">
                            Rankings & Honors
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                        Recognizing the top watering holes, dedicated pint explorers, and head-to-head match-ups.
                    </p>
                </div>

                {/* Tab Switcher Pills */}
                <div className="flex items-center gap-1.5 bg-[var(--color-surface-2)] p-1.5 rounded-full border border-[var(--color-border)] shadow-sm">
                    <button
                        onClick={() => setActiveTab('pubs')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'pubs'
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Top Pubs</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'members'
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                        <Medal className="w-3.5 h-3.5" />
                        <span>Top Members</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('versus')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'versus'
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Versus Mode</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: Pub Leaderboard */}
            {activeTab === 'pubs' && (
                <div className="card-tavern p-5 sm:p-8 border border-[var(--color-border)] space-y-8">
                    <Podium items={rankedPubs.slice(0, 3)} type="pubs" />
                    <CategoryChampions rankedPubs={rankedPubs} safeScores={safeScores} safeCriteria={safeCriteria} />

                    <div className="space-y-3 pt-4 border-t border-[var(--color-divider)]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                            All Ranked Taverns
                        </h3>

                        <div className="space-y-2">
                            {rankedPubs.slice(3).map((pub, i) => (
                                <div
                                    key={pub.id}
                                    className="flex items-center gap-3.5 p-3 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)] hover:border-[var(--color-brand)]/40 transition"
                                >
                                    <span className="font-display text-base font-normal text-[var(--color-text-faint)] w-6 text-center tabular-nums">
                                        #{i + 4}
                                    </span>
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0 flex items-center justify-center text-sm">
                                        {pub.photoURL ? (
                                            <img
                                                src={pub.photoURL}
                                                alt={pub.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : null}
                                        <span className="select-none">🍺</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-display text-base font-normal text-[var(--color-text)] truncate">{pub.name}</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">{pub.ratingCount} group ratings</p>
                                    </div>
                                    <div className="font-display text-xl font-normal text-[var(--color-brand)] tabular-nums">
                                        {pub.avgScore.toFixed(1)}
                                    </div>
                                </div>
                            ))}

                            {rankedPubs.length <= 3 && (
                                <p className="text-xs text-[var(--color-text-muted)] text-center py-6">
                                    Only the top podium taverns are ranked so far! Rate more pubs to fill the roster.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Member Leaderboard */}
            {activeTab === 'members' && (
                <div className="card-tavern p-5 sm:p-8 border border-[var(--color-border)] space-y-8">
                    <Podium items={rankedMembers.slice(0, 3)} type="members" onSelect={setSelectedUserForProfile} />

                    <div className="space-y-3 pt-4 border-t border-[var(--color-divider)]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                            All Group Explorers
                        </h3>

                        <div className="space-y-2.5">
                            {rankedMembers.map((member, i) => {
                                const name = member.user?.nickname || member.user?.displayName || member.user?.email?.split('@')[0] || 'Member';
                                return (
                                    <div
                                        key={member.uid}
                                        onClick={() => setSelectedUserForProfile(member)}
                                        className="p-3.5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)] hover:border-[var(--color-brand)]/50 transition cursor-pointer space-y-2.5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-display text-base font-normal text-[var(--color-text-faint)] w-6 text-center tabular-nums">
                                                #{i + 1}
                                            </span>
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0">
                                                {member.user?.avatarUrl ? (
                                                    <img src={member.user.avatarUrl} alt={name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-amber-500/10 text-amber-500">
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-display text-base font-normal text-[var(--color-text)] truncate">{name}</p>
                                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                                    {member.ratedCount} pubs rated · {member.writtenReviews} reviews
                                                </p>
                                            </div>
                                            <div className="font-display text-lg font-normal text-[var(--color-brand)] tabular-nums">
                                                {member.totalPoints} <span className="text-[9px] font-bold text-[var(--color-text-faint)]">pts</span>
                                            </div>
                                        </div>

                                        <div className="pl-9 pr-2">
                                            <PointsBreakdown
                                                ratedCount={member.ratedCount}
                                                writtenReviews={member.writtenReviews}
                                                pubsAdded={member.pubsAdded}
                                                crawlsCreated={member.crawlsCreated}
                                                gamification={gamification}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Versus Mode */}
            {activeTab === 'versus' && (
                <VersusMode pubs={safePubs} scores={safeScores} criteria={safeCriteria} />
            )}

            {/* Public Member Profile Modal */}
            {selectedUserForProfile && (
                <PublicProfileModal
                    member={selectedUserForProfile}
                    gamification={gamification}
                    onClose={() => setSelectedUserForProfile(null)}
                />
            )}
        </div>
    );
}
