import React, { useState, useEffect } from 'react';
import {
    X,
    MapPin,
    Star,
    Send,
    ChevronDown,
    Calendar,
    MessageSquare,
    Beer,
    Trash2,
    Sparkles,
    Clock,
    Phone,
    Globe,
    ExternalLink,
    Eye,
    TrendingUp,
    RefreshCw,
    Camera
} from 'lucide-react';
import { firebase } from '../../firebase';
import ImageUploader from '../ImageUploader';
import { useToastContext } from '../../context/ToastContext';
import { getLiveOpeningStatus, enrichPubData, getStreetViewData } from '../../services/pubEnrichmentService';
import LiveBusyGraph from './LiveBusyGraph';

export default function PubDetailModal({
    pub,
    breakdown = {},
    allUsers = {},
    currentUser,
    groupRef,
    pubsRef,
    db,
    onClose,
    canManageGroup,
    onSelectPub
}) {
    const { showToast } = useToastContext();
    const [venueEvents, setVenueEvents] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [expandedCriteria, setExpandedCriteria] = useState({});
    const [heroMode, setHeroMode] = useState('photo'); // 'photo' | 'streetview'
    const [streetViewHeading, setStreetViewHeading] = useState(pub?.streetViewHeading || 180);
    const [isEnriching, setIsEnriching] = useState(false);
    const [showFullHours, setShowFullHours] = useState(false);

    // Compute live opening status
    const liveStatus = getLiveOpeningStatus(pub?.schedule || pub?.openingHours);
    const streetView = getStreetViewData(pub?.lat, pub?.lng, streetViewHeading);

    // ── Load live venue data (events, menu) ───────────────────────────────────
    useEffect(() => {
        if (!db || !pub?.id) return;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const unsubEvents = db.collection('events')
            .where('groupId', '==', 'venue')
            .where('pubId', '==', pub.id)
            .onSnapshot(snap => {
                setVenueEvents(
                    snap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(e => e.date >= cutoff)
                        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                );
            });

        let unsubMenu = () => {};
        if (pubsRef && typeof pubsRef.doc === 'function') {
            unsubMenu = pubsRef.doc(pub.id).collection('menu').orderBy('createdAt', 'asc').onSnapshot(snap => {
                setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        }

        return () => {
            unsubEvents();
            unsubMenu();
        };
    }, [db, pubsRef, pub?.id]);

    const handleUpdateBusyStatus = async (status) => {
        if (!pubsRef || !pub?.id) return;
        try {
            await pubsRef.doc(pub.id).update({
                busyStatus: status,
                busyStatusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                busyStatusUpdatedBy: currentUser?.uid || 'anonymous'
            });
            pub.busyStatus = status;
            pub.busyStatusUpdatedAt = { toMillis: () => Date.now() };
            showToast(`Reported ${pub.name} as ${status}! 🍻`, 'success');
        } catch (e) {
            console.error('Failed to update busy status:', e);
            showToast('Failed to update busy status.', 'error');
        }
    };

    const handleSyncEnrichment = async () => {
        setIsEnriching(true);
        try {
            const enriched = await enrichPubData(pub);
            if (enriched && pubsRef && pub.id) {
                const updates = {};
                if (enriched.openingHours) updates.openingHours = enriched.openingHours;
                if (enriched.schedule) updates.schedule = enriched.schedule;
                if (enriched.operator) updates.operator = enriched.operator;
                if (enriched.phone) updates.phone = enriched.phone;
                if (enriched.website) updates.website = enriched.website;
                if (enriched.realAle !== undefined) updates.realAle = enriched.realAle;
                if (enriched.placeId) updates.placeId = enriched.placeId;
                if (enriched.googleRating) updates.googleRating = enriched.googleRating;
                if (enriched.photoURL && !pub.photoURL) updates.photoURL = enriched.photoURL;
                if (enriched.amenities) updates.amenities = enriched.amenities;
                if (enriched.lastEnrichedAt) updates.lastEnrichedAt = enriched.lastEnrichedAt;
                if (enriched.enrichmentSource) updates.enrichmentSource = enriched.enrichmentSource;

                await pubsRef.doc(pub.id).update(updates);
                Object.assign(pub, updates);
                showToast(`✨ Synced live hours & data via ${enriched.enrichmentSource}!`, 'success');
            } else if (enriched) {
                // In demo/sample mode
                Object.assign(pub, enriched);
                showToast(`✨ Synced live hours & data via ${enriched.enrichmentSource}!`, 'success');
            } else {
                showToast('No newer live records found for this location.', 'info');
            }
        } catch (err) {
            console.error('Failed to enrich pub:', err);
            showToast('Enrichment query temporarily unavailable: ' + err.message, 'error');
        } finally {
            setIsEnriching(false);
        }
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (!feedbackText.trim() || !currentUser) return;
        setIsSubmittingFeedback(true);
        try {
            await db.collection('messages').add({
                venueId: pub.id,
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                text: feedbackText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            setFeedbackText('');
            setShowFeedbackForm(false);
            showToast('Message sent to the venue manager!', 'success');
        } catch (err) {
            console.error('Error sending feedback:', err);
            showToast('Failed to send message.', 'error');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const toggleCriteriaExpand = (id) => {
        setExpandedCriteria(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="card-tavern bg-[var(--color-surface)] w-full max-w-3xl max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl border border-amber-500/20 animate-scaleIn rounded-3xl">
                {/* Hero Header with Photo vs Street View Toggle */}
                <div className="relative h-60 sm:h-72 shrink-0 w-full overflow-hidden bg-slate-950">
                    {heroMode === 'photo' ? (
                        <>
                            {pub.photoURL ? (
                                <img
                                    src={pub.photoURL}
                                    alt={pub.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-amber-950/40 via-stone-900 to-black flex items-center justify-center text-6xl">
                                    🍺
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
                        </>
                    ) : (
                        <div className="w-full h-full relative">
                            {pub.lat && pub.lng ? (
                                <iframe
                                    title={`Street view of ${pub.name}`}
                                    src={streetView.embedUrl}
                                    className="w-full h-full border-0"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                    No coordinates available for Street View.
                                </div>
                            )}
                            <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 shadow-lg">
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span>360° Street View Facade</span>
                            </div>

                            {/* Heading Angle Selector Controls */}
                            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                                <span className="text-[10px] text-white/70 font-semibold mr-1">Angle:</span>
                                {[0, 90, 180, 270].map(deg => (
                                    <button
                                        key={deg}
                                        type="button"
                                        onClick={() => setStreetViewHeading(deg)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                                            streetViewHeading === deg ? 'bg-amber-500 text-slate-950' : 'text-white/80 hover:text-white'
                                        }`}
                                    >
                                        {deg}°
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mode Toggle & Close Button */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                        {pub.lat && pub.lng && (
                            <div className="flex items-center bg-black/70 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => setHeroMode('photo')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        heroMode === 'photo'
                                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                                            : 'text-white hover:text-amber-300'
                                    }`}
                                >
                                    <Camera className="w-3 h-3" />
                                    <span>Photo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHeroMode('streetview')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        heroMode === 'streetview'
                                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                                            : 'text-white hover:text-amber-300'
                                    }`}
                                >
                                    <Eye className="w-3 h-3" />
                                    <span>Street View</span>
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Bottom Info Banner */}
                    <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl sm:text-3xl font-display font-black text-white truncate drop-shadow-md">
                                    {pub.name}
                                </h2>
                                {pub.operator && (
                                    <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                        {pub.operator}
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-white/80 flex items-center gap-1 mt-1 truncate">
                                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>{pub.address || pub.location || 'Local Pub'}</span>
                            </p>

                            {/* Live status badge */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                                    liveStatus.badgeType === 'open'
                                        ? 'bg-emerald-500/90 text-white'
                                        : liveStatus.badgeType === 'closing-soon'
                                        ? 'bg-amber-500/90 text-slate-950 font-black'
                                        : 'bg-slate-800 text-slate-300'
                                }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    <span>{liveStatus.statusText}</span>
                                </span>

                                {pub.pintPrice && (
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950/80 text-amber-300 border border-white/10">
                                        Pint £{pub.pintPrice.toFixed(2)}
                                    </span>
                                )}

                                {pub.realAle && (
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        🍺 Real Ale Handpulls
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Overall Score Badge */}
                        <div className="flex flex-col items-center bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 shrink-0 text-white shadow-xl">
                            <span className="font-display text-2xl sm:text-3xl font-black leading-none tabular-nums text-amber-400">
                                ★ {pub.avgScore ? pub.avgScore.toFixed(1) : '—'}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-1">
                                {pub.ratingCount > 0 ? `${pub.ratingCount} Ratings` : 'Unrated'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modal Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Primary Rate Action Bar */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => {
                                onClose();
                                if (onSelectPub) onSelectPub(pub);
                            }}
                            className="btn-fun-primary flex-1 justify-center py-3 text-sm shadow-md font-black flex items-center gap-2"
                        >
                            <Star className="w-4 h-4 fill-current" />
                            <span>Score & Rate this Pub</span>
                        </button>

                        {pub.lat && pub.lng && (
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${pub.lat},${pub.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-fun-secondary py-3 px-4 text-xs font-bold flex items-center gap-1.5 shrink-0"
                                title="Get Walking Directions"
                            >
                                <MapPin className="w-4 h-4 text-rose-500" />
                                <span>Directions</span>
                            </a>
                        )}
                    </div>

                    {/* Vibe Summary from Gemini if present */}
                    {pub.vibeSummary && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-500/20 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Tavern Vibe Check</span>
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--color-text)] italic leading-relaxed">
                                &ldquo;{pub.vibeSummary}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Live Popular Times & Busy Times Graph */}
                    <LiveBusyGraph
                        busyStatus={pub.busyStatus}
                        busyStatusUpdatedAt={pub.busyStatusUpdatedAt}
                        onUpdateBusyStatus={handleUpdateBusyStatus}
                        interactive={true}
                    />

                    {/* Live Opening Hours & OSM Metadata Panel */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)]">
                                        Opening Hours & Information
                                    </h4>
                                    <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                        Today ({liveStatus.currentDay}): {liveStatus.todayHours.open} - {liveStatus.todayHours.close}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSyncEnrichment}
                                    disabled={isEnriching}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                    title="Sync live hours and metadata from Google Places & OpenStreetMap"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
                                    <span>{isEnriching ? 'Syncing Places & OSM…' : 'Sync Places & OSM'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowFullHours(prev => !prev)}
                                    className="text-xs font-bold text-[var(--color-brand)] hover:underline"
                                >
                                    {showFullHours ? 'Hide Schedule' : 'Full Week'}
                                </button>
                            </div>
                        </div>

                        {/* Expandable 7-day schedule */}
                        {showFullHours && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--color-divider)] text-xs animate-fadeIn">
                                {Object.entries(liveStatus.schedule).map(([dayName, times]) => {
                                    const isToday = dayName === liveStatus.currentDay;
                                    return (
                                        <div
                                            key={dayName}
                                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${
                                                isToday
                                                    ? 'bg-amber-500/15 border-amber-500/40 text-[var(--color-text)] font-black'
                                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] font-medium'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1">
                                                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                                <span>{dayName}</span>
                                            </span>
                                            <span className="tabular-nums">
                                                {times.open} – {times.close}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Contact & Links Bar */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs border-t border-[var(--color-divider)]">
                            {pub.phone && (
                                <a
                                    href={`tel:${pub.phone}`}
                                    className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-amber-500 font-semibold"
                                >
                                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>{pub.phone}</span>
                                </a>
                            )}
                            {pub.website && (
                                <a
                                    href={pub.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-amber-500 font-semibold"
                                >
                                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Website</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {streetView.webPanoUrl && (
                                <a
                                    href={streetView.webPanoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-amber-500 font-semibold"
                                >
                                    <Eye className="w-3.5 h-3.5 text-purple-500" />
                                    <span>Google 360° View</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Score Breakdown per Criterion */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-display text-xl text-[var(--color-text)] font-black">
                                Group Score Breakdown
                            </h3>
                            <span className="text-xs text-[var(--color-text-muted)]">
                                {Object.keys(breakdown).length} Categories Rated
                            </span>
                        </div>

                        <div className="card-tavern divide-y divide-[var(--color-divider)] overflow-hidden border border-[var(--color-border)] rounded-2xl">
                            {Object.entries(breakdown).filter(([_, d]) => d.type === 'scale').map(([critId, data]) => {
                                const isExpanded = expandedCriteria[critId];
                                const scorePct = Math.min(100, (data.average / 10) * 100);
                                return (
                                    <div key={critId}>
                                        <div
                                            onClick={() => toggleCriteriaExpand(critId)}
                                            className="flex items-center justify-between p-3.5 hover:bg-[var(--color-surface-offset)] cursor-pointer transition select-none"
                                        >
                                            <div className="flex-1 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-[var(--color-text)]">{data.name}</span>
                                                    {data.scores.length > 0 && (
                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-faint)] font-bold">
                                                            {data.scores.length}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Mini score progress bar */}
                                                <div className="w-full bg-[var(--color-surface-offset)] h-1.5 rounded-full mt-2 overflow-hidden border border-[var(--color-border)]">
                                                    <div
                                                        style={{ width: `${scorePct}%` }}
                                                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-display text-lg text-amber-500 font-black tabular-nums">
                                                    {data.average > 0 ? data.average.toFixed(1) : '—'}
                                                </span>
                                                <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-faint)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {isExpanded && data.scores.length > 0 && (
                                            <div className="p-3 bg-[var(--color-surface-offset)] space-y-1.5 animate-fadeIn border-t border-[var(--color-divider)]">
                                                {data.scores.map(s => {
                                                    const name = allUsers[s.userId]?.nickname || allUsers[s.userId]?.displayName || s.userName || 'Member';
                                                    return (
                                                        <div key={s.id} className="flex items-center justify-between py-1 text-xs text-[var(--color-text-muted)]">
                                                            <span>{name}</span>
                                                            <span className="font-bold tabular-nums text-[var(--color-text)]">{s.value.toFixed(1)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Member Tasting Notes & Reviews */}
                    {Object.values(breakdown).some(d => d.type === 'text' && d.scores.length > 0) && (
                        <div className="space-y-3">
                            <h3 className="font-display text-xl text-[var(--color-text)] font-black">
                                Member Tasting Notes & Banter
                            </h3>
                            <div className="space-y-2.5">
                                {Object.values(breakdown).filter(d => d.type === 'text').flatMap(d => d.scores).map(s => (
                                    <div key={s.id} className="p-3.5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-xs space-y-1 shadow-sm">
                                        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-faint)] font-bold">
                                            <span>{allUsers[s.userId]?.nickname || allUsers[s.userId]?.displayName || s.userName || 'Tavern Member'}</span>
                                        </div>
                                        <p className="text-[var(--color-text)] italic font-serif text-sm">&ldquo;{s.value || s.comment}&rdquo;</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message the Manager */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)]">
                                    Message Venue Manager
                                </h4>
                                <p className="text-[11px] text-[var(--color-text-muted)]">Send private feedback, bookings or enquiries directly to the pub landlord.</p>
                            </div>
                            <button
                                onClick={() => setShowFeedbackForm(prev => !prev)}
                                className="btn-fun-secondary text-xs !py-1.5 !px-3"
                            >
                                {showFeedbackForm ? 'Cancel' : 'Write Message'}
                            </button>
                        </div>

                        {showFeedbackForm && (
                            <form onSubmit={handleSubmitFeedback} className="space-y-3 pt-2 animate-fadeIn">
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="Write your feedback, compliment on the ale, or enquiry..."
                                    rows={3}
                                    className="w-full p-3 rounded-xl text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingFeedback}
                                    className="btn-fun-primary text-xs w-full justify-center disabled:opacity-50"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{isSubmittingFeedback ? 'Sending...' : 'Send Privately'}</span>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Cover Photo Management for Group Managers */}
                    {canManageGroup && pubsRef && (
                        <div className="space-y-3">
                            <h3 className="font-display text-xl text-[var(--color-text)] font-black">
                                Cover Photo Management
                            </h3>
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
                                <ImageUploader
                                    currentPhotoUrl={pub.photoURL}
                                    onPhotoUploaded={async (url) => {
                                        try {
                                            await pubsRef.doc(pub.id).update({ photoURL: url });
                                            pub.photoURL = url;
                                            showToast('Photo updated!', 'success');
                                        } catch (e) {
                                            showToast('Failed to update photo', 'error');
                                        }
                                    }}
                                    onPhotoRemoved={async () => {
                                        try {
                                            await pubsRef.doc(pub.id).update({ photoURL: '' });
                                            pub.photoURL = '';
                                            showToast('Photo removed', 'info');
                                        } catch (e) {
                                            showToast('Failed to remove photo', 'error');
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
