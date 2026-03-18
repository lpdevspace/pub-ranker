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

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Individual Rankings</h2>

            <div className="bg-white p-4 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block font-medium text-gray-600 mb-2">Select User 1</label>
                    <select
                        value={selectedUser1 || ""}
                        onChange={(e) => setSelectedUser1(e.target.value || null)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="">Select a user...</option>
                        {Array.from(activeRaters).map((userId) => (
                            <option key={userId} value={userId}>
                                {getUserName(userId)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block font-medium text-gray-600 mb-2">Select User 2 (Compare)</label>
                    <select
                        value={selectedUser2 || ""}
                        onChange={(e) => setSelectedUser2(e.target.value || null)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                        <option value="">None (Single View)</option>
                        {Array.from(activeRaters).map((userId) => (
                            <option key={userId} value={userId}>
                                {getUserName(userId)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {(selectedUser1 || selectedUser2) && (
                <div className="space-y-3">
                    {rankedPubs.map((pub) => (
                        <div key={pub.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">{pub.name}</h3>
                                <p className="text-gray-600">{pub.location}</p>
                            </div>
                            <div className="flex gap-4">
                                {selectedUser1 && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{pub.score1 ? pub.score1.toFixed(1) : '-'}</div>
                                        {selectedUser2 && <div className="text-xs text-gray-500">{getUserName(selectedUser1)}</div>}
                                    </div>
                                )}
                                {selectedUser2 && (
                                    <div className="text-center border-l pl-4">
                                        <div className="text-2xl font-bold text-purple-600">{pub.score2 ? pub.score2.toFixed(1) : '-'}</div>
                                        <div className="text-xs text-gray-500">{getUserName(selectedUser2)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}