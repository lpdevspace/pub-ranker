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
                    });
                }
            }
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
        <div className="max-w-2xl mx-auto pb-24 animate-fadeIn">
            {/* Hero image */}
            <div className="relative h-64 md:h-80 bg-gray-900 rounded-b-xl overflow-hidden -mx-4 sm:mx-0 mb-8 shadow-lg">
                <img src={pub.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo'} alt={pub.name} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-between p-6">
                    <button onClick={onBack} className="w-10 h-10 bg-white/20 hover:bg-white/35 backdrop-blur-md rounded-full flex items-center justify-center text-white border-none cursor-pointer transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-white mb-1 font-display drop-shadow-md">{pub.name}</h2>
                        <p className="text-white/80 font-medium flex items-center gap-2">📍 {pub.location || 'Unknown Location'}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 sm:px-0">
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-text">What's your verdict?</h3>
                    <p className="text-sm text-text-muted">Be honest. Your group is counting on you.</p>
                </div>

                {criteria.map((crit) => (
                    <div key={crit.id} className="bg-surface p-6 rounded-xl shadow-sm border border-border">
                        <label className="block text-lg font-bold text-text mb-4">{crit.name}</label>

                        {crit.type === 'scale' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center bg-surface-offset p-3 rounded-lg border border-border">
                                    <span className="text-3xl">{getScoreEmoji(ratings[crit.id])}</span>
                                    <span className="text-xl font-black text-brand tabular-nums">
                                        {ratings[crit.id] ? ratings[crit.id] : '-'}<span className="text-lg text-text-muted">/10</span>
                                    </span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="0.5"
                                    value={ratings[crit.id] || 5}
                                    onChange={(e) => handleRate(crit.id, parseFloat(e.target.value))}
                                    className="w-full h-3 rounded-full appearance-none cursor-pointer bg-surface-dynamic accent-brand"
                                />
                                <div className="flex justify-between text-xs font-bold text-text-muted uppercase">
                                    <span>Awful</span><span>Average</span><span>Perfect</span>
                                </div>
                            </div>
                        )}

                        {crit.type === 'price' && (
                            <div className="flex justify-between gap-2">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num} type="button"
                                        onClick={() => handleRate(crit.id, num)}
                                        className={`flex-1 py-3 rounded-lg text-lg font-bold border-none cursor-pointer transition-all ${
                                            ratings[crit.id] === num 
                                            ? 'bg-success text-white scale-105 shadow-md' 
                                            : 'bg-surface-offset text-text-muted hover:bg-surface-2'
                                        }`}
                                    >
                                        {'£'.repeat(num)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {crit.type === 'yes-no' && (
                            <div className="flex gap-4">
                                <button type="button" onClick={() => handleRate(crit.id, true)}
                                    className={`flex-1 py-3 rounded-lg text-lg font-bold border-none cursor-pointer transition-all ${
                                        ratings[crit.id] === true
                                        ? 'bg-success text-white scale-105 shadow-md'
                                        : 'bg-surface-offset text-text-muted hover:bg-surface-2'
                                    }`}>
                                    👍 Yes
                                </button>
                                <button type="button" onClick={() => handleRate(crit.id, false)}
                                    className={`flex-1 py-3 rounded-lg text-lg font-bold border-none cursor-pointer transition-all ${
                                        ratings[crit.id] === false
                                        ? 'bg-error text-white scale-105 shadow-md'
                                        : 'bg-surface-offset text-text-muted hover:bg-surface-2'
                                    }`}>
                                    👎 No
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Fixed bottom bar */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/90 backdrop-blur-md border-t border-border flex gap-3 z-40">
                    <button type="button" onClick={onBack}
                        className="flex-1 bg-surface-offset hover:bg-surface-dynamic text-text text-lg font-black rounded-lg py-4 border-none cursor-pointer transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                        className={`flex-1 bg-brand text-white text-lg font-black rounded-lg py-4 border-none shadow-md transition-colors ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-brand-dark'
                        }`}>
                        {isSubmitting ? 'Saving...' : '🍺 Submit Ratings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
