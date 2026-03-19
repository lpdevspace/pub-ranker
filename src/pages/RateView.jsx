import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

export default function RateView({ pub, criteria, user, onBack, groupRef, groupId, db }) {
    const [currentCriterion, setCurrentCriterion] = useState(0);
    const [ratings, setRatings] = useState({});
    const [ratingDocIds, setRatingDocIds] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const batch = db.batch(); 
            const scoresCollectionRef = groupRef.collection("scores");
        
            for (const [criterionId, value] of Object.entries(ratings)) {
                const criterion = criteria.find((c) => c.id === criterionId);
                if (!criterion) continue;
        
                const existingDocId = ratingDocIds[criterionId];

                if (existingDocId) {
                    const docRef = scoresCollectionRef.doc(existingDocId);
                    batch.update(docRef, {
                        value,
                        type: criterion.type,
                        lastEditedBy: user.uid,
                        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                } else {
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
            setIsSubmitting(false);
        }
    };

    if (criteria.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <p className="text-gray-600 mb-4">
                    No criteria available for rating.
                </p>
                <button
                    onClick={onBack}
                    className="bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-500 transition"
                >
                    Back
                </button>
            </div>
        );
    }
    
    const criterion = criteria[currentCriterion];
    const currentRating = ratings[criterion.id];
    
return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto transition-colors duration-300">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{pub.name}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{pub.location}</p>
        
            <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    {criterion.name}
                </h3>
        
                {criterion.type === "scale" && (
                <div className="flex gap-2 justify-center mb-6 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <button
                        key={value}
                        onClick={() => handleRate(criterion.id, value)}
                        className={
                            "w-12 h-12 rounded-lg font-bold transition " +
                            (currentRating === value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600")
                        }
                    >
                        {value}
                    </button>
                    ))}
                </div>
                )}
        
                {criterion.type === "price" && (
                <div className="flex gap-2 justify-center mb-6 flex-wrap">
                    {[1, 2, 3, 4, 5].map((value) => (
                    <button
                        key={value}
                        onClick={() => handleRate(criterion.id, value)}
                        className={
                            "px-6 py-3 rounded-lg font-bold transition " +
                            (currentRating === value
                            ? "bg-yellow-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600")
                        }
                    >
                        {"£".repeat(value)}
                    </button>
                    ))}
                </div>
                )}

                {/* THE NEW CURRENCY INPUT */}
                {criterion.type === "currency" && (
                <div className="flex flex-col items-center justify-center mb-6 max-w-xs mx-auto">
                    <div className="relative w-full">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold text-xl">£</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={currentRating || ""}
                            onChange={(e) => handleRate(criterion.id, parseFloat(e.target.value))}
                            className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-center border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white transition"
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Enter the exact price (e.g. 5.40)</p>
                </div>
                )}
                {/* THE NEW WRITTEN REVIEW INPUT */}
                {criterion.type === "text" && (
                <div className="mb-6">
                    <textarea
                        value={currentRating || ""}
                        onChange={(e) => handleRate(criterion.id, e.target.value)}
                        placeholder="Leave your thoughts, review, or funny quotes here..."
                        className="w-full h-32 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white transition resize-none shadow-inner"
                    />
                </div>
                )}
        
                {criterion.type === "yes-no" && (
                <div className="flex gap-4 justify-center mb-6">
                    <button
                        onClick={() => handleRate(criterion.id, true)}
                        className={
                            "px-6 py-3 rounded-lg font-bold transition " +
                            (currentRating === true
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600")
                        }
                    >
                        Yes
                    </button>
                    <button
                        onClick={() => handleRate(criterion.id, false)}
                        className={
                            "px-6 py-3 rounded-lg font-bold transition " +
                            (currentRating === false
                            ? "bg-red-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600")
                        }
                    >
                        No
                    </button>
                </div>
                )}
            </div>
        
            <div className="flex justify-between gap-4 mb-6">
                <button
                    onClick={() => setCurrentCriterion((c) => Math.max(0, c - 1))}
                    disabled={currentCriterion === 0}
                    className="flex-1 bg-gray-400 dark:bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-500 dark:hover:bg-gray-500 transition disabled:opacity-50"
                >
                    Previous
                </button>
                <div className="text-center py-2 dark:text-gray-300">
                    {currentCriterion + 1} / {criteria.length}
                </div>
                <button
                    onClick={() => setCurrentCriterion((c) => Math.min(criteria.length - 1, c + 1))}
                    disabled={currentCriterion === criteria.length - 1}
                    className="flex-1 bg-gray-400 dark:bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-500 dark:hover:bg-gray-500 transition disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        
            <div className="flex gap-3">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 bg-gray-400 dark:bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-500 dark:hover:bg-gray-500 transition"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}