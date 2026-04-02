import React, { useState, useMemo, useEffect } from 'react';

export default function IndividualRankingsPage({ scores, pubs, criteria, allUsers, activeRaters, criteriaWeightMap }) {
    // --- TAB STATE ---
    const [activeTab, setActiveTab] = useState('players'); // 'players' or 'pubs'

    // --- PLAYER VS PLAYER STATE ---
    const [selectedUser1, setSelectedUser1] = useState(null);
    const [selectedUser2, setSelectedUser2] = useState(null);

    // --- PUB VS PUB (ELO GAME) STATE ---
    const [eloScores, setEloScores] = useState({});
    const [currentMatch, setCurrentMatch] = useState([]);
    const [matchCount, setMatchCount] = useState(0);

    const safePubs = Array.isArray(pubs) ? pubs.filter(p => p.status === 'visited') : [];

    // --- ELO GAME LOGIC ---
    useEffect(() => {
        if (safePubs.length > 1 && Object.keys(eloScores).length === 0) {
            const initialElo = {};
            safePubs.forEach(p => initialElo[p.id] = 1200); // Standard chess starting Elo
            setEloScores(initialElo);
            pickNextMatch(safePubs);
        }
    }, [safePubs]);

    const pickNextMatch = (pubList) => {
        if (pubList.length < 2) return;
        const idx1 = Math.floor(Math.random() * pubList.length);
        let idx2 = Math.floor(Math.random() * pubList.length);
        while (idx1 === idx2) {
            idx2 = Math.floor(Math.random() * pubList.length);
        }
        setCurrentMatch([pubList[idx1], pubList[idx2]]);
    };

    const handleVote = (winner, loser) => {
        const eloW = eloScores[winner.id];
        const eloL = eloScores[loser.id];
        
        // Classic Elo Math
        const expectedW = 1 / (1 + Math.pow(10, (eloL - eloW) / 400));
        const expectedL = 1 / (1 + Math.pow(10, (eloW - eloL) / 400));
        
        const kFactor = 32; // Volatility
        
        setEloScores(prev => ({
            ...prev,
            [winner.id]: prev[winner.id] + kFactor * (1 - expectedW),
            [loser.id]: prev[loser.id] + kFactor * (0 - expectedL)
        }));
        
        setMatchCount(prev => prev + 1);
        pickNextMatch(safePubs);
    };

    const rankedEloPubs = useMemo(() => {
        return safePubs
            .map(pub => ({ ...pub, elo: eloScores[pub.id] || 1200 }))
            .sort((a, b) => b.elo - a.elo);
    }, [safePubs, eloScores]);


    // --- PLAYER VS PLAYER LOGIC ---
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
                const userScore = Array.isArray(criterionScores) ? criterionScores.find((s) => s.userId === userId) : null;
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

        return safePubs
            .map((pub) => ({
                ...pub,
                score1: user1Scores[pub.id] ?? null,
                score2: user2Scores[pub.id] ?? null,
                primaryScore: baseUserScores[pub.id] ?? 0
            }))
            .filter(pub => pub.score1 !== null || pub.score2 !== null)
            .sort((a, b) => b.primaryScore - a.primaryScore);
    }, [selectedUser1, selectedUser2, safePubs, user1Scores, user2Scores]);

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
            compScore = Math.max(0, 100 - (avgDiff * 10)); 
        }

        return { compatibilityScore: compScore, mostDisagreedPub: disagreedPub };
    }, [rankedPubs, selectedUser1, selectedUser2]);

    return (
        <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white transition-colors">Versus Mode</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Compare tastes, settle arguments, and rank pubs.</p>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl max-w-md shadow-inner">
                <button onClick={() => setActiveTab('players')} className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${activeTab === 'players' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    👥 Player vs Player
                </button>
                <button onClick={() => setActiveTab('pubs')} className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${activeTab === 'pubs' ? 'bg-white dark:bg-gray-800 text-red-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    🥊 Pub vs Pub (Elo)
                </button>
            </div>

            {/* --- TAB 1: PLAYER VS PLAYER --- */}
            {activeTab === 'players' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6 transition-colors duration-300">
                        <div>
                            <label className="block text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Player 1</label>
                            <select
                                value={selectedUser1 || ""}
                                onChange={(e) => setSelectedUser1(e.target.value || null)}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold cursor-pointer"
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
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold cursor-pointer"
                            >
                                <option value="">None (Single View)</option>
                                {Array.from(activeRaters).map((userId) => (
                                    <option key={userId} value={userId}>{getUserName(userId)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

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
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white truncate max-w-[200px]">{mostDisagreedPub.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {getUserName(selectedUser1).split(' ')[0]}: <span className="font-bold">{mostDisagreedPub.score1.toFixed(1)}</span> vs {getUserName(selectedUser2).split(' ')[0]}: <span className="font-bold">{mostDisagreedPub.score2.toFixed(1)}</span>
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
            )}

            {/* --- TAB 2: PUB VS PUB (ELO GAME) --- */}
            {activeTab === 'pubs' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-gray-900 rounded-3xl p-6 md:p-12 shadow-2xl relative overflow-hidden border border-gray-800">
                        {/* Background Accents */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>

                        <div className="text-center mb-8 relative z-10">
                            <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-widest mb-2">Which is Better?</h3>
                            <p className="text-gray-400 font-medium">Click the pub you prefer. The algorithm will handle the rest.</p>
                            {matchCount > 0 && (
                                <p className="text-brand font-bold mt-2">Matches Played: {matchCount}</p>
                            )}
                        </div>

                        {currentMatch.length === 2 ? (
                            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 relative z-10">
                                
                                {/* PUB 1 CARD */}
                                <div 
                                    onClick={() => handleVote(currentMatch[0], currentMatch[1])}
                                    className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-6 rounded-2xl cursor-pointer transform transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] border-4 border-transparent hover:border-red-500 group"
                                >
                                    <div className="h-40 mb-4 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
                                        {currentMatch[0].photoURL ? (
                                            <img src={currentMatch[0].photoURL} alt="Pub" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : <span className="text-6xl">🍺</span>}
                                    </div>
                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white text-center truncate">{currentMatch[0].name}</h4>
                                    <p className="text-gray-500 text-center font-bold text-sm mt-1">{currentMatch[0].location}</p>
                                </div>

                                {/* VERSUS BADGE */}
                                <div className="bg-gray-800 border-4 border-gray-700 w-16 h-16 flex items-center justify-center rounded-full z-20 shrink-0 shadow-2xl absolute md:relative">
                                    <span className="font-black text-white italic text-xl">VS</span>
                                </div>

                                {/* PUB 2 CARD */}
                                <div 
                                    onClick={() => handleVote(currentMatch[1], currentMatch[0])}
                                    className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-6 rounded-2xl cursor-pointer transform transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] border-4 border-transparent hover:border-blue-500 group"
                                >
                                    <div className="h-40 mb-4 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
                                        {currentMatch[1].photoURL ? (
                                            <img src={currentMatch[1].photoURL} alt="Pub" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : <span className="text-6xl">🍺</span>}
                                    </div>
                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white text-center truncate">{currentMatch[1].name}</h4>
                                    <p className="text-gray-500 text-center font-bold text-sm mt-1">{currentMatch[1].location}</p>
                                </div>

                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-12 font-bold">Not enough visited pubs to play. Need at least 2!</div>
                        )}
                    </div>

                    {/* ELO LEADERBOARD */}
                    {matchCount > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Live Elo Rankings</h3>
                            <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider font-bold">Based strictly on head-to-head match ups.</p>
                            
                            <div className="space-y-3">
                                {rankedEloPubs.slice(0, 10).map((pub, index) => (
                                    <div key={pub.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                                        <div className="w-8 font-black text-gray-400 text-lg">#{index + 1}</div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 dark:text-white">{pub.name}</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-black px-3 py-1 rounded-lg">
                                                {Math.round(pub.elo)} Elo
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}