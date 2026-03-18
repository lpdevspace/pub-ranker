import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

// Import all the required Leaflet CSS and Plugins
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

export default function MapPage({ pubs, criteria, scores }) {
    const [yesNoCriterionId, setYesNoCriterionId] = useState("all");
    const [selectedPubIds, setSelectedPubIds] = useState([]);
    
    const mapRef = useRef(null);
    const routingControlRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerClusterGroupRef = useRef(null);

    const yesNoCriteria = criteria.filter(c => c.type === 'yes-no');

    const togglePubSelection = (pubId) => {
        setSelectedPubIds(prev => {
            if (prev.includes(pubId)) {
                return prev.filter(id => id !== pubId);
            } else {
                return [...prev, pubId];
            }
        });
    };

    const pubMatchesYesNo = (pub) => {
        if (yesNoCriterionId === "all") return true;
        const pubScores = scores[pub.id];
        if (!pubScores) return false;
        const criterionScores = pubScores[yesNoCriterionId];
        if (!criterionScores || !criterionScores.length) return false;
        return criterionScores.some((s) => s.type === "yes-no" && s.value === true);
    };

    // Helper to calculate the unweighted average score for the popup
    const calculateAvgScore = (pubId) => {
        const pubScores = scores[pubId] || {};
        let total = 0;
        let count = 0;
        Object.values(pubScores).forEach(critScores => {
            critScores.forEach(score => {
                if (score.type === 'scale' && score.value != null) {
                    total += score.value;
                    count++;
                }
            });
        });
        return count > 0 ? (total / count).toFixed(1) : 'No score';
    };

    // Helper to generate a custom SVG icon
    const getCustomIcon = (pub) => {
        const isVisited = pub.status === 'visited';
        const pinColor = isVisited ? '#16a34a' : '#ea580c'; // Tailwind green-600 vs orange-600
        
        const svgPin = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${pinColor}" width="36px" height="36px" stroke="white" stroke-width="1.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
        `;

        return L.divIcon({
            className: 'custom-pin', 
            html: svgPin,
            iconSize: [36, 36],
            iconAnchor: [18, 36], 
            popupAnchor: [0, -32] 
        });
    };

    // "Locate Me" handler
    const handleLocateMe = () => {
        if (navigator.geolocation && mapInstanceRef.current) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    mapInstanceRef.current.flyTo([latitude, longitude], 15, {
                        duration: 1.5 // Smooth flying animation
                    });
                },
                () => alert("Could not access your location. Please check your browser permissions.")
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };
    
    // "Reset View" handler
    const handleResetView = () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const pubsWithCoords = pubs.filter(p => p.lat && p.lng);
        if (pubsWithCoords.length > 0) {
            const bounds = pubsWithCoords.map(p => [p.lat, p.lng]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    
    const buildPubCrawl = (mode) => {
        const map = mapInstanceRef.current;
        if (!map) return;
    
        let pubsWithCoords = pubs.filter((p) => p.lat && p.lng);
        pubsWithCoords = pubsWithCoords.filter((p) =>
            mode === "visited" ? p.status === "visited" : p.status !== "visited"
        );
        pubsWithCoords = pubsWithCoords.filter(pubMatchesYesNo);
    
        if (selectedPubIds.length > 0) {
            pubsWithCoords = pubsWithCoords.filter((p) => selectedPubIds.includes(p.id));
        }
    
        if (pubsWithCoords.length === 0) {
            alert("No pubs match your current filters for this crawl.");
            return;
        }
    
        const createRoute = (startLatLng) => {
            const remaining = [...pubsWithCoords];
            const ordered = [];
            let current = { lat: startLatLng.lat, lng: startLatLng.lng };
        
            while (remaining.length > 0) {
                let bestIndex = 0;
                let bestDist = Infinity;
                remaining.forEach((p, i) => {
                    const d = Math.pow(p.lat - current.lat, 2) + Math.pow(p.lng - current.lng, 2);
                    if (d < bestDist) {
                        bestDist = d;
                        bestIndex = i;
                    }
                });
                const next = remaining.splice(bestIndex, 1)[0];
                ordered.push(next);
                current = { lat: next.lat, lng: next.lng };
            }
        
            const waypoints = [
                L.latLng(startLatLng.lat, startLatLng.lng),
                ...ordered.map((p) => L.latLng(p.lat, p.lng)),
            ];
        
            if (routingControlRef.current) {
                map.removeControl(routingControlRef.current);
                routingControlRef.current = null;
            }
        
            routingControlRef.current = L.Routing.control({
                waypoints,
                routeWhileDragging: false,
                showAlternatives: false,
                addWaypoints: false,
                lineOptions: {
                    styles: [{ color: "#2563eb", weight: 5, opacity: 0.8 }],
                },
                createMarker: (i, wp) => {
                    if (i === 0) {
                        return L.marker(wp.latLng, {
                            icon: L.icon({
                                iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                            }),
                        }).bindPopup("Start (your location)");
                    }
                    const pub = ordered[i - 1];
                    return L.marker(wp.latLng).bindPopup(`<b>${pub.name}</b><br/>${pub.location || ""}`);
                },
            }).addTo(map);
        
            if (waypoints.length > 1) {
                map.fitBounds(waypoints.map((w) => [w.lat, w.lng]), { padding: [40, 40] });
            }
        };
    
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    createRoute({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                () => {
                    alert("Could not access your location. Using the first pub as the start point.");
                    createRoute({ lat: pubsWithCoords[0].lat, lng: pubsWithCoords[0].lng });
                }
            );
        } else {
            alert("Geolocation is not supported. Using the first pub as the start point.");
            createRoute({ lat: pubsWithCoords[0].lat, lng: pubsWithCoords[0].lng });
        }
    };

    useEffect(() => {
        if (!mapRef.current) return;
        if (mapInstanceRef.current) return;

        const map = L.map(mapRef.current).setView([51.505, -0.09], 13);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        markerClusterGroupRef.current = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        map.addLayer(markerClusterGroupRef.current);
        
        // CLEANUP FUNCTION
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        
    }, []);

    // Update markers when pubs change
    useEffect(() => {
        const map = mapInstanceRef.current;
        const clusterGroup = markerClusterGroupRef.current;
        if (!map || !clusterGroup) return;

        clusterGroup.clearLayers();

        const pubsWithCoords = pubs.filter(p => p.lat && p.lng);
        const bounds = [];
        const newMarkers = [];

        pubsWithCoords.forEach(pub => {
            const score = calculateAvgScore(pub.id);
            const gMapsLink = pub.googleLink || `http://googleusercontent.com/maps.google.com/${pub.lat},${pub.lng}`;
            const photoHtml = pub.photoURL ? `<img src="${pub.photoURL}" class="w-full h-32 object-cover rounded-md mb-3 shadow-sm" />` : '';

            const popupContent = `
                <div class="text-center w-56">
                    ${photoHtml}
                    <b class="text-xl block mb-1 text-gray-800">${pub.name}</b>
                    <span class="text-sm text-gray-600 block mb-3">${pub.location || ''}</span>
                    
                    <div class="flex justify-center items-center gap-2 mb-4">
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">⭐ ${score}</span>
                        <span class="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 ${pub.status === 'visited' ? 'text-green-600' : 'text-orange-600'}">
                            ${pub.status === 'visited' ? '✓ Visited' : 'To Visit'}
                        </span>
                    </div>

                    <a href="${gMapsLink}" target="_blank" class="block w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold py-2 rounded-lg transition border border-blue-200">
                        📍 Google Maps
                    </a>
                </div>
            `;

            const marker = L.marker([pub.lat, pub.lng], { icon: getCustomIcon(pub) })
                .bindPopup(popupContent, { maxWidth: 300 });
            
            newMarkers.push(marker);
            bounds.push([pub.lat, pub.lng]);
        });

        clusterGroup.addLayers(newMarkers);

        if (bounds.length > 0 && !routingControlRef.current) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

    }, [pubs, scores]); 
    
    const pubsWithCoords = pubs.filter((p) => p.lat && p.lng);
    
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Pub Map</h2>
        
            <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <button
                        onClick={() => buildPubCrawl("visited")}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        Plan Crawl: Visited Pubs
                    </button>
                    <button
                        onClick={() => buildPubCrawl("new")}
                        className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
                    >
                        Plan Crawl: New Pubs
                    </button>
                </div>
        
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-1">
                        <p className="font-medium text-gray-700">Filter by Yes/No criterion</p>
                        <select
                            value={yesNoCriterionId}
                            onChange={(e) => setYesNoCriterionId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">All pubs (no yes/no filter)</option>
                            {yesNoCriteria.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500">
                            Create criteria such as "Pool table" or "Serves food" as Yes/No
                            criteria in the Admin page, then select them here.
                        </p>
                    </div>
            
                    <div className="space-y-2 md:col-span-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                        <p className="font-medium text-gray-700">
                            Choose pubs to include (optional)
                        </p>
                        {pubsWithCoords.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No pubs with location data available.
                            </p>
                        ) : (
                            pubsWithCoords.map((pub) => (
                                <label
                                    key={pub.id}
                                    className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-50 cursor-pointer"
                                >
                                    <span>
                                        <span className="font-semibold text-gray-800">
                                            {pub.name}
                                        </span>
                                        <span className="text-gray-500 ml-1">
                                            {pub.location || ""}
                                        </span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={selectedPubIds.includes(pub.id)}
                                        onChange={() => togglePubSelection(pub.id)}
                                        className="h-4 w-4 text-blue-600 rounded"
                                    />
                                </label>
                            ))
                        )}
                        <p className="text-xs text-gray-500">
                            If you do not select any pubs, the crawl will use all pubs that
                            match the filters above.
                        </p>
                    </div>
                </div>
        
                <div className="relative">
                    <div ref={mapRef} className="map-container"></div>
                    
                    <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-2">
                        <button 
                            onClick={handleResetView}
                            className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 border border-gray-200 text-gray-700 transition group"
                            title="Reset Map View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    
                        <button 
                            onClick={handleLocateMe}
                            className="absolute bottom-6 right-6 z-[400] bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 border border-gray-200 text-blue-600 transition group"
                            title="Locate Me"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}