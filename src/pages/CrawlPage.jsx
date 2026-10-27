import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Plus,
    Trash2,
    Navigation,
    Clock,
    MapPin,
    ArrowRight,
    Search,
    Share2,
    Save,
    RotateCcw
} from 'lucide-react';
import { firebase } from '../firebase';
import { useToastContext } from '../context/ToastContext';

function makeIcon(num, isStart, isEnd) {
    const bg = isStart ? '#3d7a2a' : isEnd ? '#a12c2c' : '#b36a1a';
    return L.divIcon({
        className: 'custom-crawl-marker',
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#fff;font-family:'Satoshi',sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;">${num}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
    });
}

function stepInstruction(type, modifier, streetName) {
    const road = streetName ? ` onto ${streetName}` : '';
    switch (type) {
        case 'depart': return `Head out${road}`;
        case 'turn': {
            if (modifier === 'left') return `Turn left${road}`;
            if (modifier === 'right') return `Turn right${road}`;
            if (modifier === 'slight left') return `Bear left${road}`;
            if (modifier === 'slight right') return `Bear right${road}`;
            if (modifier === 'sharp left') return `Sharp left${road}`;
            if (modifier === 'sharp right') return `Sharp right${road}`;
            return `Turn${road}`;
        }
        case 'continue': return `Continue straight${road}`;
        case 'new name': return `Continue${road}`;
        case 'end of road': return `At the end of the road, turn ${modifier || ''}${road}`;
        case 'roundabout': return `At the roundabout, take the exit${road}`;
        case 'arrive': return `You have arrived at your pub!`;
        default: return modifier ? `${type} ${modifier}${road}` : `Continue${road}`;
    }
}

