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
            for (const [criterionId, value] of Object.entries(ratings)) {
                if (value === null || value === "") continue;
                const safeCriteria = criteria || [];
                const criterion = safeCriteria.find((c) => c.id === criterionId);
                if (!criterion) continue;
                const existingDocId = ratingDocIds[criterionId];
                if (existingDocId) {
                    const docRef = scoresCollectionRef.doc(existingDocId);
                    batch.update(docRef, { value, type: criterion.type, lastEditedBy: user.uid, lastEditedAt: firebase.firestore.FieldValue.serverTimestamp() });
                } else {
                    const newScoreRef = scoresCollectionRef.doc();
                    batch.set(newScoreRef, { pubId: pub.id, userId: user.uid, criterionId, value, type: criterion.type, groupId, timestamp: firebase.firestore.FieldValue.serverTimestamp(), lastEditedBy: user.uid, lastEditedAt: firebase.firestore.FieldValue.serverTimestamp() });
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
            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }} className="animate-pulse">
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Loading pub details...</p>
                <button onClick={onBack} style={{ background: 'var(--color-surface-dynamic)', color: 'var(--color-text)', padding: 'var(--space-2) var(--space-6)', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
            </div>
        );
    }

    if (!criteria || criteria.length === 0) {
        return (
            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>No criteria available for rating.</p>
                <button onClick={onBack} style={{ background: 'var(--color-surface-dynamic)', color: 'var(--color-text)', padding: 'var(--space-2) var(--space-6)', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '42rem', margin: '0 auto', paddingBottom: 'var(--space-24)' }} className="animate-fadeIn">
            {/* Hero image */}
            <div style={{ position: 'relative', height: '16rem', background: '#111', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)', overflow: 'hidden', margin: '0 -1rem 2rem', boxShadow: 'var(--shadow-lg)' }} className="md:h-80 sm:mx-0">
                {pub.photoURL ? (
                    <img src={pub.photoURL} alt={pub.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', opacity: 0.5 }}>🍻</div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-6)' }}>
                    <button onClick={onBack} style={{ width: '2.5rem', height: '2.5rem', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background var(--transition-interactive)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>
                        <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: '#fff', marginBottom: 'var(--space-1)', fontFamily: 'var(--font-display)', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{pub.name}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>📍 {pub.location || 'Unknown Location'}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: '0 var(--space-4)' }} className="sm:px-0">
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>What's your verdict?</h3>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Be honest. Your group is counting on you.</p>
                </div>

                {criteria.map((crit) => (
                    <div key={crit.id} style={{ background: 'var(--color-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>{crit.name}</label>

                        {crit.type === 'scale' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-offset)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                                    <span style={{ fontSize: '2rem' }}>{getScoreEmoji(ratings[crit.id])}</span>
                                    <span style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-brand)', fontVariantNumeric: 'tabular-nums' }}>
                                        {ratings[crit.id] ? ratings[crit.id] : '-'}<span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)' }}>/10</span>
                                    </span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="0.5"
                                    value={ratings[crit.id] || 5}
                                    onChange={(e) => handleRate(crit.id, parseFloat(e.target.value))}
                                    style={{ width: '100%', height: '0.75rem', borderRadius: 'var(--radius-full)', appearance: 'none', cursor: 'pointer', accentColor: 'var(--color-brand)', background: 'var(--color-surface-dynamic)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                    <span>Awful</span><span>Average</span><span>Perfect</span>
                                </div>
                            </div>
                        )}

                        {crit.type === 'price' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num} type="button"
                                        onClick={() => handleRate(crit.id, num)}
                                        style={{
                                            flex: 1, padding: 'var(--space-3) 0', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-lg)', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all var(--transition-interactive)',
                                            background: ratings[crit.id] === num ? 'var(--color-success)' : 'var(--color-surface-offset)',
                                            color: ratings[crit.id] === num ? '#fff' : 'var(--color-text-muted)',
                                            transform: ratings[crit.id] === num ? 'scale(1.05)' : 'none',
                                            boxShadow: ratings[crit.id] === num ? 'var(--shadow-md)' : 'none'
                                        }}
                                    >
                                        {'£'.repeat(num)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {crit.type === 'yes-no' && (
                            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                <button type="button" onClick={() => handleRate(crit.id, true)}
                                    style={{
                                        flex: 1, padding: 'var(--space-3) 0', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-lg)', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all var(--transition-interactive)',
                                        background: ratings[crit.id] === true ? 'var(--color-success)' : 'var(--color-surface-offset)',
                                        color: ratings[crit.id] === true ? '#fff' : 'var(--color-text-muted)',
                                        transform: ratings[crit.id] === true ? 'scale(1.05)' : 'none'
                                    }}>
                                    👍 Yes
                                </button>
                                <button type="button" onClick={() => handleRate(crit.id, false)}
                                    style={{
                                        flex: 1, padding: 'var(--space-3) 0', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-lg)', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all var(--transition-interactive)',
                                        background: ratings[crit.id] === false ? 'var(--color-error)' : 'var(--color-surface-offset)',
                                        color: ratings[crit.id] === false ? '#fff' : 'var(--color-text-muted)',
                                        transform: ratings[crit.id] === false ? 'scale(1.05)' : 'none'
                                    }}>
                                    👎 No
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Fixed bottom bar */}
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 'var(--space-4)', background: 'color-mix(in oklch, var(--color-surface) 90%, transparent)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-3)', zIndex: 40 }}>
                    <button type="button" onClick={onBack}
                        style={{ flex: 1, background: 'var(--color-surface-offset)', color: 'var(--color-text)', fontSize: 'var(--text-lg)', fontWeight: 900, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) 0', border: 'none', cursor: 'pointer', transition: 'background var(--transition-interactive)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-dynamic)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                        style={{ flex: 1, background: 'var(--color-brand)', color: '#fff', fontSize: 'var(--text-lg)', fontWeight: 900, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) 0', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.5 : 1, boxShadow: 'var(--shadow-md)', transition: 'background var(--transition-interactive)' }}
                        onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = 'var(--color-brand-dark)'; }}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand)'}>
                        {isSubmitting ? 'Saving...' : '🍺 Submit Ratings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
