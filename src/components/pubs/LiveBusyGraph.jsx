import React, { useState } from 'react';
import { Clock, TrendingUp, Users, Calendar } from 'lucide-react';
import { getPopularTimesForDay } from '../../services/pubEnrichmentService';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LiveBusyGraph({
    busyStatus,
    busyStatusUpdatedAt,
    onUpdateBusyStatus,
    interactive = true,
    compact = false
}) {
    const todayIndex = new Date().getDay();
    const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);

    const popularTimes = getPopularTimesForDay(selectedDayIndex, busyStatus);
    const { hours, currentHour, currentBusyScore, summaryText, isCurrentDay, peakLabel } = popularTimes;

    if (compact) {
        // Compact sparkline for PubCard
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-semibold">
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-500" />
                        <span>Live Busy Times</span>
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-text)]">
                        {currentBusyScore}% busy now
                    </span>
                </div>

                <div className="flex items-end gap-[3px] h-7 w-full bg-[var(--color-surface-offset)] p-1 rounded-lg border border-[var(--color-border)]">
                    {hours.map(item => {
                        const isCurrent = isCurrentDay && item.hour === currentHour;
                        const heightPct = Math.max(15, item.busyScore);
                        return (
                            <div
                                key={item.hour}
                                className="flex-1 flex flex-col justify-end h-full group/bar relative"
                                title={`${item.displayLabel}: ~${item.busyScore}% busy`}
                            >
                                <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full rounded-t-sm transition-all duration-300 ${
                                        isCurrent
                                            ? 'bg-gradient-to-t from-amber-500 to-rose-500 shadow-sm animate-pulse'
                                            : item.busyScore >= 75
                                            ? 'bg-amber-500/70 hover:bg-amber-500'
                                            : 'bg-[var(--color-border)] hover:bg-amber-500/50'
                                    }`}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-4">
            {/* Header with Live Status & Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                            <span>Live Busy Times & Traffic</span>
                            {isCurrentDay && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />}
                        </h4>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                            {summaryText} {isCurrentDay ? `· Estimated ${currentBusyScore}% capacity now` : `· Peak ${peakLabel}`}
                        </p>
                    </div>
                </div>

                {/* Day selector pills */}
                <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] self-start sm:self-auto">
                    {DAYS_SHORT.map((dayLabel, idx) => (
                        <button
                            key={dayLabel}
                            type="button"
                            onClick={() => setSelectedDayIndex(idx)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition ${
                                selectedDayIndex === idx
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            {dayLabel}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hourly Popular Times Bar Graph */}
            <div className="space-y-1.5">
                <div className="flex items-end gap-1.5 h-24 sm:h-28 w-full pt-4 pb-1 px-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
                    {hours.map(item => {
                        const isCurrent = isCurrentDay && item.hour === currentHour;
                        const heightPct = Math.max(12, item.busyScore);
                        return (
                            <div
                                key={item.hour}
                                className="flex-1 min-w-[18px] flex flex-col items-center justify-end h-full relative group/col"
                            >
                                {/* Now Tag on Current Hour */}
                                {isCurrent && (
                                    <span className="absolute -top-3.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-rose-500 text-white shadow-sm z-10 whitespace-nowrap">
                                        Now
                                    </span>
                                )}

                                {/* Hover tooltip */}
                                <div className="opacity-0 group-hover/col:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded pointer-events-none whitespace-nowrap shadow-md z-20">
                                    {item.displayLabel}: {item.busyScore}% busy
                                </div>

                                <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full max-w-[16px] rounded-t-sm transition-all duration-300 ${
                                        isCurrent
                                            ? 'bg-gradient-to-t from-rose-500 to-amber-400 shadow-md ring-2 ring-amber-400/50'
                                            : item.busyScore >= 80
                                            ? 'bg-rose-500/80 hover:bg-rose-500'
                                            : item.busyScore >= 55
                                            ? 'bg-amber-500/80 hover:bg-amber-500'
                                            : 'bg-stone-400/40 dark:bg-stone-700/60 hover:bg-amber-400/60'
                                    }`}
                                />
                                <span className={`text-[9px] mt-1.5 tabular-nums ${
                                    isCurrent
                                        ? 'font-black text-rose-500'
                                        : 'text-[var(--color-text-faint)]'
                                }`}>
                                    {item.displayLabel.replace(/am|pm/, '')}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between text-[9px] text-[var(--color-text-faint)] font-bold px-1">
                    <span>11 AM</span>
                    <span>3 PM</span>
                    <span>7 PM</span>
                    <span>11 PM</span>
                </div>
            </div>

            {/* Interactive User Crowd Reporter Buttons */}
            {interactive && onUpdateBusyStatus && (
                <div className="pt-2 border-t border-[var(--color-divider)]">
                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Are you at the bar? Report live atmosphere:</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => onUpdateBusyStatus('quiet')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                busyStatus === 'quiet'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/30'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-emerald-500 hover:text-emerald-500'
                            }`}
                        >
                            <span>😴 Quiet</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdateBusyStatus('lively')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                busyStatus === 'lively'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-400/30'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-amber-500 hover:text-amber-500'
                            }`}
                        >
                            <span>🍻 Lively</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdateBusyStatus('packed')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                busyStatus === 'packed'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400/30'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-rose-500 hover:text-rose-500'
                            }`}
                        >
                            <span>🔥 Packed</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
