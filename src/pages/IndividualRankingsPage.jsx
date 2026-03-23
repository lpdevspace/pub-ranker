import React, { useState, useMemo } from 'react';

export default function IndividualRankingsPage({ scores, pubs, criteria, allUsers, activeRaters, criteriaWeightMap }) {
    const [selectedUser1, setSelectedUser1] = useState(null);
    const [selectedUser2, setSelectedUser2] = useState(null);

    const getUserName = (userId) => {
        const u = allUsers[userId];
        if (!u) return "Unknown User";
        return u.nickname || u.displayName || u.email || "Unknown User";
    };

    const calculateUserScores = (userId) => {
        if (!userId) return {};
        const userPubScores = {};
        Object.entries(scores).forEach(([pubId, pubScores]) => {
            let totalScore = 0;
            let totalWeight = 0;

            Object.entries(pubScores).forEach(([criterionId, criterionScores]) => {
                const userScore = criterionScores.find((s) => s.userId === userId);
                if (userScore && userScore.type === 'scale' && userScore.value !== null) {
                    const weight = criteriaWeightMap[criterionId] ?? 1;
                    totalScore += userScore.value * weight;
                    totalWeight += weight;
                }
            });

            if (totalWeight > 0) {
                userPubScores[pubId] = totalScore / totalWeight;
            }
        });
        return userPubScores;
    };

    const user1Scores = useMemo(() => calculateUserScores(selectedUser1), [selectedUser1, scores, criteriaWeightMap]);
    const user2Scores = useMemo(() => calculateUserScores(selectedUser2), [selectedUser2, scores, criteriaWeightMap]);

    const rankedPubs = useMemo(() => {
        let baseUserScores = user1Scores;
        if (!selectedUser1 && selectedUser2) baseUserScores = user2Scores;

        return pubs
            .map((pub) => ({
                ...pub,
                score1: user1Scores[pub.id] ?? null,
                score2: user2Scores[pub.id] ?? null,
                primaryScore: baseUserScores[pub.id] ?? 0
            }))
            .filter(pub => pub.score1 !== null || pub.score2 !== null)
            .sort((a, b) => b.primaryScore - a.primaryScore);
    }, [selectedUser1, selectedUser2, pubs, user1Scores, user2Scores]);

    // FEATURES 17 & 18: COMPATIBILITY & DISAGREEMENTS
    const { compatibilityScore, mostDisagreedPub } = useMemo(() => {
        if (!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2) return { compatibilityScore: null, mostDisagreedPub: null };

        let totalDiff = 0;
        let overlappingCount = 0;
        let maxDiff = -1;
        let disagreedPub = null;

        rankedPubs.forEach(pub => {
            if (pub.score1 !== null && pub.score2 !== null) {
                overlappingCount++;
                const diff = Math.abs(pub.score1 - pub.score2);
                totalDiff += diff;

                if (diff > maxDiff) {
                    maxDiff = diff;
                    disagreedPub = pub;
                }
            }
        });

        let compScore = null;
        if (overlappingCount > 0) {
            const avgDiff = totalDiff / overlappingCount;
            compScore = Math.max(0, 100 - (avgDiff * 10)); // Assuming a 10-point scale
        }

        return { compatibilityScore: compScore, mostDisagreedPub: disagreedPub };
    }, [rankedPubs, selectedUser1, selectedUser2]);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-white transition-colors">Versus Mode</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Compare tastes, settle arguments.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6 transition-colors duration-300">
                <div>
                    <label className="block text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Player 1</label>
                    <select
                        value={selectedUser1 || ""}
                        onChange={(e) => setSelectedUser1(e.target.value || null)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold"
                    >
                        <option value="">Select a user...</option>
                        {Array.from(activeRaters).map((userId) => (
                            <option key={userId} value={userId}>{getUserName(userId)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">Player 2 (Compare)</label>
                    <select
                        value={selectedUser2 || ""}
                        onChange={(e) => setSelectedUser2(e.target.value || null)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold"
                    >
                        <option value="">None (Single View)</option>
                        {Array.from(activeRaters).map((userId) => (
                            <option key={userId} value={userId}>{getUserName(userId)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* --- NEW: COMPATIBILITY DASHBOARD --- */}
            {compatibilityScore !== null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase font-bold tracking-wider text-blue-100 mb-1">Taste Compatibility</p>
                            <h3 className="text-4xl font-black">{compatibilityScore.toFixed(0)}%</h3>
                        </div>
                        <div className="text-5xl opacity-80">{compatibilityScore > 80 ? '👯‍♂️' : compatibilityScore > 50 ? '🍻' : '🥊'}</div>
                    </div>

                    {mostDisagreedPub && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-2xl shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase font-bold tracking-wider text-red-600 dark:text-red-400 mb-1">Biggest Disagreement</p>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white truncate">{mostDisagreedPub.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {getUserName(selectedUser1)}: <span className="font-bold">{mostDisagreedPub.score1.toFixed(1)}</span> vs {getUserName(selectedUser2)}: <span className="font-bold">{mostDisagreedPub.score2.toFixed(1)}</span>
                                </p>
                            </div>
                            <div className="text-4xl filter drop-shadow">🤬</div>
                        </div>
                    )}
                </div>
            )}

            {(selectedUser1 || selectedUser2) && (
                <div className="space-y-3">
                    {rankedPubs.map((pub) => {
                        const isComparing = selectedUser1 && selectedUser2 && selectedUser1 !== selectedUser2;
                        let u1Won = false; let u2Won = false;
                        if (isComparing && pub.score1 !== null && pub.score2 !== null) {
                            if (pub.score1 > pub.score2) u1Won = true;
                            if (pub.score2 > pub.score1) u2Won = true;
                        }

                        return (
                            <div key={pub.id} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow duration-300">
                                
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">{pub.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">📍 {pub.location || 'Unknown'}</p>
                                </div>

                                <div className="w-full sm:w-auto flex justify-end">
                                    {!isComparing ? (
                                        <div className="text-right">
                                            <div className={`text-3xl font-black ${selectedUser1 ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                                {pub.primaryScore > 0 ? pub.primaryScore.toFixed(1) : '-'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2 border border-gray-100 dark:border-gray-600 w-full sm:w-auto justify-between sm:justify-end">
                                            <div className={`flex flex-col items-center px-4 py-2 rounded-lg min-w-[70px] ${u1Won ? 'bg-blue-100 dark:bg-blue-900/50 shadow-inner' : ''}`}>
                                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1">{getUserName(selectedUser1).split(' ')[0]}</span>
                                                {pub.score1 !== null ? (
                                                    <span className={`text-xl font-black ${u1Won ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{pub.score1.toFixed(1)}</span>
                                                ) : <span className="text-sm text-gray-400 italic">N/A</span>}
                                                {u1Won && <span className="text-[10px] mt-1">👑</span>}
                                            </div>
                                            
                                            <span className="text-gray-300 dark:text-gray-500 font-black italic text-lg px-1">VS</span>
                                            
                                            <div className={`flex flex-col items-center px-4 py-2 rounded-lg min-w-[70px] ${u2Won ? 'bg-purple-100 dark:bg-purple-900/50 shadow-inner' : ''}`}>
                                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1">{getUserName(selectedUser2).split(' ')[0]}</span>
                                                {pub.score2 !== null ? (
                                                    <span className={`text-xl font-black ${u2Won ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>{pub.score2.toFixed(1)}</span>
                                                ) : <span className="text-sm text-gray-400 italic">N/A</span>}
                                                {u2Won && <span className="text-[10px] mt-1">👑</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}