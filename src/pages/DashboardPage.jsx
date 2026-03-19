import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import Chart from 'chart.js/auto';

export function BarChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [data]);

    return <canvas ref={chartRef}></canvas>;
}

export function RadarChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, {
                type: 'radar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 10,
                            pointLabels: { font: { size: 14 } }
                        }
                    }
                }
            });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
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

export default function DashboardPage({ pubs, newPubs, criteria, users, scores, rankedPubs, setPage }) {
    // Normalise inputs
    const pubsArray = Array.isArray(pubs) ? pubs : Object.values(pubs || {});
    const newPubsArray = Array.isArray(newPubs) ? newPubs : Object.values(newPubs || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj = scores || {};
    const rankedPubsArray = Array.isArray(rankedPubs) ? rankedPubs : Object.values(rankedPubs || {});
    const usersSize = users && typeof users.size === "number" ? users.size : 0;
    
    const [weightOverrides, setWeightOverrides] = useState({});
    const [suggestedPub, setSuggestedPub] = useState(null);
    // --- ADD THESE TWO LINES RIGHT HERE! ---
    const [comparePub1, setComparePub1] = useState("");
    const [comparePub2, setComparePub2] = useState("");
    // ---------------------------------------

    // --- THE GUINNESS INDEX CALCULATION ---
    const { cheapestPint, priciestPint } = useMemo(() => {
        const currencyCriteria = criteria.filter(c => c.type === 'currency').map(c => c.id);
        if (currencyCriteria.length === 0) return { cheapestPint: null, priciestPint: null };

        let pubPrices = [];
        pubs.forEach(pub => {
            let total = 0;
            let count = 0;
            currencyCriteria.forEach(cid => {
                const critScores = scores[pub.id]?.[cid] || [];
                critScores.forEach(s => {
                    if (s.value != null && !isNaN(s.value)) {
                        total += s.value;
                        count++;
                    }
                });
            });
            if (count > 0) {
                pubPrices.push({ pub, avgPrice: total / count });
            }
        });

        if (pubPrices.length === 0) return { cheapestPint: null, priciestPint: null };

        pubPrices.sort((a, b) => a.avgPrice - b.avgPrice);
        return {
            cheapestPint: pubPrices[0],
            priciestPint: pubPrices[pubPrices.length - 1]
        };
    }, [pubs, scores, criteria]);
    // --------------------------------------
    
    // Effective weights from criteria + overrides
    const effectiveWeights = useMemo(() => {
        const map = {};
        criteriaArray.forEach((c) => {
        const base = c.weight ?? 1;
        const override = weightOverrides[c.id];
        map[c.id] = override != null ? override : base;
        });
        return map;
    }, [criteriaArray, weightOverrides]);

    // --- TIER LIST MATH ENGINE ---
    const tierData = useMemo(() => {
        let god = 0, great = 0, average = 0, avoid = 0, totalRated = 0;

        pubs.forEach(pub => {
            let totalScore = 0;
            let scoreCount = 0;
            
            // Only use 1-10 Scale criteria for tiers
            criteria.forEach(c => {
                if (c.type === 'scale') { 
                    const cScores = scores[pub.id]?.[c.id] || [];
                    cScores.forEach(s => {
                        if (s.value != null && !isNaN(s.value)) {
                            totalScore += s.value;
                            scoreCount++;
                        }
                    });
                }
            });

            if (scoreCount > 0) {
                const avg = totalScore / scoreCount;
                totalRated++;
                if (avg >= 8.5) god++;        // God Tier: 8.5+
                else if (avg >= 7.0) great++; // Great: 7.0 - 8.4
                else if (avg >= 5.0) average++; // Average: 5.0 - 6.9
                else avoid++;                 // Avoid: Under 5.0
            }
        });

        return { god, great, average, avoid, totalRated };
    }, [pubs, scores, criteria]);

    // --- HEAD-TO-HEAD MATH ENGINE ---
    const comparatorData = useMemo(() => {
        if (!comparePub1 || !comparePub2 || comparePub1 === comparePub2) return [];
        
        const scaleCriteria = criteria.filter(c => c.type === 'scale');
        
        return scaleCriteria.map(c => {
            const getAvg = (pubId) => {
                const cScores = scores[pubId]?.[c.id] || [];
                let total = 0, count = 0;
                cScores.forEach(s => {
                    if (s.value != null && !isNaN(s.value)) {
                        total += s.value;
                        count++;
                    }
                });
                return count > 0 ? (total / count) : 0;
            };

            return {
                subject: c.name,
                p1Score: getAvg(comparePub1),
                p2Score: getAvg(comparePub2)
            };
        });
    }, [comparePub1, comparePub2, pubs, scores, criteria]);
    
    // Recompute ranked pubs using effective weights
    const weightedRankedPubs = useMemo(() => {
        if (!pubsArray.length) return [];
    
        const visitedPubs = pubsArray.filter((p) => p.status === "visited");
        const results = visitedPubs.map((pub) => {
            const pubScores = scoresObj[pub.id] ?? {};
            let totalScore = 0;
            let totalWeight = 0;
            let priceTotal = 0;
            let priceCount = 0;
    
            Object.entries(pubScores).forEach(([criterionId, criterionScores]) => {
                const weight = effectiveWeights[criterionId] ?? 1;
                (criterionScores || []).forEach((score) => {
                    if (score.type === "scale" && score.value != null) {
                        totalScore += score.value * weight;
                        totalWeight += weight;
                    } else if (score.type === "price" && score.value != null) {
                        const normalizedScore = score.value * 2;
                        totalScore += normalizedScore * weight;
                        totalWeight += weight;
                        priceTotal += score.value; 
                        priceCount++;
                    }
                });
            });
    
            const avg = totalWeight > 0 ? totalScore / totalWeight : 0;
            const avgPrice = priceCount > 0 ? priceTotal / priceCount : 2.5; 
            const valueScore = avgPrice > 0 ? avg / avgPrice : 0; 
    
            return { 
                ...pub, 
                avgScore: avg,
                avgPrice: avgPrice,
                valueScore: valueScore 
            };
        });
    
        results.sort((a, b) => b.avgScore - a.avgScore);
        return results;
    }, [pubsArray, scoresObj, effectiveWeights]);
    
    // Top‑pubs chart data
    const pubChartData = useMemo(() => {
        const top = weightedRankedPubs.slice(0, 10);
        return {
        labels: top.map((p) => p.name?.slice(0, 10) || ""),
        datasets: [
            {
            label: "Average Score (with weights)",
            data: top.map((p) => p.avgScore.toFixed(2)),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            },
        ],
        };
    }, [weightedRankedPubs]);
    
    // Criteria average chart
    const criteriaChartData = useMemo(() => {
        const scaleCriteria = criteriaArray.filter((c) => c.type === "scale");
        const labels = scaleCriteria.map((c) => c.name);
        const data = scaleCriteria.map((c) => {
        let total = 0;
        let count = 0;
        Object.values(scoresObj).forEach((pubScores) => {
            const criterionScores = (pubScores || {})[c.id] || [];
            criterionScores.forEach((score) => {
            if (score.type === "scale" && score.value != null) {
                total += score.value;
                count += 1;
            }
            });
        });
        return count > 0 ? (total / count).toFixed(2) : 0;
        });
    
        return {
        labels,
        datasets: [
            {
            label: "Average Score per Criterion",
            data,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            pointBackgroundColor: "rgba(255, 99, 132, 1)",
            },
        ],
        };
    }, [criteriaArray, scoresObj]);
    
    // Key stats
    const topRatedPub = weightedRankedPubs[0] || { name: "N/A", avgScore: 0 };
    const totalVisitedPubs = pubsArray.length;
    const totalNewPubs = newPubsArray.length;
    const totalRaters = usersSize;
    
    // Tonight's suggestion
    useEffect(() => {
        if (!weightedRankedPubs.length) {
        setSuggestedPub(null);
        return;
        }
        const top = weightedRankedPubs.slice(0, 5);
        const randomIndex = Math.floor(Math.random() * top.length);
        setSuggestedPub(top[randomIndex]);
    }, [weightedRankedPubs]);
    
    // Mini map preview
    const miniMapRef = useRef(null);
    const miniMapInstanceRef = useRef(null);
    
    useEffect(() => {
        if (!miniMapRef.current) return;
    
        const pubsWithCoords = pubsArray.filter((p) => p.lat && p.lng);
        if (!pubsWithCoords.length) return;
    
        const topThree = weightedRankedPubs.slice(0, 3).filter((p) => p.lat && p.lng);
        const firstNew = newPubsArray.find((p) => p.lat && p.lng) || null;
    
        const markersList = [...topThree];
        if (firstNew && !markersList.find((p) => p.id === firstNew.id)) {
        markersList.push(firstNew);
        }
        if (!markersList.length) return;
    
        if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
        }
    
        const avgLat = markersList.reduce((sum, p) => sum + p.lat, 0) / markersList.length;
        const avgLng = markersList.reduce((sum, p) => sum + p.lng, 0) / markersList.length;
    
        const map = L.map(miniMapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        }).setView([avgLat, avgLng], 13);
        miniMapInstanceRef.current = map;
    
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        }).addTo(map);
    
        const latLngs = [];
        markersList.forEach((pub) => {
        const marker = L.marker([pub.lat, pub.lng]).addTo(map);
        marker.bindPopup(`<b>${pub.name}</b><br/>${pub.location || ""}`);
        latLngs.push([pub.lat, pub.lng]);
        });
    
        if (latLngs.length > 1) {
        map.fitBounds(latLngs, { padding: [20, 20] });
        }
    
        return () => {
        if (miniMapInstanceRef.current) {
            miniMapInstanceRef.current.remove();
            miniMapInstanceRef.current = null;
        }
        };
    }, [pubsArray, newPubsArray, weightedRankedPubs]);
    
    // Recent activity 
    const recentPubs = pubsArray
        .filter((p) => p.createdAt && typeof p.createdAt.toMillis === "function")
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, 5);
    
    const recentCriteria = criteriaArray
        .filter((c) => c.createdAt && typeof c.createdAt.toMillis === "function")
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, 5);
    
    const recentItems = [
        ...recentPubs.map((p) => ({
        type: "pub",
        id: p.id,
        text: `New pub: ${p.name} (${p.location || "No location"})`,
        })),
        ...recentCriteria.map((c) => ({
        type: "criterion",
        id: c.id,
        text: `New criterion: ${c.name} [${c.type}]`,
        })),
    ].slice(0, 8);
    
    const handleWeightChange = (criterionId, value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return;
        setWeightOverrides((prev) => ({ ...prev, [criterionId]: num }));
    };
    
