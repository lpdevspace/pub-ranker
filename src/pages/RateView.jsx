import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

export default function RateView({ pub, criteria, user, onBack, groupRef, groupId, db }) {
    const [ratings, setRatings] = useState({});
    const [ratingDocIds, setRatingDocIds] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- LOAD EXISTING RATINGS (So users can edit past scores!) ---
    useEffect(() => {
        const loadExistingRatings = async () => {
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
    }, [groupRef, pub.id, user.uid, groupId]);
    
    const handleRate = (criterionId, ratingValue) => {
        setRatings((prev) => ({
            ...prev,
            [criterionId]: ratingValue,
        }));
    };

    // --- SUBMIT LOGIC ---
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

                const criterion = criteria.find((c) => c.id === criterionId);
                if (!criterion) continue;
        
                const existingDocId = ratingDocIds[criterionId];

                if (existingDocId) {
                    // UPDATE EXISTING SCORE
                    const docRef = scoresCollectionRef.doc(existingDocId);
                    batch.update(docRef, {
                        value,
                        type: criterion.type,
                        lastEditedBy: user.uid,
                        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                } else {
                    // CREATE NEW SCORE
                    const newScoreRef = scoresCollectionRef.doc();
                    batch.set(newScoreRef, {
                        pubId: pub.id,
                        userId: user.uid,
                        criterionId,
                        value,
                        type: criterion.type,
                        groupId: groupId,
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

    // --- DYNAMIC EMOJI FOR THE SLIDER ---
    const getScoreEmoji = (score) => {
        if (!score) return "🤔";
        if (score >= 9) return "🤯";
        if (score >= 7) return "😍";
        if (score >= 5) return "🙂";
        if (score >= 3) return "😬";
        return "🤢";
    };

    if (criteria.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <p className="text-gray-600 mb-4">No criteria available for rating.</p>
                <button onClick={onBack} className="bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-500 transition">Back</button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-24 animate-fadeIn">
            
            {/* HERO SECTION */}
            <div className="relative h-64 md:h-80 bg-gray-900 rounded-b-3xl overflow-hidden shadow-lg -mx-4 sm:mx-0 mb-8">
                {pub.photoURL ? (
                    <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover opacity-60" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl opacity-50">🍻</div>
                )}
                
                {/* Back Button & Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent flex flex-col justify-between p-6">
                    <button onClick={onBack} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 className="text-4xl font-black text-white drop-shadow-md mb-1">{pub.name}</h2>
                        <p className="text-gray-300 font-medium flex items-center gap-2 drop-shadow-md">
                            📍 {pub.location || 'Unknown Location'}
                        </p>
                    </div>
                </div>
            </div>

            {/* FORM SECTION */}
            <form onSubmit={handleSubmit} className="space-y-6 px-4 sm:px-0">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">What's your verdict?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Be honest. Your group is counting on you.</p>
                </div>

                {criteria.map((crit) => (
                    <div key={crit.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <label className="block text-lg font-bold text-gray-800 dark:text-white mb-4">{crit.name}</label>
                        
                        {/* 1. SCALE INPUT (1-10 Slider) */}
                        {crit.type === 'scale' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <span className="text-3xl">{getScoreEmoji(ratings[crit.id])}</span>
                                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        {ratings[crit.id] ? ratings[crit.id] : '-'}<span className="text-lg text-gray-400">/10</span>
                                    </span>
                                </div>
                                <input 
                                    type="range" min="1" max="10" step="0.5"
                                    value={ratings[crit.id] || 5}
                                    onChange={(e) => handleRate(crit.id, parseFloat(e.target.value))}
                                    className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                                    <span>Awful</span><span>Average</span><span>Perfect</span>
                                </div>
                            </div>
                        )}

                        {/* 2. PRICE INPUT (1-5 Buttons) */}
                        {crit.type === 'price' && (
                            <div className="flex justify-between gap-2">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num} type="button"
                                        onClick={() => handleRate(crit.id, num)}
                                        className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all transform ${ratings[crit.id] === num ? 'bg-green-500 text-white scale-105 shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                        {"£".repeat(num)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 3. CURRENCY INPUT (Exact Price) */}
                        {crit.type === "currency" && (
                            <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                                <div className="relative w-full">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold text-xl">£</span>
                                    <input
                                        type="number" step="0.01" min="0" placeholder="0.00"
                                        value={ratings[crit.id] || ""}
                                        onChange={(e) => handleRate(crit.id, parseFloat(e.target.value))}
                                        className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-center border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Enter the exact price (e.g. 5.40)</p>
                            </div>
                        )}

                        {/* 4. YES/NO INPUT (Pill Toggles) */}
                        {crit.type === 'yes-no' && (
                            <div className="flex gap-4">
                                <button
                                    type="button" onClick={() => handleRate(crit.id, true)}
                                    className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${ratings[crit.id] === true ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    ✅ Yes
                                </button>
                                <button
                                    type="button" onClick={() => handleRate(crit.id, false)}
                                    className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${ratings[crit.id] === false ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    ❌ No
                                </button>
                            </div>
                        )}

{/* THE NEW WRITTEN REVIEW INPUT */}
                {crit.type === "text" && (
                <div className="mb-6">
                    <textarea
                        value={ratings[crit.id] || ""}
                        onChange={(e) => handleRate(crit.id, e.target.value)}
                        placeholder="Leave your thoughts, review, or funny quotes here... (Max 250 chars)"
                        maxLength={250} 
                        className="w-full h-32 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white transition resize-none shadow-inner"
                    />
                    {/* Add a helpful character counter */}
                    <p className={`text-xs text-right mt-1 font-bold ${(ratings[crit.id]?.length || 0) >= 240 ? 'text-red-500' : 'text-gray-400'}`}>
                        {ratings[crit.id]?.length || 0} / 250
                    </p>
                </div>
                )}
                    </div>
                ))}
                
                {/* Spacing for mobile so the fixed button doesn't cover content */}
                <div className="h-12"></div> 
            </form>

            {/* STICKY BOTTOM SUBMIT BAR FOR MOBILE */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-50">
                <div className="max-w-2xl mx-auto flex gap-4">
                    <button type="button" onClick={onBack} className="px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-blue-600 text-white text-lg font-black rounded-xl hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-600/30">
                        {isSubmitting ? 'Saving...' : 'Submit Rating 🍻'}
                    </button>
                </div>
            </div>

        </div>
    );
}