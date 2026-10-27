import React, { useState, useEffect } from 'react';
import {
    X,
    MapPin,
    Star,
    Check,
    Beer,
    Sparkles,
    Coins
} from 'lucide-react';
import { firebase, db } from '../firebase';
import { useToastContext } from '../context/ToastContext';

const getScoreEmoji = (score) => {
    if (!score) return "🤔";
    if (score >= 9) return "🤯";
    if (score >= 8) return "😍";
    if (score >= 7) return "🍺";
    if (score >= 5) return "🙂";
    if (score >= 3) return "😬";
    return "🤢";
};

export default function RateView({ pub, criteria = [], user, onBack, groupRef, groupId }) {
    const { showToast } = useToastContext();
    const [ratings, setRatings] = useState({});
    const [ratingDocIds, setRatingDocIds] = useState({});
    const [pintPrice, setPintPrice] = useState(pub?.pintPrice ? String(pub.pintPrice) : '');
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Load existing user ratings for this pub ────────────────────────────────
    useEffect(() => {
        const loadExistingRatings = async () => {
            if (!pub?.id || !user?.uid || !groupId || !groupRef) return;
            try {
                const snapshot = await groupRef.collection("scores")
                    .where("pubId", "==", pub.id)
                    .where("userId", "==", user.uid)
                    .where("groupId", "==", groupId)
                    .get();

                const existing = {};
                const existingIds = {};
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    existing[data.criterionId] = data.value;
                    existingIds[data.criterionId] = doc.id;
                });
                setRatings(existing);
                setRatingDocIds(existingIds);
            } catch (e) {
                console.error("Error loading existing ratings", e);
            }
        };
        loadExistingRatings();
    }, [groupRef, pub?.id, user?.uid, groupId]);

    const handleRate = (criterionId, ratingValue) => {
        setRatings((prev) => ({ ...prev, [criterionId]: ratingValue }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const activeEntries = Object.entries(ratings).filter(([_, val]) => val !== null && val !== "");
        if (activeEntries.length === 0) {
            showToast("Please rate at least one criterion!", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = db.batch();
            const scoresCollectionRef = groupRef.collection("scores");
            const now = firebase.firestore.FieldValue.serverTimestamp();
            const userName = user.displayName || user.email?.split('@')[0] || 'User';

            for (const [criterionId, value] of activeEntries) {
                const criterion = (criteria || []).find((c) => c.id === criterionId);
                if (!criterion) continue;

                const existingDocId = ratingDocIds[criterionId];
                if (existingDocId) {
                    const docRef = scoresCollectionRef.doc(existingDocId);
                    batch.update(docRef, {
                        value,
                        type: criterion.type,
                        lastEditedBy: user.uid,
                        lastEditedAt: now,
                        updatedAt: now,
                        userName,
                        ...(reviewComment ? { comment: reviewComment } : {})
                    });
                } else {
                    const newScoreRef = scoresCollectionRef.doc();
                    batch.set(newScoreRef, {
                        pubId: pub.id,
                        userId: user.uid,
                        criterionId,
                        value,
                        type: criterion.type,
                        groupId,
                        timestamp: now,
                        lastEditedBy: user.uid,
                        lastEditedAt: now,
                        updatedAt: now,
                        userName,
                        ...(reviewComment ? { comment: reviewComment } : {})
                    });
                }
            }

            // Update pub status to visited and store pint price if entered
            const pubUpdates = {
                status: 'visited',
                updatedAt: now,
            };
            if (pintPrice && !isNaN(parseFloat(pintPrice))) {
                pubUpdates.pintPrice = parseFloat(pintPrice);
            }
            batch.update(groupRef.collection('pubs').doc(pub.id), pubUpdates);

            // Log activity in group feed
            const activityRef = groupRef.collection("activities").doc();
            batch.set(activityRef, {
                type: 'rating',
                userId: user.uid,
                userName,
                userAvatar: user.photoURL || null,
                pubId: pub.id,
                pubName: pub.name,
                timestamp: now,
                ratingCount: activeEntries.length
            });

            await batch.commit();
            showToast(`⭐ Ratings saved for ${pub.name}!`, "success");
            setIsSubmitting(false);
            onBack();
        } catch (error) {
            console.error("Error submitting ratings", error);
            showToast("Failed to save ratings: " + error.message, "error");
            setIsSubmitting(false);
        }
    };

    if (!pub) {
        return (
            <div className="card-tavern p-8 text-center max-w-md mx-auto my-12">
                <p className="text-sm text-[var(--color-text-muted)] mb-4">Loading pub details...</p>
                <button onClick={onBack} className="btn-ghost">Back to Directory</button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="card-tavern bg-[var(--color-surface)] w-full max-w-2xl max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl border border-[var(--color-border)] animate-scaleIn">
                
                {/* Hero Header */}
                <div className="relative h-36 sm:h-44 shrink-0 w-full overflow-hidden bg-[var(--color-surface-offset)]">
                    {pub.photoURL ? (
                        <img 
                            src={pub.photoURL} 
                            alt={pub.name} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-stone-900/80 flex items-center justify-center text-4xl">
                            🍺
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-between p-4 sm:p-6" />

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onBack}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer z-10"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Title */}
                    <div className="absolute bottom-3 left-4 right-4 z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                            Rate & Review
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-display font-black text-white truncate drop-shadow-md">
                            {pub.name}
                        </h2>
                        <p className="text-xs text-white/80 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                            <span>{pub.location || pub.address || 'Local Pub'}</span>
                        </p>
                    </div>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 space-y-6">
                    <div>
                        <h3 className="font-display text-xl font-black text-[var(--color-text)]">
                            What&apos;s your verdict?
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Rate across your group&apos;s criteria. Your scores instantly update the group leaderboard!
                        </p>
                    </div>

                    {/* Criteria Sliders */}
                    <div className="space-y-4">
                        {criteria.map((crit) => {
                            const val = ratings[crit.id] ?? 5;
                            return (
                                <div
                                    key={crit.id}
                                    className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm sm:text-base font-bold text-[var(--color-text)] font-body">
                                            {crit.name}
                                        </label>

                                        {crit.type === 'scale' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{getScoreEmoji(val)}</span>
                                                <span className="text-lg font-bold text-[var(--color-brand)] tabular-nums">
                                                    {val.toFixed(1)} <span className="text-xs text-[var(--color-text-muted)] opacity-60">/ 10</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {crit.type === 'scale' && (
                                        <div className="space-y-1.5">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                step="0.5"
                                                value={val}
                                                onChange={(e) => handleRate(crit.id, parseFloat(e.target.value))}
                                                className="w-full h-2 rounded-full cursor-pointer bg-[var(--color-border)] accent-[var(--color-brand)]"
                                            />
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                                                <span>Awful (1)</span>
                                                <span>Average (5)</span>
                                                <span>Legendary (10)</span>
                                            </div>
                                        </div>
                                    )}

                                    {crit.type === 'price' && (
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => handleRate(crit.id, level)}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${
                                                        ratings[crit.id] === level
                                                            ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)] shadow-sm'
                                                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-divider)]'
                                                    }`}
                                                >
                                                    {'£'.repeat(level)}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {crit.type === 'yes-no' && (
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleRate(crit.id, true)}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 ${
                                                    ratings[crit.id] === true
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                                                }`}
                                            >
                                                👍 Yes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRate(crit.id, false)}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 ${
                                                    ratings[crit.id] === false
                                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                                                }`}
                                            >
                                                👎 No
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Guinness / Pint Price Tracker */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-2">
                        <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                                Exact Pint Price (Guinness Index)
                            </label>
                        </div>
                        <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[var(--color-text-muted)]">
                                £
                            </span>
                            <input
                                type="number"
                                step="0.05"
                                min="2.00"
                                max="15.00"
                                value={pintPrice}
                                onChange={(e) => setPintPrice(e.target.value)}
                                placeholder="e.g. 5.20"
                                className="w-full pl-8 pr-4 py-2 rounded-xl text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                            />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-faint)]">
                            Helps track the cheapest & priciest pints across your city.
                        </p>
                    </div>

                    {/* Optional Tasting / Review Notes */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                            Tasting Notes & Comments (Optional)
                        </label>
                        <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Great crisp pint, buzzing beer garden on a Friday evening..."
                            rows={3}
                            className="w-full p-3 rounded-xl text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none"
                        />
                    </div>
                </div>

                {/* Fixed Footer Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-divider)] flex justify-end gap-3 z-40">
                    <button
                        type="button"
                        onClick={onBack}
                        className="btn-ghost text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="btn-fun-primary !py-2.5 !px-5 text-xs font-extrabold disabled:opacity-50"
                    >
                        <Beer className="w-4 h-4" />
                        <span>{isSubmitting ? 'Saving Ratings...' : 'Submit Ratings'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
