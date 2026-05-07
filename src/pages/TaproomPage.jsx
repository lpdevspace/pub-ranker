import React, { useState, useEffect } from 'react';
import { getUserDisplayName, getUserAvatar } from '../utils/users';

export default function TaproomPage({ db, groupId, pubs, allUsers, criteria }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !groupId) return;
        const unsubscribe = db.collectionGroup('scores')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                const recentScores = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const grouped = {};
                recentScores.forEach(score => {
                    const timeKey = score.createdAt ? Math.floor(score.createdAt.toMillis() / 60000) : 'now';
                    const key = `${score.userId}_${score.pubId}_${timeKey}`;
                    if (!grouped[key]) {
                        grouped[key] = { id: key, userId: score.userId, pubId: score.pubId, timestamp: score.createdAt, ratings: [], textReview: null };
                    }
                    if (score.type === 'text' && score.value) grouped[key].textReview = score.value;
                    else grouped[key].ratings.push(score);
                });
                setActivities(Object.values(grouped).sort((a, b) => {
                    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
                    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
                    return timeB - timeA;
                }));
                setLoading(false);
            });
        return () => unsubscribe();
    }, [db, groupId]);

    const getPub = (pid) => pubs.find(p => p.id === pid) || { name: 'Unknown Pub', photoURL: '' };
    const getCriterionName = (cid) => criteria.find(c => c.id === cid)?.name || 'Score';

    return (
        <div style={{ maxWidth: '42rem', margin: '0 auto' }} className="space-y-6 animate-fadeIn pb-20">
            <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>🍺 The Taproom</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Live activity and recent ratings from the group.</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-faint)' }} className="animate-pulse">Pouring pints...</div>
            ) : activities.length === 0 ? (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-3)' }}>🦗</span>
                    <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>It's quiet in here. Go rate some pubs!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    {activities.map((activity) => {
                        const displayName = getUserDisplayName(activity.userId, allUsers);
                        const avatarUrl = getUserAvatar(activity.userId, allUsers);
                        const pub = getPub(activity.pubId);
                        const time = activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Just now';

                        return (
                            <div key={activity.id} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                                {/* Activity Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)' }}>
                                    {avatarUrl
                                        ? <img src={avatarUrl} alt={displayName} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }} />
                                        : <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{displayName[0]?.toUpperCase()}</div>
                                    }
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>rated <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{pub.name}</span> · {time}</p>
                                    </div>
                                    {pub.photoURL && <img src={pub.photoURL} alt={pub.name} style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }} />}
                                </div>

                                {/* Ratings */}
                                {activity.ratings.length > 0 && (
                                    <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                        {activity.ratings.map((r, i) => (
                                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', background: 'var(--color-brand-highlight)', color: 'var(--color-brand)', fontSize: 'var(--text-xs)', fontWeight: 700, padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-full)' }}>
                                                {getCriterionName(r.criterionId)}: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Text Review */}
                                {activity.textReview && (
                                    <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic', borderLeft: '2px solid var(--color-brand-light)', paddingLeft: 'var(--space-3)' }}>"{ activity.textReview}"</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
