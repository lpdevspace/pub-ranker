import React, { useState, useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'leaflet/dist/leaflet.css';

export function HorizontalBarChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstanceRef.current) chartInstanceRef.current.destroy();
            const ctx = chartRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, {
                type: 'bar', 
                data: data,
                options: { 
                    indexAxis: 'y', 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } },
                    scales: { 
                        x: { beginAtZero: true, max: 10 },
                        y: { ticks: { font: { weight: 'bold' } } }
                    } 
                }
            });
        }
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [data]);
    return <canvas ref={chartRef}></canvas>;
}

export function StatCard({ title, value, subValue, onClick }) {
    return (
        <div 
            onClick={onClick} 
            className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 hover:-translate-y-1' : ''}`}
        >
            <h3 className={`text-sm font-bold uppercase tracking-wider truncate ${onClick ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {title} {onClick && '↗'}
            </h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white truncate mt-1">{value}</p>
            {subValue && <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
        </div>
    );
}

// --- NEW: Added `user` to the props list ---
export default function DashboardPage({ user, pubs, newPubs, criteria, users, scores, db, groupId, setPage, allUsers }) {
    const pubsArray = Array.isArray(pubs) ? pubs : Object.values(pubs || {});
    const newPubsArray = Array.isArray(newPubs) ? newPubs : Object.values(newPubs || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj = scores || {};
    const usersSize = users && typeof users.size === "number" ? users.size : 0;
    
    const [livePubId, setLivePubId] = useState("");
    const [recentCrawls, setRecentCrawls] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    const getUserName = (userId) => {
        const u = allUsers && allUsers[userId];
        return u ? (u.nickname || u.displayName || u.email) : "A member";
    };

    // --- NEW: Check if the user has completed their first quest (rated a pub) ---
    const hasCompletedFirstQuest = scoresObj && Object.values(scoresObj).some(pubScores => 
        Object.values(pubScores).some(critScores => 
            Array.isArray(critScores) && critScores.some(s => s.userId === user?.uid)
        )
    );

    useEffect(() => {
        if (!db || !groupId) return;
        
        const unsubSettings = db.collection('groups').doc(groupId).onSnapshot(doc => {
            if (doc.exists) setLivePubId(doc.data().livePubId || "");
        });

        const unsubCrawls = db.collection('crawls')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snap => {
                const crawls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRecentCrawls(crawls);
            });

        const unsubEvents = db.collection('events')
            .where('groupId', '==', groupId)
            .orderBy('date', 'asc')
            .onSnapshot(snap => {
                const now = new Date().toISOString().split('T')[0];
                const fetchedEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const upcoming = fetchedEvents.filter(e => e.date >= now).slice(0, 5);
                setUpcomingEvents(upcoming);
            });

        return () => { unsubSettings(); unsubCrawls(); unsubEvents(); };
    }, [db, groupId]);

    const handleSetLiveLocation = async (e) => {
        try { await db.collection('groups').doc(groupId).update({ livePubId: e.target.value }); } 
        catch (error) { console.error("Error updating location:", error); }
    };
    
    const { cheapestPint, priciestPint } = useMemo(() => {
        const currencyCriteria = criteriaArray.filter(c => c.type === 'currency').map(c => c.id);
        if (currencyCriteria.length === 0) return { cheapestPint: null, priciestPint: null };
        let pubPrices = [];
        pubsArray.forEach(pub => {
            let total = 0, count = 0;
            currencyCriteria.forEach(cid => {
                (scoresObj[pub.id]?.[cid] || []).forEach(s => {
                    if (s.value != null && !isNaN(s.value)) { total += s.value; count++; }
                });
            });
            if (count > 0) pubPrices.push({ pub, avgPrice: total / count });
        });
        if (pubPrices.length === 0) return { cheapestPint: null, priciestPint: null };
        pubPrices.sort((a, b) => a.avgPrice - b.avgPrice);
        return { cheapestPint: pubPrices[0], priciestPint: pubPrices[pubPrices.length - 1] };
    }, [pubsArray, scoresObj, criteriaArray]);

    const effectiveWeights = useMemo(() => {
        const map = {};
        criteriaArray.forEach((c) => { map[c.id] = c.weight ?? 1; });
        return map;
    }, [criteriaArray]);

    const weightedRankedPubs = useMemo(() => {
        if (!pubsArray.length) return [];
        const visitedPubs = pubsArray.filter((p) => p.status === "visited");
        const results = visitedPubs.map((pub) => {
            let totalScore = 0, totalWeight = 0;
            Object.entries(scoresObj[pub.id] ?? {}).forEach(([criterionId, criterionScores]) => {
                const weight = effectiveWeights[criterionId] ?? 1;
                (criterionScores || []).forEach((score) => {
                    if (score.type === "scale" && score.value != null) { totalScore += score.value * weight; totalWeight += weight; } 
                    else if (score.type === "price" && score.value != null) { totalScore += (score.value * 2) * weight; totalWeight += weight; }
                });
            });
            return { ...pub, avgScore: totalWeight > 0 ? totalScore / totalWeight : 0 };
        });
        return results.sort((a, b) => b.avgScore - a.avgScore);
    }, [pubsArray, scoresObj, effectiveWeights]);

    const spotlightPub = weightedRankedPubs[0];
    
    const pubChartData = useMemo(() => {
        const top = weightedRankedPubs.slice(0, 10);
        return {
            labels: top.map((p) => p.name || ""),
            datasets: [{ 
                label: "Average Score", 
                data: top.map((p) => p.avgScore.toFixed(2)), 
                backgroundColor: top.map(p => {
                    if(p.avgScore >= 8.5) return "rgba(168, 85, 247, 0.8)";
                    if(p.avgScore >= 7) return "rgba(59, 130, 246, 0.8)"; 
                    if(p.avgScore >= 5) return "rgba(234, 179, 8, 0.8)"; 
                    return "rgba(239, 68, 68, 0.8)";
                }),
                borderRadius: 4
            }]
        };
    }, [weightedRankedPubs]);
    
    const timelineItems = useMemo(() => {
        let items = [];
        pubsArray.forEach(p => {
            if (p.createdAt?.toMillis) {
                const addedBy = p.addedBy ? getUserName(p.addedBy) : "Someone";
                items.push({ id: `pub_${p.id}`, emoji: '🍺', title: 'New Pub Added', text: `${addedBy} added ${p.name} to the list.`, time: p.createdAt.toMillis(), dateLabel: new Date(p.createdAt.toMillis()).toLocaleDateString() });
            }
        });
        recentCrawls.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crawl_${c.id}`, emoji: '🗺️', title: `Crawl Planned`, text: `${c.creatorName} planned: ${c.name}`, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        criteriaArray.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crit_${c.id}`, emoji: '📋', title: 'Rules Updated', text: `New rating category: ${c.name}`, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        upcomingEvents.forEach(e => {
            if (e.createdAt?.toMillis) items.push({ id: `event_${e.id}`, emoji: '📅', title: `Event Scheduled`, text: `${e.title} was added to the calendar.`, time: e.createdAt.toMillis(), dateLabel: new Date(e.createdAt.toMillis()).toLocaleDateString() });
        });
        return items.sort((a, b) => b.time - a.time).slice(0, 15); 
    }, [pubsArray, recentCrawls, criteriaArray, allUsers, upcomingEvents]);

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
            
            {/* --- NEW: FIRST QUEST BANNER --- */}
            {user && !hasCompletedFirstQuest && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-xl mb-6 relative overflow-hidden group border border-orange-300">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-xl flex items-center gap-2 mb-1">
                                <span className="text-2xl animate-bounce">🏆</span> Your First Quest
                            </h3>
                            <p className="text-sm font-medium opacity-90 max-w-md">
                                Welcome to the crew! Head over to the Directory or Hit List and drop your very first rating to unlock the 'First Pint' badge.
                            </p>
                        </div>
                        <button onClick={() => setPage('pubs')} className="hidden sm:block px-6 py-2 bg-white text-orange-600 font-black rounded-xl shadow-md hover:scale-105 transition-transform">
                            Start Rating →
                        </button>
                    </div>
                    {/* Decorative background circle */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                </div>
            )}

            <div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-white transition-colors">Group Dashboard</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your city's drinking analytics.</p>
            </div>
        
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Visited Pubs" value={pubsArray.length} onClick={() => setPage('pubs')} />
                <StatCard title="Pubs to Visit" value={newPubsArray.length} onClick={() => setPage('toVisit')} />
                <StatCard title="Total Raters" value={usersSize} />
                <StatCard title="Overall Average" value={weightedRankedPubs.length > 0 ? (weightedRankedPubs.reduce((sum, p) => sum + p.avgScore, 0) / weightedRankedPubs.length).toFixed(1) : 0} subValue="Group Wide" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300 relative overflow-hidden">
                {livePubId && <div className="absolute inset-0 bg-red-500 opacity-5 animate-pulse pointer-events-none"></div>}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className={`text-4xl ${livePubId ? 'animate-bounce' : 'grayscale opacity-50'}`}>📍</div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Group Location</h3>
                            {livePubId ? <p className="text-2xl font-black text-red-600 dark:text-red-400">{pubsArray.find(p => p.id === livePubId)?.name || "Unknown Pub"}</p> : <p className="text-lg font-bold text-gray-800 dark:text-gray-200">Not currently at a pub.</p>}
                        </div>
                    </div>
                    <div className="w-full md:w-auto">
                        <select value={livePubId} onChange={handleSetLiveLocation} className="w-full md:w-64 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold cursor-pointer shadow-sm">
                            <option value="">🏠 Everyone went home</option>
                            <optgroup label="Active Pubs">{pubsArray.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                        </select>
                    </div>
                </div>
            </div>

            {(cheapestPint || priciestPint) && (
                <div className="bg-gradient-to-r from-yellow-800 to-yellow-600 dark:from-yellow-900 dark:to-yellow-800 p-1 rounded-2xl shadow-sm mb-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <span className="text-5xl drop-shadow-md">🍺</span>
                            <div>
                                <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-wider">The Guinness Index</h3>
                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tracking the exact price of a pint</p>
                            </div>
                        </div>
                        <div className="flex gap-8 w-full md:w-auto">
                            {cheapestPint && (
                                <div className="flex-1 md:flex-none border-r border-gray-100 dark:border-gray-700 pr-8">
                                    <p className="text-[11px] text-green-600 dark:text-green-400 font-black uppercase mb-1 tracking-wider">Cheapest Pint</p>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">£{cheapestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 truncate max-w-[150px] mt-1">{cheapestPint.pub.name}</p>
                                </div>
                            )}
                            {priciestPint && (
                                <div className="flex-1 md:flex-none">
                                    <p className="text-[11px] text-red-600 dark:text-red-400 font-black uppercase mb-1 tracking-wider">Priciest Pint</p>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">£{priciestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 truncate max-w-[150px] mt-1">{priciestPint.pub.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div 
                    onClick={() => setPage('pubs')}
                    className="bg-gradient-to-br from-blue-600 to-purple-700 p-1 rounded-2xl shadow-lg flex flex-col transition-all hover:-translate-y-1 hover:shadow-blue-500/30 duration-300 cursor-pointer group"
                >
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                        
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 uppercase tracking-wider">🔥 Pub of the Month</h3>
                            <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                        </div>
                        
                        {spotlightPub ? (
                            <div className="flex-1 flex flex-col justify-center items-center text-center z-10">
                                {spotlightPub.photoURL ? (
                                    <img src={spotlightPub.photoURL} alt="Top Pub" className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white dark:border-gray-700 shadow-md group-hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="text-6xl mb-4 drop-shadow-md group-hover:scale-105 transition-transform">👑</div>
                                )}
                                <p className="text-3xl font-black text-gray-900 dark:text-white mb-1 leading-tight">{spotlightPub.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-6">📍 {spotlightPub.location}</p>
                                
                                <div className="mt-auto bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-6 py-3 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm w-full">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Group Rating</span>
                                    <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{spotlightPub.avgScore.toFixed(1)}<span className="text-lg text-blue-300">/10</span></p>
                                </div>
                            </div>
                        ) : <p className="text-gray-500 dark:text-gray-400 text-sm my-auto text-center italic">Rate a pub to see it crowned here.</p>}
                    </div>
                </div>
        
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">The Top 10 Leaderboard</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Color-coded by quality tier.</p>
                        </div>
                    </div>
                    <div className="h-72"><HorizontalBarChart data={pubChartData} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full lg:col-span-1">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Upcoming Events</h3>
                        <button onClick={() => setPage('events')} className="text-xs font-bold text-brand hover:underline">View All</button>
                    </div>
                    {upcomingEvents.length === 0 ? (
                        <div className="text-center my-auto py-8">
                            <span className="text-4xl mb-2 block opacity-50">📅</span>
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No events planned.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 overflow-y-auto pr-2">
                            {upcomingEvents.map(event => {
                                const eventDate = new Date(event.date);
                                const pub = pubsArray.find(p => p.id === event.pubId);
                                return (
                                    <div key={event.id} className="flex gap-3 items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600 cursor-pointer hover:border-brand transition" onClick={() => setPage('events')}>
                                        <div className="bg-brand text-white rounded-lg p-2 text-center min-w-[3rem] shadow-sm">
                                            <p className="text-[10px] uppercase font-black leading-none">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</p>
                                            <p className="text-lg font-black leading-none mt-1">{eventDate.getDate()}</p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-800 dark:text-white truncate text-sm">{event.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">📍 {pub?.name || 'Unknown Pub'}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Group Activity Feed</h3>
                    {timelineItems.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center my-auto italic pb-6">No recent activity.</p>
                    ) : (
                        <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-4 space-y-6 flex-1 overflow-y-auto pr-4 pb-2">
                            {timelineItems.map((item) => (
                                <div key={item.id} className="relative pl-6 group">
                                    <span className="absolute -left-[18px] top-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full w-9 h-9 flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform z-10">
                                        {item.emoji}
                                    </span>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm transition-colors hover:border-blue-200 dark:hover:border-blue-800">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">{item.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full shadow-sm">{item.dateLabel}</p>
                                        </div>
                                        <p className="text-gray-800 dark:text-white font-semibold text-sm">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    );
}