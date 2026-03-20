import React, { useState, useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function BarChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstanceRef.current) chartInstanceRef.current.destroy();
            const ctx = chartRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, {
                type: 'bar', data: data,
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [data]);
    return <canvas ref={chartRef}></canvas>;
}

export function RadarChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstanceRef.current) chartInstanceRef.current.destroy();
            const ctx = chartRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, {
                type: 'radar', data: data,
                options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 10, pointLabels: { font: { size: 14 } } } } }
            });
        }
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [data]);
    return <canvas ref={chartRef}></canvas>;
}

export function StatCard({ title, value, subValue }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase truncate">{title}</h3>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white truncate">{value}</p>
            {subValue && <p className="text-sm text-gray-500 dark:text-gray-400">{subValue}</p>}
        </div>
    );
}

export default function DashboardPage({ pubs, newPubs, criteria, users, scores, db, groupId, rankedPubs, setPage }) {
    const pubsArray = Array.isArray(pubs) ? pubs : Object.values(pubs || {});
    const newPubsArray = Array.isArray(newPubs) ? newPubs : Object.values(newPubs || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj = scores || {};
    const usersSize = users && typeof users.size === "number" ? users.size : 0;
    
    const [weightOverrides, setWeightOverrides] = useState({});
    const [suggestedPub, setSuggestedPub] = useState(null);
    const [comparePub1, setComparePub1] = useState("");
    const [comparePub2, setComparePub2] = useState("");
    
    const [livePubId, setLivePubId] = useState("");
    const [recentCrawls, setRecentCrawls] = useState([]);

    // Listen to live location & upcoming crawls
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

        return () => { unsubSettings(); unsubCrawls(); };
    }, [db, groupId]);

    const handleSetLiveLocation = async (e) => {
        try { await db.collection('groups').doc(groupId).update({ livePubId: e.target.value }); } 
        catch (error) { console.error("Error updating location:", error); }
    };

    // --- GUINNESS INDEX ---
    const { cheapestPint, priciestPint } = useMemo(() => {
        const currencyCriteria = criteria.filter(c => c.type === 'currency').map(c => c.id);
        if (currencyCriteria.length === 0) return { cheapestPint: null, priciestPint: null };
        let pubPrices = [];
        pubs.forEach(pub => {
            let total = 0, count = 0;
            currencyCriteria.forEach(cid => {
                (scores[pub.id]?.[cid] || []).forEach(s => {
                    if (s.value != null && !isNaN(s.value)) { total += s.value; count++; }
                });
            });
            if (count > 0) pubPrices.push({ pub, avgPrice: total / count });
        });
        if (pubPrices.length === 0) return { cheapestPint: null, priciestPint: null };
        pubPrices.sort((a, b) => a.avgPrice - b.avgPrice);
        return { cheapestPint: pubPrices[0], priciestPint: pubPrices[pubPrices.length - 1] };
    }, [pubs, scores, criteria]);
    
    // --- WEIGHTS & RANKINGS ---
    const effectiveWeights = useMemo(() => {
        const map = {};
        criteriaArray.forEach((c) => { map[c.id] = weightOverrides[c.id] != null ? weightOverrides[c.id] : (c.weight ?? 1); });
        return map;
    }, [criteriaArray, weightOverrides]);

    const tierData = useMemo(() => {
        let god = 0, great = 0, average = 0, avoid = 0, totalRated = 0;
        pubs.forEach(pub => {
            let totalScore = 0, scoreCount = 0;
            criteria.forEach(c => {
                if (c.type === 'scale') { 
                    (scores[pub.id]?.[c.id] || []).forEach(s => {
                        if (s.value != null && !isNaN(s.value)) { totalScore += s.value; scoreCount++; }
                    });
                }
            });
            if (scoreCount > 0) {
                const avg = totalScore / scoreCount;
                totalRated++;
                if (avg >= 8.5) god++; else if (avg >= 7.0) great++; else if (avg >= 5.0) average++; else avoid++;
            }
        });
        return { god, great, average, avoid, totalRated };
    }, [pubs, scores, criteria]);

    const comparatorData = useMemo(() => {
        if (!comparePub1 || !comparePub2 || comparePub1 === comparePub2) return [];
        return criteria.filter(c => c.type === 'scale').map(c => {
            const getAvg = (pubId) => {
                const cScores = scores[pubId]?.[c.id] || [];
                let total = 0, count = 0;
                cScores.forEach(s => { if (s.value != null && !isNaN(s.value)) { total += s.value; count++; } });
                return count > 0 ? (total / count) : 0;
            };
            return { subject: c.name, p1Score: getAvg(comparePub1), p2Score: getAvg(comparePub2) };
        });
    }, [comparePub1, comparePub2, pubs, scores, criteria]);
    
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
    
    // --- CHARTS ---
    const pubChartData = useMemo(() => {
        const top = weightedRankedPubs.slice(0, 10);
        return {
            labels: top.map((p) => p.name?.slice(0, 10) || ""),
            datasets: [{ label: "Average Score (with weights)", data: top.map((p) => p.avgScore.toFixed(2)), backgroundColor: "rgba(54, 162, 235, 0.6)", borderColor: "rgba(54, 162, 235, 1)", borderWidth: 1 }]
        };
    }, [weightedRankedPubs]);
    
    const criteriaChartData = useMemo(() => {
        const scaleCriteria = criteriaArray.filter((c) => c.type === "scale");
        return {
            labels: scaleCriteria.map((c) => c.name),
            datasets: [{
                label: "Average Score per Criterion",
                data: scaleCriteria.map((c) => {
                    let total = 0, count = 0;
                    Object.values(scoresObj).forEach((pubScores) => {
                        ((pubScores || {})[c.id] || []).forEach((s) => { if (s.type === "scale" && s.value != null) { total += s.value; count++; } });
                    });
                    return count > 0 ? (total / count).toFixed(2) : 0;
                }),
                backgroundColor: "rgba(255, 99, 132, 0.2)", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 1, pointBackgroundColor: "rgba(255, 99, 132, 1)"
            }]
        };
    }, [criteriaArray, scoresObj]);
    
    useEffect(() => {
        if (!weightedRankedPubs.length) { setSuggestedPub(null); return; }
        setSuggestedPub(weightedRankedPubs[Math.floor(Math.random() * Math.min(5, weightedRankedPubs.length))]);
    }, [weightedRankedPubs]);
    
    // --- TIMELINE ACTIVITY FEED ---
    const timelineItems = useMemo(() => {
        let items = [];
        pubsArray.forEach(p => {
            if (p.createdAt?.toMillis) items.push({ id: `pub_${p.id}`, emoji: '🍺', title: 'New Pub Added', text: p.name, time: p.createdAt.toMillis(), dateLabel: new Date(p.createdAt.toMillis()).toLocaleDateString() });
        });
        recentCrawls.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crawl_${c.id}`, emoji: '🗺️', title: `${c.creatorName} planned a Crawl`, text: c.name, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        criteriaArray.forEach(c => {
            if (c.createdAt?.toMillis) items.push({ id: `crit_${c.id}`, emoji: '📋', title: 'New Rating Category', text: c.name, time: c.createdAt.toMillis(), dateLabel: new Date(c.createdAt.toMillis()).toLocaleDateString() });
        });
        return items.sort((a, b) => b.time - a.time).slice(0, 10);
    }, [pubsArray, recentCrawls, criteriaArray]);

    // --- MINI MAP LOGIC (React-Leaflet) ---
    const topMapPubs = weightedRankedPubs.slice(0, 5).filter(p => p.lat && p.lng);
    const mapCenter = useMemo(() => {
        if (topMapPubs.length === 0) return [51.505, -0.09]; // Default
        const avgLat = topMapPubs.reduce((sum, p) => sum + p.lat, 0) / topMapPubs.length;
        const avgLng = topMapPubs.reduce((sum, p) => sum + p.lng, 0) / topMapPubs.length;
        return [avgLat, avgLng];
    }, [topMapPubs]);

    const createEmojiIcon = (emoji) => L.divIcon({ html: `<div class="text-3xl filter drop-shadow-md">${emoji}</div>`, className: 'custom-leaflet-icon', iconSize: [32, 32], iconAnchor: [16, 16] });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Dashboard</h2>
        
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Visited Pubs" value={pubsArray.length} />
                <StatCard title="Pubs to Visit" value={newPubsArray.length} />
                <StatCard title="Total Raters" value={usersSize} />
                <StatCard title="Top Rated Pub" value={weightedRankedPubs[0]?.name || "N/A"} subValue={`Weighted Avg ${weightedRankedPubs[0]?.avgScore.toFixed(1) || 0}`} />
            </div>

            {/* LIVE LOCATION */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300 relative overflow-hidden mb-6 border border-gray-100 dark:border-gray-700">
                {livePubId && <div className="absolute inset-0 bg-red-500 opacity-10 animate-pulse pointer-events-none"></div>}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className={`text-4xl ${livePubId ? 'animate-bounce' : 'grayscale opacity-50'}`}>📍</div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Group Location</h3>
                            {livePubId ? <p className="text-2xl font-black text-red-600 dark:text-red-400">{pubs.find(p => p.id === livePubId)?.name || "Unknown Pub"}</p> : <p className="text-lg font-bold text-gray-800 dark:text-gray-200">Not currently at a pub.</p>}
                        </div>
                    </div>
                    <div className="w-full md:w-auto">
                        <select value={livePubId} onChange={handleSetLiveLocation} className="w-full md:w-64 px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold cursor-pointer">
                            <option value="">🏠 Everyone went home</option>
                            <optgroup label="Active Pubs">{pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                        </select>
                    </div>
                </div>
            </div>

            {/* GUINNESS INDEX */}
            {(cheapestPint || priciestPint) && (
                <div className="bg-gradient-to-r from-yellow-800 to-yellow-600 dark:from-yellow-900 dark:to-yellow-800 p-1 rounded-lg shadow-lg">
                    <div className="bg-white dark:bg-gray-800 rounded-md p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">🍺</span>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">The Guinness Index</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tracking the exact price of a pint</p>
                            </div>
                        </div>
                        <div className="flex gap-6 w-full md:w-auto">
                            {cheapestPint && (
                                <div className="flex-1 md:flex-none border-r border-gray-200 dark:border-gray-700 pr-6">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase mb-1">Cheapest Pint</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">£{cheapestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px]">{cheapestPint.pub.name}</p>
                                </div>
                            )}
                            {priciestPint && (
                                <div className="flex-1 md:flex-none">
                                    <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1">Priciest Pint</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">£{priciestPint.avgPrice.toFixed(2)}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px]">{priciestPint.pub.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        
            {/* ROW 1: Suggestion, Map, Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Suggestion */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex flex-col transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Tonight's Suggestion</h3>
                    {suggestedPub ? (
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="text-5xl text-center mb-4">🍺</div>
                            <p className="text-2xl font-black text-center text-blue-700 dark:text-blue-400 mb-2">{suggestedPub.name}</p>
                            <p className="text-center text-gray-600 dark:text-gray-300 mb-4">{suggestedPub.location}</p>
                            <div className="mt-auto bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-center">
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Group Rating</span>
                                <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{suggestedPub.avgScore.toFixed(1)}/10</p>
                            </div>
                        </div>
                    ) : <p className="text-gray-500 dark:text-gray-400 text-sm">Not enough data yet.</p>}
                </div>
        
                {/* 2. Fixed React-Leaflet Mini Map */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Top Rated Radar</h3>
                    <div className="w-full h-48 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden z-0">
                        <MapContainer center={mapCenter} zoom={13} className="w-full h-full" scrollWheelZoom={false}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                            {topMapPubs.map(pub => (
                                <Marker key={pub.id} position={[pub.lat, pub.lng]} icon={createEmojiIcon('🍻')}>
                                    <Popup><p className="font-bold">{pub.name}</p></Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">Showing your top 5 highest-rated pubs.</p>
                </div>

                {/* 3. Upcoming Crawls Panel */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Upcoming Events</h3>
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {recentCrawls.length === 0 ? (
                            <div className="text-center mt-6">
                                <span className="text-4xl block mb-2">🗺️</span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">No crawls planned yet!</p>
                            </div>
                        ) : (
                            recentCrawls.map(crawl => (
                                <div key={crawl.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                    <p className="font-bold text-gray-800 dark:text-white truncate">{crawl.name}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                            {new Date(crawl.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-xs text-gray-500">{crawl.route.length} Stops</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ROW 2: Activity Feed & Tiers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Instagram-Style Activity Feed */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">Activity Feed</h3>
                    {timelineItems.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
                    ) : (
                        <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-4 space-y-6">
                            {timelineItems.map((item) => (
                                <div key={item.id} className="relative pl-6">
                                    <span className="absolute -left-[20px] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-sm z-10">
                                        {item.emoji}
                                    </span>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm mt-[-4px]">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">{item.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">{item.dateLabel}</p>
                                        </div>
                                        <p className="text-gray-800 dark:text-white font-semibold text-lg">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Tier List */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow transition-colors duration-300">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Pub Quality Tiers</h3>
                        {tierData.totalRated > 0 ? (
                            <div className="space-y-4">
                                <div className="w-full h-6 flex rounded-full overflow-hidden shadow-inner bg-gray-200 dark:bg-gray-700">
                                    <div style={{ width: `${(tierData.god / tierData.totalRated) * 100}%` }} className="bg-purple-500"></div>
                                    <div style={{ width: `${(tierData.great / tierData.totalRated) * 100}%` }} className="bg-blue-500"></div>
                                    <div style={{ width: `${(tierData.average / tierData.totalRated) * 100}%` }} className="bg-yellow-500"></div>
                                    <div style={{ width: `${(tierData.avoid / tierData.totalRated) * 100}%` }} className="bg-red-500"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded font-bold text-purple-700 dark:text-purple-400">God Tier: {tierData.god}</div>
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded font-bold text-blue-700 dark:text-blue-400">Great: {tierData.great}</div>
                                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded font-bold text-yellow-700 dark:text-yellow-400">Avg: {tierData.average}</div>
                                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded font-bold text-red-700 dark:text-red-400">Avoid: {tierData.avoid}</div>
                                </div>
                            </div>
                        ) : <p className="text-sm text-gray-500 dark:text-gray-400">Rate pubs to build your tier list!</p>}
                    </div>

                    {/* Head-to-Head */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow transition-colors duration-300">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Head-to-Head Clash</h3>
                        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                            <select value={comparePub1} onChange={e => setComparePub1(e.target.value)} className="w-full flex-1 px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-blue-600 dark:text-blue-400 font-bold">
                                <option value="">Pub 1...</option>{pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <span className="font-black text-gray-300 dark:text-gray-600 italic">VS</span>
                            <select value={comparePub2} onChange={e => setComparePub2(e.target.value)} className="w-full flex-1 px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-purple-600 dark:text-purple-400 font-bold">
                                <option value="">Pub 2...</option>{pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        {comparePub1 && comparePub2 && comparePub1 !== comparePub2 ? (
                            <div className="space-y-4 max-w-lg mx-auto">
                                {comparatorData.map(stat => (
                                    <div key={stat.subject}>
                                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 px-1">
                                            <span className="text-blue-600">{stat.p1Score > 0 ? stat.p1Score.toFixed(1) : '-'}</span>
                                            <span className="uppercase">{stat.subject}</span>
                                            <span className="text-purple-600">{stat.p2Score > 0 ? stat.p2Score.toFixed(1) : '-'}</span>
                                        </div>
                                        <div className="flex h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="w-1/2 border-r border-white flex justify-end"><div style={{ width: `${(stat.p1Score / 10) * 100}%` }} className="bg-blue-500 h-full"></div></div>
                                            <div className="w-1/2 flex justify-start"><div style={{ width: `${(stat.p2Score / 10) * 100}%` }} className="bg-purple-500 h-full"></div></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-gray-500 text-center text-sm italic">Select two pubs to battle!</p>}
                    </div>
                </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Top Pubs</h3>
                    <div className="h-72"><BarChart data={pubChartData} /></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Average by Criterion</h3>
                    <div className="h-72"><RadarChart data={criteriaChartData} /></div>
                </div>
            </div>
        
            {/* Interactive criteria weight sliders */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Tweak Criteria Weights</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Adjust how important each criterion is. The Top Pubs chart updates instantly.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {criteriaArray.map((c) => (
                        <div key={c.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-gray-700 dark:text-gray-300">{c.name}</span>
                                <span className="text-blue-600 font-black dark:text-blue-400">{(weightOverrides[c.id] ?? c.weight ?? 1).toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.1" max="3" step="0.1" value={weightOverrides[c.id] ?? c.weight ?? 1} onChange={(e) => handleWeightChange(c.id, e.target.value)} className="w-full accent-blue-600" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}