export default function CrawlPage({ pubs = [], onViewDetail, db, groupId, user }) {
    const { showToast } = useToastContext();
    const [stops, setStops] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isRouting, setIsRouting] = useState(false);
    const [routeStats, setRouteStats] = useState(null); // { distance, time }
    const [directions, setDirections] = useState([]);
    const [activeLeg, setActiveLeg] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const routeLayerRef = useRef(null);
    const markersRef = useRef([]);

    // ── Autocomplete suggestions ─────────────────────────────────────────────
    const suggestions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (q.length < 1) return [];
        return pubs
            .filter(p => !stops.find(s => s.id === p.id) && (p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q)))
            .slice(0, 6);
    }, [pubs, stops, searchQuery]);

    // ── Initialize Map ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return;

        const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([52.4862, -1.8904], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // ── Render Map Markers ───────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing markers
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];

        if (stops.length === 0) return;

        const bounds = [];
        stops.forEach((pub, i) => {
            if (pub.lat && pub.lng) {
                const isStart = i === 0;
                const isEnd = i === stops.length - 1 && stops.length > 1;
                const marker = L.marker([pub.lat, pub.lng], { icon: makeIcon(i + 1, isStart, isEnd) })
                    .addTo(map)
                    .bindPopup(`
                        <div style="font-family:'Satoshi',sans-serif;padding:4px;">
                            <div style="font-weight:700;font-size:14px;color:#111;">${pub.name}</div>
                            <div style="font-size:11px;color:#666;margin-top:2px;">${pub.location || pub.address || ''}</div>
                        </div>
                    `);
                markersRef.current.push(marker);
                bounds.push([pub.lat, pub.lng]);
            }
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
    }, [stops]);

    // ── Handle Add Stop ──────────────────────────────────────────────────────
    const handleAddStop = (pub) => {
        setStops(prev => [...prev, pub]);
        setSearchQuery('');
        setShowSuggestions(false);
        // Clear previous route
        if (routeLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }
        setRouteStats(null);
        setDirections([]);
    };

    const handleRemoveStop = (id) => {
        setStops(prev => prev.filter(s => s.id !== id));
        if (routeLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }
        setRouteStats(null);
        setDirections([]);
    };

    const handleClearAll = () => {
        setStops([]);
        setRouteStats(null);
        setDirections([]);
        if (routeLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }
    };

    // ── Calculate Route with OSRM ────────────────────────────────────────────
    const planRoute = async () => {
        if (stops.length < 2) return;
        setIsRouting(true);

        const legs = [];
        let totalDist = 0;
        let totalTime = 0;
        const allPoints = [];

        try {
            for (let i = 0; i < stops.length - 1; i++) {
                const from = stops[i];
                const to = stops[i + 1];

                // Coordinates check
                const fromLat = from.lat || 52.4862;
                const fromLng = from.lng || -1.8904;
                const toLat = to.lat || 52.4870;
                const toLng = to.lng || -1.8920;

                const url = `https://router.project-osrm.org/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?steps=true&geometries=geojson&overview=full`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Routing service unavailable');
                const data = await res.json();
                if (!data.routes || data.routes.length === 0) throw new Error('No route found');

                const route = data.routes[0];
                totalDist += route.distance;
                totalTime += route.duration;

                route.geometry.coordinates.forEach(c => allPoints.push([c[1], c[0]]));

                const steps = [];
                route.legs[0].steps.forEach(step => {
                    if (step.maneuver.type === 'arrive') {
                        steps.push({ text: `Arrive at ${to.name}`, dist: 0 });
                    } else {
                        steps.push({
                            text: stepInstruction(step.maneuver.type, step.maneuver.modifier, step.name),
                            dist: step.distance
                        });
                    }
                });

                legs.push({
                    from: from.name,
                    to: to.name,
                    dist: route.distance,
                    time: route.duration,
                    steps
                });
            }

            // Draw route on Leaflet
            const map = mapRef.current;
            if (map) {
                if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
                const polyline = L.polyline(allPoints, {
                    color: 'var(--color-brand, #b36a1a)',
                    weight: 5,
                    opacity: 0.85,
                    dashArray: '8, 8',
                    lineJoin: 'round'
                }).addTo(map);
                routeLayerRef.current = polyline;
                map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
            }

            setRouteStats({
                distanceKm: (totalDist / 1000).toFixed(1),
                timeMin: Math.round(totalTime / 60)
            });
            setDirections(legs);
            setActiveLeg(0);
            showToast('Walking route calculated successfully!', 'success');
        } catch (e) {
            console.error('Route calculation error:', e);
            showToast('Could not calculate walking route. Please check coordinates.', 'error');
        } finally {
            setIsRouting(false);
        }
    };

    // ── Save Itinerary to Firestore ──────────────────────────────────────────
    const handleSaveItinerary = async () => {
        if (stops.length < 2) {
            showToast('Add at least 2 stops to save a crawl', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const batch = db.batch();
            const crawlRef = db.collection('crawls').doc();
            const now = firebase.firestore.FieldValue.serverTimestamp();

            batch.set(crawlRef, {
                groupId,
                creatorId: user.uid,
                creatorName: user.displayName || user.email?.split('@')[0] || 'Member',
                createdAt: now,
                name: `${stops[0].name} to ${stops[stops.length - 1].name} Crawl`,
                pubIds: stops.map(s => s.id),
                pubNames: stops.map(s => s.name),
                totalDistance: routeStats?.distanceKm || null,
                totalTime: routeStats?.timeMin || null,
            });

            const activityRef = db.collection('groups').doc(groupId).collection('activities').doc();
            batch.set(activityRef, {
                type: 'crawl',
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'Member',
                userAvatar: user.photoURL || null,
                pubCount: stops.length,
                timestamp: now,
            });

            await batch.commit();
            showToast('🎉 Crawl itinerary saved to your group!', 'success');
        } catch (e) {
            console.error('Save crawl error:', e);
            showToast('Failed to save itinerary: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🚶</span>
                        <h1 className="font-display text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight">
                            Pub Crawl Planner
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                        Build your crawl itinerary and calculate walking directions between each stop.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {stops.length >= 2 && (
                        <button
                            onClick={handleSaveItinerary}
                            disabled={isSaving}
                            className="btn-fun-primary !py-2 !px-4 text-xs font-extrabold flex items-center gap-2"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSaving ? 'Saving...' : 'Save Crawl'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Panel: Stops & Route Controls (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                    <div className="card-tavern p-5">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)] mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                                Your Stops
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--color-surface-offset)] text-[var(--color-brand)]">
                                {stops.length} {stops.length === 1 ? 'pub' : 'pubs'}
                            </span>
                        </div>

                        {/* Search & Add pub input */}
                        <div className="relative mb-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        placeholder="Search a pub to add as next stop..."
                                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                                    />
                                    <Search className="w-4 h-4 text-[var(--color-text-faint)] absolute right-3 top-3 pointer-events-none" />
                                </div>
                            </div>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-30 py-1 max-h-56 overflow-y-auto">
                                    {suggestions.map((pub) => (
                                        <button
                                            key={pub.id}
                                            onClick={() => handleAddStop(pub)}
                                            className="w-full flex items-center justify-between p-2.5 hover:bg-[var(--color-surface-offset)] text-left transition"
                                        >
                                            <div className="truncate">
                                                <p className="text-xs font-bold text-[var(--color-text)] truncate">{pub.name}</p>
                                                <p className="text-[11px] text-[var(--color-text-muted)] truncate">{pub.location || pub.address || 'Local'}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Stops List */}
                        <div className="space-y-2.5">
                            {stops.length === 0 ? (
                                <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                                    <span className="text-3xl block mb-2">🍺</span>
                                    <p className="font-semibold">No stops added yet</p>
                                    <p className="text-[11px] text-[var(--color-text-faint)] mt-1">Search above to add pubs along your route.</p>
                                    {pubs.length >= 2 && (
                                        <div className="pt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const sampleStops = pubs.slice(0, 3);
                                                    setStops(sampleStops);
                                                }}
                                                className="px-3.5 py-2 rounded-xl bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-2)] text-[var(--color-brand)] font-bold text-xs border border-[var(--color-border)] transition inline-flex items-center gap-1.5 shadow-sm"
                                            >
                                                <span>🗺️ Load Top 3 Pubs as Route</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                stops.map((pub, idx) => {
                                    const isLast = idx === stops.length - 1;
                                    return (
                                        <div key={pub.id}>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                                                        idx === 0 ? 'bg-[#3d7a2a]' : isLast ? 'bg-[#a12c2c]' : 'bg-[var(--color-brand)]'
                                                    }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-[var(--color-text)] truncate">{pub.name}</p>
                                                        <p className="text-[11px] text-[var(--color-text-muted)] truncate">{pub.location || 'Local'}</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleRemoveStop(pub.id)}
                                                    className="p-1 text-[var(--color-text-muted)] hover:text-red-600 rounded transition"
                                                    title="Remove stop"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {!isLast && (
                                                <div className="flex items-center justify-center py-1">
                                                    <div className="w-0.5 h-3 bg-[var(--color-divider)]" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Route Stats Band */}
                        {routeStats && (
                            <div className="mt-5 grid grid-cols-3 gap-2 p-3 bg-[var(--color-surface-offset-2)] border border-[var(--color-border)] rounded-xl text-center">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-[var(--color-text-faint)]">Stops</div>
                                    <div className="font-display text-xl text-[var(--color-text)] tabular-nums">{stops.length}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-[var(--color-text-faint)]">Walking</div>
                                    <div className="font-display text-xl text-[var(--color-text)] tabular-nums">{routeStats.distanceKm} km</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-[var(--color-text-faint)]">Est. Time</div>
                                    <div className="font-display text-xl text-[var(--color-text)] tabular-nums">{routeStats.timeMin} min</div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-5 flex items-center gap-2">
                            <button
                                onClick={planRoute}
                                disabled={stops.length < 2 || isRouting}
                                className="btn-brand text-xs flex-1 justify-center disabled:opacity-50"
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>{isRouting ? 'Calculating Route…' : 'Plan Route'}</span>
                            </button>

                            {stops.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="btn-ghost text-xs px-3"
                                    title="Clear all stops"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Turn-by-Turn Directions Panel */}
                    {directions.length > 0 && (
                        <div className="card-tavern p-5 animate-fadeIn">
                            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)] mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                                    Walking Directions
                                </span>
                            </div>

                            {/* Leg Selector Tabs */}
                            {directions.length > 1 && (
                                <div className="flex gap-1 overflow-x-auto scroll-x-clean pb-2 mb-3">
                                    {directions.map((leg, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveLeg(i)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                                                activeLeg === i
                                                    ? 'bg-[var(--color-brand)] text-white'
                                                    : 'bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                            }`}
                                        >
                                            Leg {i + 1}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Steps */}
                            {directions[activeLeg] && (
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-[var(--color-text)] flex items-center gap-2 mb-2">
                                        <span>{directions[activeLeg].from}</span>
                                        <ArrowRight className="w-3 h-3 text-[var(--color-brand)]" />
                                        <span>{directions[activeLeg].to}</span>
                                    </div>

                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {directions[activeLeg].steps.map((st, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-[11px] text-[var(--color-text-muted)] py-1 border-b border-[var(--color-divider)]/50 last:border-none">
                                                <span className="w-4 text-[var(--color-brand)] font-bold">{idx + 1}.</span>
                                                <span className="flex-1">{st.text}</span>
                                                {st.dist > 0 && (
                                                    <span className="text-[10px] text-[var(--color-text-faint)] tabular-nums shrink-0">
                                                        {Math.round(st.dist)}m
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel: Interactive Route Map (7 cols) */}
                <div className="lg:col-span-7 card-tavern overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[var(--color-divider)] flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                            Route Map
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${stops.length >= 2 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span>{stops.length >= 2 ? `${stops.length} stops ready` : 'Add at least 2 stops'}</span>
                        </span>
                    </div>

                    <div
                        ref={mapContainerRef}
                        className="w-full h-[520px] bg-[var(--color-surface-offset)] z-10"
                    />
                </div>
            </div>
        </div>
    );
}
