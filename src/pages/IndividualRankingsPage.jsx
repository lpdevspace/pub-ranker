import React, { useState, useMemo } from 'react';

export default function IndividualRankingsPage({ scores, pubs, criteria, allUsers, activeRaters, criteriaWeightMap }) {
    const [selectedUser1, setSelectedUser1] = useState(null);
    const [selectedUser2, setSelectedUser2] = useState(null);

    const getUserName = (userId) => {
        const u = allUsers[userId];
        if (!u) return "Unknown User";
        return u.nickname || u.displayName || u.email || "Unknown User";
    };

    const getUserAvatar = (userId) => {
        const u = allUsers[userId];
        return u?.avatarUrl || "";
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

    const isComparing = selectedUser1 && selectedUser2 && selectedUser1 !== selectedUser2;

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn">
            <div className="text-center md:text-left">
                <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-2">Personal Leaderboards</h2>
                <p className="text-gray-500 dark:text-gray-400">View an individual's top pubs, or compare two mates head-to-head.</p>
            </div>

            {/* --- USER SELECTION PANELS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* User 1 (Blue Theme) */}
                <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${selectedUser1 ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-600 shadow-md' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-sm'}`}>
                    <label className="block text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Player 1</label>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-xl shadow-inner overflow-hidden flex-shrink-0">
                            {selectedUser1 ? (getUserAvatar(selectedUser1) ? <img src={getUserAvatar(selectedUser1)} alt="Avatar" className="w-full h-full object-cover" /> : getUserName(selectedUser1).charAt(0).toUpperCase()) : '👤'}
                        </div>
                        <select
                            value={selectedUser1 || ""}
                            onChange={(e) => setSelectedUser1(e.target.value || null)}
                            className="w-full px-4 py-3 border-none bg-white dark:bg-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 dark:text-white cursor-pointer"
                        >
                            <option value="">Select a user...</option>
                            {Array.from(activeRaters).map((userId) => (
                                <option key={userId} value={userId}>{getUserName(userId)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* User 2 (Purple Theme) */}
                <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${selectedUser2 ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/20 dark:border-purple-600 shadow-md' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-sm'}`}>
                    <label className="block text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">Player 2 (Compare)</label>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-xl shadow-inner overflow-hidden flex-shrink-0">
                            {selectedUser2 ? (getUserAvatar(selectedUser2) ? <img src={getUserAvatar(selectedUser2)} alt="Avatar" className="w-full h-full object-cover" /> : getUserName(selectedUser2).charAt(0).toUpperCase()) : '👤'}
                        </div>
                        <select
                            value={selectedUser2 || ""}
                            onChange={(e) => setSelectedUser2(e.target.value || null)}
                            className="w-full px-4 py-3 border-none bg-white dark:bg-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 font-bold text-gray-800 dark:text-white cursor-pointer"
                        >
                            <option value="">None (Single View)</option>
                            {Array.from(activeRaters).map((userId) => (
                                <option key={userId} value={userId}>{getUserName(userId)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* --- EMPTY STATE --- */}
            {!selectedUser1 && !selectedUser2 && (
                <div className="text-center py-16 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                    <span className="text-6xl mb-4 block opacity-50">📊</span>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Awaiting Players</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Select a player above to see their personal top-rated pubs, or select two to compare their tastes side-by-side.</p>
                </div>
            )}

            {/* --- THE LEADERBOARD --- */}
            {(selectedUser1 || selectedUser2) && (
                <div className="space-y-4">
                    {/* Header Row for List */}
                    <div className="flex justify-between px-4 pb-2 border-b-2 border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pub</span>
                        {isComparing ? (
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Head-to-Head</span>
                        ) : (
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Score</span>
                        )}
                    </div>

                    {rankedPubs.map((pub, index) => {
                        const rank = index + 1;
                        let rankBadge = <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-black text-sm">{rank}</div>;
                        if (!isComparing) {
                            if (rank === 1) rankBadge = <div className="text-3xl filter drop-shadow-md">🥇</div>;
                            else if (rank === 2) rankBadge = <div className="text-3xl filter drop-shadow-md">🥈</div>;
                            else if (rank === 3) rankBadge = <div className="text-3xl filter drop-shadow-md">🥉</div>;
                        }

                        // Determine winner in comparison mode
                        let u1Won = false; let u2Won = false;
                        if (isComparing && pub.score1 !== null && pub.score2 !== null) {
                            if (pub.score1 > pub.score2) u1Won = true;
                            if (pub.score2 > pub.score1) u2Won = true;
                        }

                        return (
                            <div key={pub.id} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow duration-300">
                                
                                {/* Pub Info & Rank */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="flex-shrink-0 w-10 flex justify-center">
                                        {rankBadge}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">{pub.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">📍 {pub.location || 'Unknown'}</p>
                                    </div>
                                </div>

                                {/* Scores */}
                                <div className="w-full sm:w-auto flex justify-end">
                                    {!isComparing ? (
                                        // SINGLE USER VIEW
                                        <div className="text-right">
                                            <div className={`text-3xl font-black ${selectedUser1 ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                                {pub.primaryScore > 0 ? pub.primaryScore.toFixed(1) : '-'}
                                            </div>
                                        </div>
                                    ) : (
                                        // VERSUS MODE
                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2 border border-gray-100 dark:border-gray-600 w-full sm:w-auto justify-between sm:justify-end">
                                            
                                            {/* User 1 Score Box */}
                                            <div className={`flex flex-col items-center px-4 py-2 rounded-lg min-w-[70px] ${u1Won ? 'bg-blue-100 dark:bg-blue-900/50 shadow-inner' : ''}`}>
                                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1">{getUserName(selectedUser1).split(' ')[0]}</span>
                                                {pub.score1 !== null ? (
                                                    <span className={`text-xl font-black ${u1Won ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{pub.score1.toFixed(1)}</span>
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">N/A</span>
                                                )}
                                                {u1Won && <span className="text-[10px] mt-1">👑</span>}
                                            </div>
                                            
                                            <span className="text-gray-300 dark:text-gray-500 font-black italic text-lg px-1">VS</span>
                                            
                                            {/* User 2 Score Box */}
                                            <div className={`flex flex-col items-center px-4 py-2 rounded-lg min-w-[70px] ${u2Won ? 'bg-purple-100 dark:bg-purple-900/50 shadow-inner' : ''}`}>
                                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1">{getUserName(selectedUser2).split(' ')[0]}</span>
                                                {pub.score2 !== null ? (
                                                    <span className={`text-xl font-black ${u2Won ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>{pub.score2.toFixed(1)}</span>
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">N/A</span>
                                                )}
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