return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Dashboard</h2>
        
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Visited Pubs" value={totalVisitedPubs} />
                <StatCard title="Pubs to Visit" value={totalNewPubs} />
                <StatCard title="Total Raters" value={totalRaters} />
                <StatCard title="Top Rated Pub" value={topRatedPub.name} subValue={`Weighted Avg ${topRatedPub.avgScore.toFixed(1)}`} />
            </div>
            {/* THE GUINNESS INDEX BANNER */}
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
        
            {/* Tonight's suggestion + mini‑map + activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Tonight&apos;s Suggestion</h3>
                    {suggestedPub ? (
                        <>
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{suggestedPub.name}</p>
                            <p className="text-gray-600 dark:text-gray-300">{suggestedPub.location}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Weighted score: {suggestedPub.avgScore.toFixed(1)}</p>
                            <button onClick={() => setPage("map")} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                                View on Map
                            </button>
                        </>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Not enough data yet. Start rating pubs to get suggestions.</p>
                    )}
                </div>
        
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Mini Map Preview</h3>
                    <div ref={miniMapRef} className="w-full h-48 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden z-0"></div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Shows top pubs and your next unvisited pub.</p>
                </div>
        
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-2 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Recent Activity</h3>
                    {recentItems.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
                    ) : (
                        <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            {recentItems.map((item) => (
                                <li key={`${item.type}-${item.id}`} className="flex items-start">
                                    <span className="mt-1 mr-2 h-2 w-2 rounded-full bg-blue-500"></span>
                                    <span>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        
                        {/* --- NEW: TIER LIST DISTRIBUTION --- */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4 transition-colors duration-300">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Pub Quality Tiers</h3>
                {tierData.totalRated > 0 ? (
                    <div className="space-y-4">
                        {/* The segmented visual bar */}
                        <div className="w-full h-6 flex rounded-full overflow-hidden shadow-inner bg-gray-200 dark:bg-gray-700">
                            <div style={{ width: `${(tierData.god / tierData.totalRated) * 100}%` }} className="bg-purple-500 hover:opacity-80 transition-all" title={`God Tier: ${tierData.god}`}></div>
                            <div style={{ width: `${(tierData.great / tierData.totalRated) * 100}%` }} className="bg-blue-500 hover:opacity-80 transition-all" title={`Great: ${tierData.great}`}></div>
                            <div style={{ width: `${(tierData.average / tierData.totalRated) * 100}%` }} className="bg-yellow-500 hover:opacity-80 transition-all" title={`Average: ${tierData.average}`}></div>
                            <div style={{ width: `${(tierData.avoid / tierData.totalRated) * 100}%` }} className="bg-red-500 hover:opacity-80 transition-all" title={`Avoid: ${tierData.avoid}`}></div>
                        </div>
                        {/* The labels */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-sm">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800">
                                <span className="block font-bold text-purple-700 dark:text-purple-400">God Tier (8.5+)</span>
                                <span className="text-gray-600 dark:text-gray-300">{tierData.god} pubs</span>
                            </div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                                <span className="block font-bold text-blue-700 dark:text-blue-400">Great (7.0 - 8.4)</span>
                                <span className="text-gray-600 dark:text-gray-300">{tierData.great} pubs</span>
                            </div>
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-100 dark:border-yellow-800">
                                <span className="block font-bold text-yellow-700 dark:text-yellow-400">Average (5.0 - 6.9)</span>
                                <span className="text-gray-600 dark:text-gray-300">{tierData.average} pubs</span>
                            </div>
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800">
                                <span className="block font-bold text-red-700 dark:text-red-400">Avoid (&lt; 5.0)</span>
                                <span className="text-gray-600 dark:text-gray-300">{tierData.avoid} pubs</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Rate some pubs to build your tier list!</p>
                )}
            </div>

            {/* --- NEW: HEAD-TO-HEAD COMPARATOR --- */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Head-to-Head Clash</h3>
                
                {/* The Dropdowns */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                    <select value={comparePub1} onChange={e => setComparePub1(e.target.value)} className="w-full flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white font-semibold text-blue-600 dark:text-blue-400">
                        <option value="">Select Pub 1...</option>
                        {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    
                    <div className="font-black text-gray-300 dark:text-gray-600 text-xl italic">VS</div>
                    
                    <select value={comparePub2} onChange={e => setComparePub2(e.target.value)} className="w-full flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 dark:text-white font-semibold text-purple-600 dark:text-purple-400">
                        <option value="">Select Pub 2...</option>
                        {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                {/* The Tug-of-War Chart */}
                {comparePub1 && comparePub2 && comparePub1 !== comparePub2 ? (
                    <div className="space-y-5 max-w-2xl mx-auto">
                        {comparatorData.map(stat => (
                            <div key={stat.subject}>
                                <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 px-1">
                                    <span className={stat.p1Score > stat.p2Score ? "text-blue-600 dark:text-blue-400" : ""}>{stat.p1Score > 0 ? stat.p1Score.toFixed(1) : '-'}</span>
                                    <span className="uppercase tracking-wider">{stat.subject}</span>
                                    <span className={stat.p2Score > stat.p1Score ? "text-purple-600 dark:text-purple-400" : ""}>{stat.p2Score > 0 ? stat.p2Score.toFixed(1) : '-'}</span>
                                </div>
                                
                                {/* The split bar rendering */}
                                <div className="flex h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                                    <div className="w-1/2 pr-[1px] border-r border-white dark:border-gray-800 flex justify-end">
                                        <div style={{ width: `${(stat.p1Score / 10) * 100}%` }} className="bg-blue-500 h-full rounded-l-full transition-all duration-500"></div>
                                    </div>
                                    <div className="w-1/2 pl-[1px] flex justify-start">
                                        <div style={{ width: `${(stat.p2Score / 10) * 100}%` }} className="bg-purple-500 h-full rounded-r-full transition-all duration-500"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Select two different pubs above to see them battle it out!</p>
                    </div>
                )}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Top Pubs</h3>
                    <div className="h-72"><BarChart data={pubChartData} /></div>
                </div>
        
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Average by Criterion</h3>
                    <div className="h-72"><RadarChart data={criteriaChartData} /></div>
                </div>
            </div>
        
            {/* Interactive criteria weight sliders */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3 transition-colors duration-300">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Tweak Criteria Weights</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Adjust how important each criterion is. The Top Pubs chart updates instantly.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criteriaArray.map((c) => (
                        <div key={c.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                                <span className="text-gray-500 dark:text-gray-400">{(weightOverrides[c.id] ?? c.weight ?? 1).toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.1" max="3" step="0.1" value={weightOverrides[c.id] ?? c.weight ?? 1} onChange={(e) => handleWeightChange(c.id, e.target.value)} className="w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}