import React, { useState, useEffect } from 'react';
import { firebase, db } from '../firebase';

export default function RateView({ pub, criteria, user, onBack, groupRef, groupId }) {
    const [ratings, setRatings] = useState({});
    const [ratingDocIds, setRatingDocIds] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadExistingRatings = async () => {
            if (!pub || !user || !groupId || !groupRef) return;
            try {
                const scoresCollectionRef = groupRef.collection("scores");
                const snapshot = await scoresCollectionRef
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
            } catch (e) { console.error("Error loading existing ratings", e); }
        };
        loadExistingRatings();
    }, [groupRef, pub, user, groupId]);

    const handleRate = (criterionId, ratingValue) => {
        setRatings((prev) => ({ ...prev, [criterionId]: ratingValue }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (Object.keys(ratings).length === 0) { alert("Please rate at least one thing!"); return; }
        setIsSubmitting(true);
        try {
            const batch = db.batch();
            const scoresCollectionRef = groupRef.collection("scores");
            const now = firebase.firestore.FieldValue.serverTimestamp();
            for (const [criterionId, value] of Object.entries(ratings)) {
                if (value === null || value === "") continue;
                const safeCriteria = criteria || [];
                const criterion = safeCriteria.find((c) => c.id === criterionId);
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
                        userName: user.displayName || user.email?.split('@')[0] || 'User',
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
                        userName: user.displayName || user.email?.split('@')[0] || 'User',
                    });
                }
            }

            // Log activity
            const activityRef = groupRef.collection("activities").doc();
            batch.set(activityRef, {
                type: 'rating',
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'User',
                userAvatar: user.photoURL || null,
                pubId: pub.id,
                pubName: pub.name,
                timestamp: now,
                ratingCount: Object.keys(ratings).length
            });

            await batch.commit();
            setIsSubmitting(false);
            onBack();
        } catch (error) {
            console.error("Error submitting ratings", error);
            alert("Failed to save ratings.");
            setIsSubmitting(false);
        }
    };

    const getScoreEmoji = (score) => {
        if (!score) return "🤔";
        if (score >= 9) return "🤯";
        if (score >= 7) return "😍";
        if (score >= 5) return "🙂";
        if (score >= 3) return "😬";
        return "🤢";
    };

    if (!pub) {
        return (
            <div className="bg-surface p-6 rounded-lg shadow-lg text-center animate-pulse">
                <p className="text-text-muted mb-4">Loading pub details...</p>
                <button onClick={onBack} className="bg-surface-dynamic text-text px-6 py-2 rounded-lg border-none cursor-pointer font-semibold">Back</button>
            </div>
        );
    }

    if (!criteria || criteria.length === 0) {
        return (
            <div className="bg-surface p-6 rounded-lg shadow-lg text-center">
                <p className="text-text-muted mb-4">No criteria available for rating.</p>
                <button onClick={onBack} className="bg-surface-dynamic text-text px-6 py-2 rounded-lg border-none cursor-pointer font-semibold">Back</button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col relative overflow-hidden">
                
                {/* Smaller Hero Header */}
                <div className="relative h-32 sm:h-48 shrink-0 w-full bg-black">
                    <img 
                        src={pub.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo'} 
                        alt={pub.name} 
                        className="w-full h-full object-cover opacity-70 mix-blend-overlay" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-between p-4 sm:p-6">
                        <button 
                            type="button"
                            onClick={onBack} 
                            className="w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 cursor-pointer transition-all shadow-lg hover:scale-105 self-end"
                        >
                            ✕
                        </button>
                        <div>
                            <h2 className="text-2xl sm:text-4xl font-black text-white mb-1 font-display drop-shadow-lg tracking-tight truncate">{pub.name}</h2>
                            <p className="text-white/90 font-medium flex items-center gap-2 text-xs sm:text-sm font-body uppercase truncate">📍 {pub.location || 'Unknown Location'}</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 pb-28">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="mb-2">
                            <h3 className="text-xl font-black text-text font-display tracking-tight mb-1">What's your verdict?</h3>
                            <p className="text-sm text-text-muted font-body">Be honest. Your group relies on your expertise to find the best spots.</p>
                        </div>

                        {criteria.map((crit) => (
                            <div key={crit.id} className="bg-surface p-5 sm:p-6 rounded-2xl shadow-sm border border-border transition-all hover:shadow-md group">
                                <label className="block text-lg font-bold text-text mb-4 font-display group-hover:text-brand transition-colors">{crit.name}</label>

                                {crit.type === 'scale' && (
                                    <div className="flex flex-col gap-5">
                                        <div className="flex justify-between items-center bg-surface-offset p-3 rounded-xl border border-border shadow-inner">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl drop-shadow-sm">{getScoreEmoji(ratings[crit.id])}</span>
                                                <span className="font-body font-bold text-text-muted text-xs uppercase tracking-wider hidden sm:inline">Score</span>
                                            </div>
                                            <span className="text-2xl font-black text-brand tabular-nums">
                                                {ratings[crit.id] ? ratings[crit.id] : '-'}<span className="text-lg text-text-muted opacity-50">/10</span>
                                            </span>
                                        </div>
                                        <div className="px-2">
                                            <input
                                                type="range" min="1" max="10" step="0.5"
                                                value={ratings[crit.id] || 5}
                                                onChange={(e) => handleRate(crit.id, parseFloat(e.target.value))}
                                                className="w-full h-3 rounded-full cursor-pointer bg-border accent-brand shadow-inner transition-all"
                                            />
                                            <div className="flex justify-between text-[10px] sm:text-xs font-black text-text-muted uppercase tracking-widest mt-3">
                                                <span>Awful</span><span>Average</span><span>Perfect</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {crit.type === 'price' && (
                                    <div className="flex justify-between gap-1.5 sm:gap-3">
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <button
                                                key={num} type="button"
                                                onClick={() => handleRate(crit.id, num)}
                                                className={`flex-1 py-3 rounded-xl text-sm sm:text-lg font-black border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${
                                                    ratings[crit.id] === num 
                                                    ? 'bg-success text-white border-success shadow-lg scale-105' 
                                                    : 'bg-surface-offset text-text-muted border-transparent hover:bg-surface hover:border-border hover:shadow-sm'
                                                }`}
                                            >
                                                {'£'.repeat(num)}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {crit.type === 'yes-no' && (
                                    <div className="flex gap-3 sm:gap-4">
                                        <button type="button" onClick={() => handleRate(crit.id, true)}
                                            className={`flex-1 py-3 rounded-xl text-base sm:text-lg font-black border-2 cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 ${
                                                ratings[crit.id] === true
                                                ? 'bg-success text-white border-success shadow-lg scale-105'
                                                : 'bg-surface-offset text-text-muted border-transparent hover:bg-surface hover:border-border hover:shadow-sm'
                                            }`}>
                                            👍 Yes
                                        </button>
                                        <button type="button" onClick={() => handleRate(crit.id, false)}
                                            className={`flex-1 py-3 rounded-xl text-base sm:text-lg font-black border-2 cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 ${
                                                ratings[crit.id] === false
                                                ? 'bg-error text-white border-error shadow-lg scale-105'
                                                : 'bg-surface-offset text-text-muted border-transparent hover:bg-surface hover:border-border hover:shadow-sm'
                                            }`}>
                                            👎 No
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </form>
                </div>

                {/* Fixed bottom bar inside modal */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-border flex justify-end gap-3 z-40">
                    <button type="button" onClick={onBack}
                        className="px-6 py-3 bg-surface-offset hover:bg-surface text-text text-sm font-black rounded-xl border border-border cursor-pointer transition-all shadow-sm">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                        className={`px-8 py-3 bg-brand text-white text-sm font-black rounded-xl border-none shadow-lg transition-all ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed scale-95' : 'cursor-pointer hover:bg-brand-dark hover:-translate-y-0.5'
                        }`}>
                        {isSubmitting ? 'Saving...' : '🍺 Submit Ratings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
