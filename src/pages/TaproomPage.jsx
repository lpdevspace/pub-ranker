import React, { useState, useEffect } from 'react';

export default function TaproomPage({ db, groupId, pubs, allUsers, criteria }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !groupId) return;
        
        // Fetch the 50 most recent ratings in this group
        const unsubscribe = db.collectionGroup('scores')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                const recentScores = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Group scores by User and Pub if they were submitted at the same time
                // (This prevents 5 separate feed items if a user rates 5 criteria at once)
                const grouped = {};
                recentScores.forEach(score => {
                    // Create a unique key based on User, Pub, and roughly the same minute
                    const timeKey = score.createdAt ? Math.floor(score.createdAt.toMillis() / 60000) : 'now';
                    const key = `${score.userId}_${score.pubId}_${timeKey}`;
                    
                    if (!grouped[key]) {
                        grouped[key] = {
                            id: key,
                            userId: score.userId,
                            pubId: score.pubId,
                            timestamp: score.createdAt,
                            ratings: [],
                            textReview: null
                        };
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

    const getUser = (uid) => allUsers[uid] || { displayName: 'Unknown User', avatarUrl: '' };
    const getPub = (pid) => pubs.find(p => p.id === pid) || { name: 'Unknown Pub', photoURL: '' };
    const getCriterionName = (cid) => criteria.find(c => c.id === cid)?.name || 'Score';

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-20">
            <div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-white">The Taproom</h2>
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
                        const user = getUser(activity.userId);
                        const pub = getPub(activity.pubId);
                        const time = activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Just now';
                        
                        // Calculate an average rating for this specific session
                        const scaleRatings = activity.ratings.filter(r => r.type === 'scale' && r.value !== null);
                        const avgScore = scaleRatings.length > 0 
                            ? (scaleRatings.reduce((sum, r) => sum + r.value, 0) / scaleRatings.length).toFixed(1) 
                            : null;

                        return (
                            <div key={activity.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {/* Feed Header */}
                                <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                {user.displayName?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white leading-tight">{user.displayName || user.email}</p>
                                            <p className="text-xs text-gray-500">Rated <span className="font-bold text-brand">{pub.name}</span></p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{time}</span>
                                </div>

                                {/* Feed Content */}
                                <div className="p-4 flex flex-col md:flex-row gap-4">
                                    {pub.photoURL && (
                                        <img src={pub.photoURL} alt={pub.name} className="w-full md:w-32 h-32 object-cover rounded-xl shadow-sm" />
                                    )}
                                    
                                    <div className="flex-1 space-y-3">
                                        {avgScore && (
                                            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                                <span className="text-xl">⭐</span>
                                                <span className="font-black text-blue-700 dark:text-blue-400 text-lg">{avgScore}/10 Average</span>
                                            </div>
                                        )}

                                        {activity.textReview && (
                                            <div className="relative">
                                                <span className="absolute -top-2 -left-2 text-3xl text-gray-200 dark:text-gray-700 font-serif">"</span>
                                                <p className="italic text-gray-700 dark:text-gray-300 font-medium pl-4 z-10 relative">
                                                    {activity.textReview}
                                                </p>
                                            </div>
                                        )}

                                        {/* Micro-breakdown of scores */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {activity.ratings.slice(0, 4).map(r => (
                                                <span key={r.id} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-bold uppercase tracking-wider">
                                                    {getCriterionName(r.criterionId)}: 
                                                    <span className="text-brand ml-1">
                                                        {r.type === 'yes-no' ? (r.value ? 'Yes' : 'No') : r.value}
                                                    </span>
                                                </span>
                                            ))}
                                            {activity.ratings.length > 4 && <span className="text-xs text-gray-400 font-bold">+{activity.ratings.length - 4} more</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}