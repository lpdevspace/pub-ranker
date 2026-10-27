import React, { useState, useEffect } from 'react';
import {
    X,
    MapPin,
    Star,
    Send,
    ChevronDown,
    Calendar,
    MessageSquare,
    Brain,
    Beer,
    Trash2,
    Sparkles
} from 'lucide-react';
import { firebase } from '../../firebase';
import ImageUploader from '../ImageUploader';
import { useToastContext } from '../../context/ToastContext';

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
    const [triviaSession, setTriviaSession] = useState(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [expandedCriteria, setExpandedCriteria] = useState({});

    // ── Load live venue data (events, menu, trivia) ───────────────────────────
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
        let unsubTrivia = () => {};
        if (pubsRef && typeof pubsRef.doc === 'function') {
            unsubMenu = pubsRef.doc(pub.id).collection('menu').orderBy('createdAt', 'asc').onSnapshot(snap => {
                setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            unsubTrivia = pubsRef.doc(pub.id).collection('trivia').doc('liveSession').onSnapshot(doc => {
                if (doc.exists && doc.data().isActive) {
                    setTriviaSession(doc.data());
                } else {
                    setTriviaSession(null);
                }
            });
        }

        return () => {
            unsubEvents();
            unsubMenu();
            unsubTrivia();
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
            showToast(`Reported ${pub.name} as ${status}!`, 'success');
        } catch (e) {
            console.error('Failed to update busy status:', e);
            showToast('Failed to update busy status.', 'error');
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

    const handleDeleteScore = async (score) => {
        if (!groupRef || !score?.id) return;
        if (!window.confirm('Delete this rating?')) return;
        try {
            await groupRef.collection('scores').doc(score.id).delete();
            showToast('Rating deleted.', 'info');
        } catch (e) {
            console.error(e);
            showToast('Failed to delete rating.', 'error');
        }
    };

    const toggleCriteriaExpand = (id) => {
        setExpandedCriteria(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="card-tavern bg-[var(--color-surface)] w-full max-w-2xl max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl border border-[var(--color-border)] animate-scaleIn">
                {/* Hero Header */}
                <div className="relative h-48 sm:h-56 shrink-0 w-full overflow-hidden bg-[var(--color-surface-offset)]">
                    {pub.photoURL ? (
                        <img
                            src={pub.photoURL}
                            alt={pub.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-950/20 to-stone-900/60 flex items-center justify-center text-5xl">
                            🍺
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer z-10"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Venue Info Banner */}
                    <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-4">
                        <div className="min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-display font-normal text-white truncate drop-shadow-md">
                                {pub.name}
                            </h2>
                            <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                <span>{pub.location || pub.address || 'Local Pub'}</span>
                            </p>

                            {/* Amenities */}
                            {pub.amenities && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {pub.amenities.isDogFriendly && <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">🐶 Dogs</span>}
                                    {pub.amenities.hasSportsTv && <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">📺 Live Sports</span>}
                                    {pub.amenities.hasBeerGarden && <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">🌳 Garden</span>}
                                    {pub.amenities.wheelchairAccessible && <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">♿ Accessible</span>}
                                    {pub.amenities.servesFood && <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">🍔 Food</span>}
                                </div>
                            )}
                        </div>

                        {/* Overall Score Badge */}
                        <div className="flex flex-col items-center bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 shrink-0 text-white">
                            <span className="font-display text-2xl font-normal leading-none tabular-nums">
                                {pub.ratingCount > 0 ? pub.avgScore.toFixed(1) : '—'}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 mt-1">
                                {pub.ratingCount > 0 ? pub.tierLabel : 'Unrated'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modal Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Primary Rate Action */}
                    <button
                        onClick={() => {
                            onClose();
                            if (onSelectPub) onSelectPub(pub);
                        }}
                        className="btn-brand w-full justify-center py-3 text-sm shadow-md"
                    >
                        <Star className="w-4 h-4" />
                        <span>Rate this Pub</span>
                    </button>

                    {/* Live Busy Meter */}
                    <div className="p-4 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                                🚦 Live Busy Meter
                            </span>
                            {pub.busyStatusUpdatedAt && (
                                <span className="text-[10px] text-[var(--color-text-faint)] font-medium">
                                    Reported recently
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleUpdateBusyStatus('quiet')}
                                className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                    pub.busyStatus === 'quiet'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                                }`}
                            >
                                😴 Quiet
                            </button>
                            <button
                                onClick={() => handleUpdateBusyStatus('lively')}
                                className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                    pub.busyStatus === 'lively'
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                                }`}
                            >
                                🍻 Lively
                            </button>
                            <button
                                onClick={() => handleUpdateBusyStatus('packed')}
                                className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                    pub.busyStatus === 'packed'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                                }`}
                            >
                                🔥 Packed
                            </button>
                        </div>
                    </div>

                    {/* Score Breakdown per Criterion */}
                    <div className="space-y-3">
                        <h3 className="font-display text-xl text-[var(--color-text)] font-normal">
                            Group Score Breakdown
                        </h3>

                        <div className="card-tavern divide-y divide-[var(--color-divider)] overflow-hidden">
                            {Object.entries(breakdown).filter(([_, d]) => d.type === 'scale').map(([critId, data]) => {
                                const isExpanded = expandedCriteria[critId];
                                return (
                                    <div key={critId}>
                                        <div
                                            onClick={() => toggleCriteriaExpand(critId)}
                                            className="flex items-center justify-between p-3.5 hover:bg-[var(--color-surface-offset)] cursor-pointer transition select-none"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[var(--color-text)]">{data.name}</span>
                                                {data.scores.length > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-faint)] font-bold">
                                                        {data.scores.length}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-display text-lg text-[var(--color-brand)] tabular-nums">
                                                    {data.average > 0 ? data.average.toFixed(1) : '—'}
                                                </span>
                                                <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-faint)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {isExpanded && data.scores.length > 0 && (
                                            <div className="p-3 bg-[var(--color-surface-offset)] space-y-1.5 animate-fadeIn">
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
                            <h3 className="font-display text-xl text-[var(--color-text)] font-normal">
                                Tasting Notes & Comments
                            </h3>
                            <div className="space-y-2">
                                {Object.values(breakdown).filter(d => d.type === 'text').flatMap(d => d.scores).map(s => (
                                    <div key={s.id} className="p-3 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-xs space-y-1">
                                        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-faint)] font-bold">
                                            <span>{allUsers[s.userId]?.nickname || allUsers[s.userId]?.displayName || s.userName || 'Member'}</span>
                                        </div>
                                        <p className="text-[var(--color-text)] italic">&ldquo;{s.value || s.comment}&rdquo;</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message the Manager */}
                    <div className="p-4 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                                    Message Venue Manager
                                </h4>
                                <p className="text-[11px] text-[var(--color-text-muted)]">Send private feedback directly to the pub landlord.</p>
                            </div>
                            <button
                                onClick={() => setShowFeedbackForm(prev => !prev)}
                                className="btn-ghost text-xs"
                            >
                                {showFeedbackForm ? 'Cancel' : 'Write Message'}
                            </button>
                        </div>

                        {showFeedbackForm && (
                            <form onSubmit={handleSubmitFeedback} className="space-y-3 pt-2">
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="Write your constructive feedback or praise..."
                                    rows={3}
                                    className="w-full p-3 rounded-xl text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingFeedback}
                                    className="btn-brand text-xs w-full justify-center disabled:opacity-50"
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
                            <h3 className="font-display text-xl text-[var(--color-text)] font-normal">
                                Manage Photo
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
