import React, { useState, useMemo } from 'react';
import {
    Clock,
    Flame,
    Compass,
    Sparkles,
    RefreshCw,
    ExternalLink,
    ChevronDown,
    CheckCircle2,
    Calendar,
    Eye,
    Maximize2,
    RotateCw,
    Layers
} from 'lucide-react';
import {
    getLiveOpeningStatus,
    getPopularTimesForDay,
    getStreetViewData,
    enrichPubData
} from '../../services/pubEnrichmentService';
import { useToastContext } from '../../context/ToastContext';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PubEnrichmentSection({
    pub,
    pubsRef,
    currentUser,
    onPubUpdated
}) {
    const { showToast } = useToastContext();
    const [isSyncing, setIsSyncing] = useState(false);
    const [showFullSchedule, setShowFullSchedule] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
    const [streetViewHeading, setStreetViewHeading] = useState(180);
    const [streetViewMode, setStreetViewMode] = useState('embed'); // 'embed' | 'photo'
    const [activeHoverBar, setActiveHoverBar] = useState(null);

    // Live opening status right now
    const openingStatus = useMemo(() => {
        return getLiveOpeningStatus(pub.schedule || pub.openingHours);
    }, [pub.schedule, pub.openingHours]);

    // Popular times graph for selected day
    const popularTimes = useMemo(() => {
        return getPopularTimesForDay(selectedDayIndex, pub.busyStatus);
    }, [selectedDayIndex, pub.busyStatus]);

    // Street view URLs
    const streetView = useMemo(() => {
        if (!pub.lat || !pub.lng) return null;
        return getStreetViewData(pub.lat, pub.lng, streetViewHeading);
    }, [pub.lat, pub.lng, streetViewHeading]);

    // Handle reporting live crowd status
    const handleReportBusy = async (status) => {
        if (!pubsRef || !pub?.id) {
            // Local state update for sample pubs
            pub.busyStatus = status;
            pub.busyStatusUpdatedAt = { toMillis: () => Date.now() };
            if (onPubUpdated) onPubUpdated({ ...pub, busyStatus: status });
            showToast(`Reported ${pub.name} as ${status}!`, 'success');
            return;
        }

        try {
            await pubsRef.doc(pub.id).update({
                busyStatus: status,
                busyStatusUpdatedAt: new Date(),
                busyStatusUpdatedBy: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Member',
            });
            pub.busyStatus = status;
            pub.busyStatusUpdatedAt = { toMillis: () => Date.now() };
            if (onPubUpdated) onPubUpdated({ ...pub, busyStatus: status });
            showToast(`Reported ${pub.name} as ${status}!`, 'success');
        } catch (err) {
            console.error('Failed to report busy status:', err);
            showToast('Failed to update live crowd status.', 'error');
        }
    };

    // Live Sync with OSM and Google Places
    const handleSyncEnrichment = async () => {
        setIsSyncing(true);
        try {
            const enriched = await enrichPubData(pub);
            if (!enriched) {
                showToast('No additional data found on OpenStreetMap or Google Places.', 'info');
                return;
            }

            // Update in Firestore if connected
            if (pubsRef && pub.id) {
                const updates = {};
                if (enriched.openingHours) updates.openingHours = enriched.openingHours;
                if (enriched.schedule) updates.schedule = enriched.schedule;
                if (enriched.phone && !pub.phone) updates.phone = enriched.phone;
                if (enriched.website && !pub.website) updates.website = enriched.website;
                if (enriched.placeId && !pub.placeId) updates.placeId = enriched.placeId;
                if (enriched.googleRating && !pub.googleRating) updates.googleRating = enriched.googleRating;
                if (enriched.photoURL && !pub.photoURL) updates.photoURL = enriched.photoURL;
                if (enriched.amenities) updates.amenities = enriched.amenities;
                if (enriched.lastEnrichedAt) updates.lastEnrichedAt = enriched.lastEnrichedAt;
                if (enriched.enrichmentSource) updates.enrichmentSource = enriched.enrichmentSource;

                await pubsRef.doc(pub.id).update(updates);
            }

            // Update local instance
            Object.assign(pub, enriched);
            if (onPubUpdated) onPubUpdated({ ...pub, ...enriched });

            showToast(`✨ Enriched ${pub.name} via ${enriched.enrichmentSource}!`, 'success');
        } catch (err) {
            console.error('Enrichment failed:', err);
            showToast('Enrichment sync encountered an issue: ' + err.message, 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* ── 1. Live Opening Hours Card ── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)]">
                            Live Opening Hours
                        </h4>
                    </div>

                    <button
                        onClick={handleSyncEnrichment}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition disabled:opacity-50 cursor-pointer"
                        title="Sync latest live hours from Google Places and OSM"
                    >
                        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing…' : 'Sync Live Hours'}</span>
                    </button>
                </div>

                {/* Status Pill & Today Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${
                            openingStatus.badgeType === 'open'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse'
                                : openingStatus.badgeType === 'closing-soon'
                                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-pulse'
                                : 'bg-rose-500'
                        }`} />
                        <div>
                            <p className="text-sm font-black text-[var(--color-text)]">
                                {openingStatus.statusText}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                                {openingStatus.currentDay}: {openingStatus.formattedOpen} – {openingStatus.formattedClose}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowFullSchedule(prev => !prev)}
                        className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition"
                    >
                        <span>{showFullSchedule ? 'Hide week' : 'View full week'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFullSchedule ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Full 7-Day Schedule Dropdown */}
                {showFullSchedule && (
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-divider)] divide-y divide-[var(--color-divider)] animate-fadeIn">
                        {DAYS_FULL.map((dayName) => {
                            const isToday = dayName === openingStatus.currentDay;
                            const dayHours = openingStatus.schedule?.[dayName] || { open: '12:00', close: '23:00', isOpenDay: true };
                            return (
                                <div
                                    key={dayName}
                                    className={`py-2 px-1 flex items-center justify-between text-xs ${
                                        isToday ? 'font-black text-amber-500 bg-amber-500/5 rounded-lg px-2' : 'text-[var(--color-text-muted)]'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{dayName}</span>
                                        {isToday && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-black font-black uppercase">
                                                Today
                                            </span>
                                        )}
                                    </span>
                                    <span className="tabular-nums">
                                        {dayHours.isOpenDay
                                            ? `${dayHours.open} – ${dayHours.close === '00:00' ? 'Midnight' : dayHours.close}`
                                            : 'Closed'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── 2. Popular Times & Live Busy Graph Card ── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] shadow-sm space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)]">
                            Popular Times & Live Busy Graph
                        </h4>
                    </div>

                    {/* Day Tabs */}
                    <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
                        {DAYS_SHORT.map((dayLabel, idx) => (
                            <button
                                key={dayLabel}
                                onClick={() => setSelectedDayIndex(idx)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition ${
                                    selectedDayIndex === idx
                                        ? 'bg-amber-500 text-black shadow-xs'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                            >
                                {dayLabel}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Busy Summary Header */}
                <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[var(--color-text-muted)] font-medium">
                        {popularTimes.summaryText}
                    </span>
                    <span className="text-[11px] font-bold text-amber-500">
                        Peak: {popularTimes.peakLabel}
                    </span>
                </div>

                {/* Hourly Histogram Graph (11am to 11pm) */}
                <div className="relative pt-6 pb-2 px-1">
                    {/* Hover tooltip */}
                    {activeHoverBar && (
                        <div
                            className="absolute -top-1 pointer-events-none transform -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded shadow-lg border border-slate-700 z-20 whitespace-nowrap"
                            style={{ left: `${((activeHoverBar.hour - 11) / 12) * 90 + 5}%` }}
                        >
                            {activeHoverBar.displayLabel}: {activeHoverBar.busyScore}% busy
                        </div>
                    )}

                    <div className="h-28 flex items-end justify-between gap-1 sm:gap-2">
                        {popularTimes.hours.map((item) => {
                            const isCurrent = item.isCurrent;
                            const barHeight = Math.max(12, item.busyScore);
                            
                            // Dynamic bar gradient color
                            let barColor = 'from-slate-500/40 to-slate-600/60';
                            if (item.level === 'moderate') barColor = 'from-amber-500/70 to-amber-600/80';
                            if (item.level === 'high')     barColor = 'from-orange-500/80 to-orange-600/90';
                            if (item.level === 'peak')     barColor = 'from-rose-500 to-red-600';

                            return (
                                <div
                                    key={item.hour}
                                    onMouseEnter={() => setActiveHoverBar(item)}
                                    onMouseLeave={() => setActiveHoverBar(null)}
                                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                                >
                                    {/* "NOW" pin above active bar */}
                                    {isCurrent && (
                                        <div className="absolute -top-5 flex flex-col items-center animate-bounce">
                                            <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase shadow-xs">
                                                Now
                                            </span>
                                            <span className="w-1.5 h-1.5 bg-amber-500 rotate-45 -mt-0.5" />
                                        </div>
                                    )}

                                    {/* Bar Element */}
                                    <div
                                        style={{ height: `${barHeight}%` }}
                                        className={`w-full rounded-t-md bg-gradient-to-t transition-all duration-300 group-hover:brightness-125 ${barColor} ${
                                            isCurrent ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : ''
                                        }`}
                                    />

                                    {/* X-Axis Label */}
                                    <span className={`text-[9px] mt-1.5 select-none font-bold ${
                                        isCurrent ? 'text-amber-500 font-black' : 'text-[var(--color-text-faint)]'
                                    }`}>
                                        {item.hour % 2 === 1 ? item.displayLabel : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Live Member Crowd Reporter */}
                <div className="pt-2 border-t border-[var(--color-divider)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--color-text)]">
                            Are you here now? Update the live vibe:
                        </span>
                        {pub.busyStatus && (
                            <span className="text-[10px] text-amber-500 font-bold capitalize">
                                Current: {pub.busyStatus}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => handleReportBusy('quiet')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                                pub.busyStatus === 'quiet'
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]'
                            }`}
                        >
                            <span>😴</span>
                            <span>Quiet</span>
                        </button>

                        <button
                            onClick={() => handleReportBusy('lively')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                                pub.busyStatus === 'lively'
                                    ? 'bg-amber-500 text-black border-amber-400 font-black shadow-sm'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]'
                            }`}
                        >
                            <span>🍻</span>
                            <span>Lively</span>
                        </button>

                        <button
                            onClick={() => handleReportBusy('packed')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                                pub.busyStatus === 'packed'
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]'
                            }`}
                        >
                            <span>🔥</span>
                            <span>Packed</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 3. Street View 360° Interactive Preview ── */}
            {streetView && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] shadow-sm space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Compass className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)]">
                                Street View & 360° Facade
                            </h4>
                        </div>

                        {/* Heading angle selector */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[var(--color-text-muted)] mr-1">Angle:</span>
                            {[
                                { label: '0°', val: 0 },
                                { label: '90°', val: 90 },
                                { label: '180°', val: 180 },
                                { label: '270°', val: 270 }
                            ].map(btn => (
                                <button
                                    key={btn.val}
                                    onClick={() => setStreetViewHeading(btn.val)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                        streetViewHeading === btn.val
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Street View Interactive Embed / Panorama */}
                    <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-[var(--color-border)] bg-black shadow-inner">
                        <iframe
                            title={`Street View of ${pub.name}`}
                            src={streetView.embedUrl}
                            className="w-full h-full border-0"
                            loading="lazy"
                            allowFullScreen
                        />

                        {/* Floating Open Full Google Maps 360 button */}
                        <a
                            href={streetView.webPanoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 transition shadow-lg z-10"
                        >
                            <span>Open 360° Panorama</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
