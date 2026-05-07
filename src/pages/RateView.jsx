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
            } catch (e) {
                console.error("Error loading existing ratings", e);
            }
        };
        loadExistingRatings();
    }, [groupRef, pub, user, groupId]);
    
    const handleRate = (criterionId, ratingValue) => {
        setRatings((prev) => ({ ...prev, [criterionId]: ratingValue }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (Object.keys(ratings).length === 0) {
            alert("Please rate at least one thing!");
            return;
        }
        setIsSubmitting(true);
        try {
            const batch = db.batch(); 
            const scoresCollectionRef = groupRef.collection("scores");
            for (const [criterionId, value] of Object.entries(ratings)) {
                if (value === null || value === "") continue;
                const safeCriteria = criteria || [];
                const criterion = safeCriteria.find((c) => c.id === criterionId);
                if (!criterion) continue;
                const existingDocId = ratingDocIds[criterionId];
                if (existingDocId) {
                    const docRef = scoresCollectionRef.doc(existingDocId);
                    batch.update(docRef, {
                        value, type: criterion.type,
                        lastEditedBy: user.uid,
                        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                } else {
                    const newScoreRef = scoresCollectionRef.doc();
                    batch.set(newScoreRef, {
                        pubId: pub.id, userId: user.uid, criterionId, value,
                        type: criterion.type, groupId: groupId,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        lastEditedBy: user.uid,
                        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center animate-pulse">
                <p className="text-gray-600 dark:text-gray-400 mb-4">Loading pub details...</p>
                <button onClick={onBack} className="bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-500 transition">Back</button>
            </div>
        );
    }

    if (!criteria || criteria.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">No criteria available for rating.</p>
                <button onClick={onBack} className="bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-500 transition">Back</button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-24 animate-fadeIn">
            <div className="relative h-64 md:h-80 bg-gray-900 rounded-b-3xl overflow-hidden shadow-lg -mx-4 sm:mx-0 mb-8">
                {pub.photoURL ? (
                    <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover opacity-60" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl opacity-50">🍻</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent flex flex-col justify-between p-6">
                    <button onClick={onBack} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 className="text-4xl font-black text-white drop-shadow-md mb-1">{pub.name}</h2>
                        <p className="text-gray-300 font-medium flex items-center gap-2 drop-shadow-md">📍 {pub.location || 'Unknown Location'}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-4 sm:px-0">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">What's your verdict?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Be honest. Your group is counting on you.</p>
                </div>

                {criteria.map((crit) => (
                    <div key={crit.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <label className="block text-lg font-bold text-gray-800 dark:text-white mb-4">{crit.name}</label>
                        
                        {crit.type === 'scale' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <span className="text-3xl">{getScoreEmoji(ratings[crit.id])}</span>
                                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                        {ratings[crit.id] ? ratings[crit.id] : '-'}<span className="text-lg text-gray-400">/10</span>
                                    </span>
                                </div>
                                <input 
                                    type="range" min="1" max="10" step="0.5"
                                    value={ratings[crit.id] || 5}
                                    onChange={(e) => handleRate(crit.id, parseFloat(e.target.value))}
                                    className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                />
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
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
                                        className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all transform ${ratings[crit.id] === num ? 'bg-green-500 text-white scale-105 shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                        {'£'.repeat(num)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {crit.type === 'yes-no' && (
                            <div className="flex gap-4">
                                <button type="button" onClick={() => handleRate(crit.id, true)}
                                    className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all transform ${ratings[crit.id] === true ? 'bg-green-500 text-white scale-105 shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                    👍 Yes
                                </button>
                                <button type="button" onClick={() => handleRate(crit.id, false)}
                                    className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all transform ${ratings[crit.id] === false ? 'bg-red-500 text-white scale-105 shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                    👎 No
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex gap-3 z-40">
                    <button type="button" onClick={onBack} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-lg font-black rounded-xl py-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-amber-600 text-white text-lg font-black rounded-xl py-4 hover:bg-amber-700 transition disabled:opacity-50 shadow-lg shadow-amber-500/20">
                        {isSubmitting ? 'Saving...' : '🍺 Submit Ratings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
