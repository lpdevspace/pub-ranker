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
        <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 uppercase truncate">{title}</h3>
            <p className="text-3xl font-semibold text-gray-900 truncate">{value}</p>
            {subValue && <p className="text-sm text-gray-500">{subValue}</p>}
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
            <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Visited Pubs" value={totalVisitedPubs} />
                <StatCard title="Pubs to Visit" value={totalNewPubs} />
                <StatCard title="Total Raters" value={totalRaters} />
                <StatCard title="Top Rated Pub" value={topRatedPub.name} subValue={`Weighted Avg ${topRatedPub.avgScore.toFixed(1)}`} />
            </div>
        
            {/* Tonight's suggestion + mini‑map + activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-lg shadow space-y-3">
                    <h3 className="text-lg font-semibold text-gray-700">Tonight&apos;s Suggestion</h3>
                    {suggestedPub ? (
                        <>
                            <p className="text-xl font-bold text-blue-700">{suggestedPub.name}</p>
                            <p className="text-gray-600">{suggestedPub.location}</p>
                            <p className="text-sm text-gray-500">Weighted score: {suggestedPub.avgScore.toFixed(1)}</p>
                            <button onClick={() => setPage("map")} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                                View on Map
                            </button>
                        </>
                    ) : (
                        <p className="text-gray-500 text-sm">Not enough data yet. Start rating pubs to get suggestions.</p>
                    )}
                </div>
        
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Mini Map Preview</h3>
                    <div ref={miniMapRef} className="w-full h-48 rounded-md border border-gray-200 overflow-hidden"></div>
                    <p className="mt-2 text-xs text-gray-500">Shows top pubs and your next unvisited pub when coordinates are available.</p>
                </div>
        
                <div className="bg-white p-4 rounded-lg shadow space-y-2">
                    <h3 className="text-lg font-semibold text-gray-700">Recent Activity</h3>
                    {recentItems.length === 0 ? (
                        <p className="text-sm text-gray-500">No recent pubs or criteria recorded yet.</p>
                    ) : (
                        <ul className="space-y-1 text-sm text-gray-700">
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
        
            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Top Pubs by Weighted Score</h3>
                    <div className="h-72"><BarChart data={pubChartData} /></div>
                </div>
        
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Average by Criterion (Unweighted)</h3>
                    <div className="h-72"><RadarChart data={criteriaChartData} /></div>
                </div>
            </div>
        
            {/* Interactive criteria weight sliders */}
            <div className="bg-white p-4 rounded-lg shadow space-y-3">
                <h3 className="text-lg font-semibold text-gray-700">Tweak Criteria Weights</h3>
                <p className="text-sm text-gray-500">Adjust how important each criterion is. The Top Pubs chart and Tonight&apos;s Suggestion will update instantly.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criteriaArray.map((c) => (
                        <div key={c.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700">{c.name}</span>
                                <span className="text-gray-500">{(weightOverrides[c.id] ?? c.weight ?? 1).toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.1" max="3" step="0.1" value={weightOverrides[c.id] ?? c.weight ?? 1} onChange={(e) => handleWeightChange(c.id, e.target.value)} className="w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}