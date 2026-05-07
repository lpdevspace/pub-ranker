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
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-20">
            <div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-white">🍺 The Taproom</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Live activity and recent ratings from the group.</p>
            </div>

            {loading ? (
                <div className="text-center py-12 animate-pulse text-gray-400">Pouring pints...</div>
            ) : activities.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl text-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-4xl mb-3 block">🦗</span>
                    <p className="text-gray-500 font-medium">It's quiet in here. Go rate some pubs!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {activities.map((activity) => {
                        const displayName = getUserDisplayName(activity.userId, allUsers);
                        const avatarUrl = getUserAvatar(activity.userId, allUsers);
                        const pub = getPub(activity.pubId);
                        const time = activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Just now';

                        return (
                            <div key={activity.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {/* Activity Header */}
                                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                                    {avatarUrl
                                        ? <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                                        : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold">{displayName[0]?.toUpperCase()}</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 dark:text-white text-sm truncate">{displayName}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">rated <span className="font-semibold text-gray-600 dark:text-gray-300">{pub.name}</span> · {time}</p>
                                    </div>
                                    {pub.photoURL && <img src={pub.photoURL} alt={pub.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                                </div>

                                {/* Ratings */}
                                {activity.ratings.length > 0 && (
                                    <div className="px-4 py-3 flex flex-wrap gap-2">
                                        {activity.ratings.map((r, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
                                                {getCriterionName(r.criterionId)}: <span className="tabular-nums">{r.value}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Text Review */}
                                {activity.textReview && (
                                    <div className="px-4 pb-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 italic border-l-2 border-amber-300 dark:border-amber-700 pl-3">"{activity.textReview}"</p>
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
