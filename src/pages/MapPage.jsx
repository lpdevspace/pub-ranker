import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin,
    Compass,
    Sparkles,
    Route,
    Footprints,
    Car,
    Plus,
    Trash2,
    X,
    ChevronRight,
    Navigation,
    Layers,
    SlidersHorizontal
} from 'lucide-react';
import { geocodeMissingPubs } from '../utils/geocode';
import { firebase } from '../firebase';
import { useToastContext } from '../context/ToastContext';
import { SAMPLE_CRAWLS } from '../data/sampleTavernData';
import { getLiveOpeningStatus, getStreetViewData } from '../services/pubEnrichmentService';

/* ─── Tier Helpers ──────────────────────────────────────────────────────── */
const tierColor = (score, hasScore) => {
    if (!hasScore) return '#78716c';
    if (score >= 8.5) return '#f59e0b'; // Amber Gold
    if (score >= 7)   return '#94a3b8'; // Silver Slate
    if (score >= 5)   return '#b45309'; // Bronze
    return '#dc2626'; // Red
};

const tierLabel = (score, hasScore) => {
    if (!hasScore) return 'Unrated';
    if (score >= 8.5) return 'Legendary';
    if (score >= 7)   return 'Great';
    if (score >= 5)   return 'Decent';
    return 'Avoid';
};

/* Modern Tavern SVG Pins */
const makePinIcon = (color, label = '', isVisited = true) =>
    L.divIcon({
        className: 'tavern-custom-pin',
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
            cursor: pointer;
          ">
            <svg viewBox="0 0 32 38" width="32" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 22 16 22s16-11.5 16-22C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
              <circle cx="16" cy="15" r="9" fill="#1c1917" opacity="0.25"/>
            </svg>
            <span style="
              position: absolute;
              top: 7px;
              left: 0;
              right: 0;
              text-align: center;
              font-family: 'Satoshi', sans-serif;
              font-size: 10px;
              font-weight: 900;
              color: #ffffff;
              line-height: 1;
            ">
              ${label || (isVisited ? '★' : '○')}
            </span>
          </div>`,
        iconSize: [32, 38],
        iconAnchor: [16, 38],
        popupAnchor: [0, -36],
    });

const makeStepNumberIcon = (n) =>
    L.divIcon({
        className: 'tavern-step-pin',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #d97706;
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          ">
            <span style="font-family:'Satoshi',sans-serif;font-size:11px;font-weight:900;color:#ffffff;">${n}</span>
          </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
    });

/* ─── OSRM Routing ─────────────────────────────────────────────────────── */
async function fetchRoute(waypoints, profile = 'foot') {
    if (waypoints.length < 2) return null;
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&annotations=false`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return null;
        const route = data.routes[0];
        const routeCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const steps = route.legs.flatMap(leg =>
            (leg.steps || []).map(step => ({
                instruction: step.maneuver?.type
                    ? formatInstruction(step.maneuver, step.name)
                    : (step.name || 'Continue'),
                distance: step.distance,
                duration: step.duration,
            }))
        ).filter(s => s.instruction && s.instruction !== 'arrive' && s.distance > 0);
        return {
            coords: routeCoords,
            steps,
            totalDistance: route.distance,
            totalDuration: route.duration,
        };
    } catch (e) {
        console.error('OSRM routing error:', e);
        return null;
    }
}

function formatInstruction(maneuver, streetName) {
    const street = streetName && streetName !== '' ? ` onto ${streetName}` : '';
    const typeMap = {
        depart:      `Start${street}`,
        arrive:      'Arrive at destination',
        turn:        `Turn ${maneuver.modifier || ''}${street}`,
        'new name':  `Continue${street}`,
        merge:       `Merge${street}`,
        'on ramp':   `Take the ramp${street}`,
        'off ramp':  `Exit the ramp${street}`,
        fork:        `Keep ${maneuver.modifier || 'straight'} at the fork${street}`,
        roundabout:  `Take the roundabout${street}`,
        rotary:      `Take the rotary${street}`,
        continue:    `Continue${street}`,
        straight:    `Go straight${street}`,
    };
    return typeMap[maneuver.type] || `${maneuver.type}${street}`;
}

function fmtDist(m) {
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function fmtDuration(s) {
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

/* ─── Tooltip & Popup Builders ─────────────────────────────────────────── */
const buildTooltipHTML = (pub, score, hasScore, color) => {
    return `
      <div style="background:#1c1917;color:#fafaf9;padding:6px 10px;border-radius:8px;border:1px solid #44403c;font-family:'Satoshi',sans-serif;box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);">
        <p style="font-weight:700;font-size:12px;margin:0 0 2px 0;">${pub.name}</p>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="background:${color};color:#fff;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">
            ${hasScore ? score.toFixed(1) : 'To Visit'}
          </span>
          <span style="color:#a8a29e;font-size:10px;">${pub.location || 'Local Pub'}</span>
        </div>
      </div>`;
};

const buildPopupHTML = (pub, score, hasScore, color) => {
    const photoUrl = pub.photoURL || '';
    const photoBlock = photoUrl
        ? `<img src="${photoUrl}" alt="${pub.name}" style="width:100%;height:100px;object-fit:cover;display:block;border-radius:8px 8px 0 0;" />`
        : `<div style="height:50px;background:linear-gradient(135deg, #292524, #1c1917);display:flex;align-items:center;justify-content:center;font-size:24px;border-radius:8px 8px 0 0;">🍺</div>`;
    
    const scoreBadge = hasScore
        ? `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:9999px;font-weight:800;font-size:11px;">${score.toFixed(1)} / 10</span>
           <span style="color:#78716c;font-size:10px;font-weight:700;text-transform:uppercase;">${tierLabel(score, hasScore)}</span>`
        : `<span style="color:#a8a29e;font-size:11px;font-weight:700;">Hit List (To Visit)</span>`;

    const priceBadge = pub.pintPrice
        ? `<span style="color:#f59e0b;font-weight:800;font-size:11px;">£${pub.pintPrice.toFixed(2)} / pint</span>`
        : '';

    const liveStatus = getLiveOpeningStatus(pub.schedule || pub.openingHours);
    const statusColor = liveStatus.badgeType === 'open' ? '#16a34a' : liveStatus.badgeType === 'closing-soon' ? '#d97706' : '#94a3b8';
    const streetView = pub.lat && pub.lng ? getStreetViewData(pub.lat, pub.lng) : null;

    return `
      <div style="width:220px;font-family:'Satoshi',sans-serif;color:#1c1917;">
        ${photoBlock}
        <div style="padding:10px 12px 12px;background:#ffffff;border-radius:0 0 8px 8px;">
          <h4 style="font-family:'Instrument Serif',serif;font-size:18px;margin:0 0 2px 0;line-height:1.2;color:#1c1917;">${pub.name}</h4>
          <p style="font-size:11px;color:#78716c;margin:0 0 6px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📍 ${pub.location || 'Local Pub'}</p>
          
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:10px;">
            <span style="font-weight:700;color:${statusColor};display:flex;align-items:center;gap:4px;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${statusColor};"></span>
              ${liveStatus.statusText}
            </span>
            ${streetView ? `<a href="${streetView.webPanoUrl}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;font-weight:700;text-decoration:none;" title="Open Google 360° Street View">360° ↗</a>` : ''}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:4px;">${scoreBadge}</div>
            ${priceBadge}
          </div>
          <button id="popup-view-btn-${pub.id}" style="width:100%;background:#d97706;color:#ffffff;border:none;border-radius:6px;padding:6px;font-size:11px;font-weight:700;cursor:pointer;">
            View Details & Rating →
          </button>
        </div>
      </div>`;
};

/* ─── Main Map Component ────────────────────────────────────────────────── */
export default function MapPage({
    pubs = [],
    newPubs = [],
    scores = {},
    criteria = [],
    db,
    groupId,
    onViewDetail,
    user
}) {
    const { showToast } = useToastContext();

    const pubsArray     = Array.isArray(pubs) ? pubs : Object.values(pubs || {});
    const newPubsArray  = Array.isArray(newPubs) ? newPubs : Object.values(newPubs || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj     = scores || {};

    const pubsRef = useMemo(
        () => db && groupId ? db.collection('groups').doc(groupId).collection('pubs') : null,
        [db, groupId]
    );

    const mapContainerRef = useRef(null);
    const leafletMapRef   = useRef(null);
    const tileLayerRef    = useRef(null);
    const markersRef      = useRef({});
    const crawlLineRef    = useRef([]);

    const [filter, setFilter] = useState('all'); // 'all' | 'visited' | 'toVisit'
    const [tierFilter, setTierFilter] = useState('all');
    const [selectedPub, setSelectedPub] = useState(null);
    const [localPubs, setLocalPubs] = useState([]);

    // Geocoding
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });

    // Crawls & Routing
    const [crawls, setCrawls] = useState([]);
    const [activeCrawl, setActiveCrawl] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [crawlName, setCrawlName] = useState('');
    const [crawlDate, setCrawlDate] = useState('');
    const [crawlPubIds, setCrawlPubIds] = useState([]);
    const [travelMode, setTravelMode] = useState('foot');
    const [routeData, setRouteData] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [directionsOpen, setDirectionsOpen] = useState(false);

    // AI Crawl Generator
    const [aiVibe, setAiVibe] = useState('');
    const [aiNumStops, setAiNumStops] = useState(3);
    const [aiLoading, setAiLoading] = useState(false);

    // Map style mode
    const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'standard'

    const allPubs = useMemo(() => [
        ...pubsArray.map(p => ({ ...p, _listType: 'visited' })),
        ...newPubsArray.map(p => ({ ...p, _listType: 'toVisit' })),
    ], [pubsArray, newPubsArray]);

    const effectiveWeights = useMemo(() => {
        const map = {};
        criteriaArray.forEach(c => { map[c.id] = c.weight ?? 1; });
        return map;
    }, [criteriaArray]);

    const pubScoreMap = useMemo(() => {
        const map = {};
        allPubs.forEach(pub => {
            let totalScore = 0;
            let totalWeight = 0;
            Object.entries(scoresObj[pub.id] ?? {}).forEach(([cid, cScores]) => {
                const w = effectiveWeights[cid] ?? 1;
                (cScores || []).forEach(s => {
                    if (s.type === 'scale' && s.value != null) {
                        totalScore += s.value * w;
                        totalWeight += w;
                    }
                    if (s.type === 'price' && s.value != null) {
                        totalScore += (s.value * 2) * w;
                        totalWeight += w;
                    }
                });
            });
            map[pub.id] = totalWeight > 0
                ? { score: totalScore / totalWeight, hasScore: true }
                : { score: 0, hasScore: false };
        });
        return map;
    }, [allPubs, scoresObj, effectiveWeights]);

    useEffect(() => {
        setLocalPubs(allPubs);
    }, [allPubs]);

    // Missing pub coordinates geocoder
    const geocodedRef = useRef(false);
    useEffect(() => {
        if (!pubsRef || geocodedRef.current) return;
        const missing = allPubs.filter(p => !p.lat || !p.lng);
        if (!missing.length) return;
        geocodedRef.current = true;
        setGeocoding(true);
        geocodeMissingPubs(allPubs, (done, total) => setGeocodeProgress({ done, total }))
            .then(results => {
                setGeocoding(false);
                if (!results.length) return;
                const batch = db.batch();
                results.forEach(({ id, lat, lng }) =>
                    batch.set(pubsRef.doc(id), { lat, lng }, { merge: true })
                );
                batch.commit().catch(console.error);
                setLocalPubs(prev => prev.map(p => {
                    const found = results.find(r => r.id === p.id);
                    return found ? { ...p, lat: found.lat, lng: found.lng } : p;
                }));
            });
    }, [allPubs, pubsRef, db]);

    // Load saved crawls
    useEffect(() => {
        if (!groupId) return;
        if (groupId === 'demo-group') {
            setCrawls(SAMPLE_CRAWLS);
            return;
        }
        if (!db) return;
        const unsub = db.collection('crawls')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setCrawls(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        return unsub;
    }, [db, groupId]);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current || leafletMapRef.current) return;

        // Auto-detect theme for initial tile
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const initialStyle = isDark ? 'dark' : 'standard';
        setMapStyle(initialStyle);

        const tileUrl = initialStyle === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([52.5, -2.1], 9);

        // Put zoom in bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        tileLayerRef.current = L.tileLayer(tileUrl, {
            maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;

        return () => {
            map.remove();
            leafletMapRef.current = null;
        };
    }, []);

    // Switch Tile Layer
    const handleSwitchTileStyle = (style) => {
        if (!leafletMapRef.current) return;
        setMapStyle(style);
        if (tileLayerRef.current) {
            tileLayerRef.current.remove();
        }
        const url = style === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        tileLayerRef.current = L.tileLayer(url, { maxZoom: 19 }).addTo(leafletMapRef.current);
    };

    // Filtered Pubs
    const filteredPubs = useMemo(() => localPubs.filter(p => {
        if (filter === 'visited' && p._listType !== 'visited') return false;
        if (filter === 'toVisit' && p._listType !== 'toVisit') return false;
        const { score, hasScore } = pubScoreMap[p.id] || { score: 0, hasScore: false };
        if (tierFilter !== 'all' && tierLabel(score, hasScore) !== tierFilter) return false;
        return true;
    }), [localPubs, filter, tierFilter, pubScoreMap]);

    // Render Markers
    useEffect(() => {
        if (!leafletMapRef.current) return;

        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        const validCoords = [];

        filteredPubs.forEach(pub => {
            if (!pub.lat || !pub.lng) return;
            validCoords.push([pub.lat, pub.lng]);

            const { score, hasScore } = pubScoreMap[pub.id] || { score: 0, hasScore: false };
            const color = tierColor(score, hasScore);
            const label = hasScore ? score.toFixed(1) : '';
            const isVisited = pub._listType === 'visited' || hasScore;

            const marker = L.marker([pub.lat, pub.lng], {
                icon: makePinIcon(color, label, isVisited)
            });

            marker.bindTooltip(buildTooltipHTML(pub, score, hasScore, color), {
                direction: 'top',
                offset: [0, -32],
                opacity: 1,
                className: 'tavern-marker-tooltip',
            });

            marker.bindPopup(buildPopupHTML(pub, score, hasScore, color), {
                maxWidth: 240,
                className: 'tavern-popup-wrapper'
            });

            marker.on('popupopen', () => {
                const btn = document.getElementById(`popup-view-btn-${pub.id}`);
                if (btn && onViewDetail) {
                    btn.onclick = () => onViewDetail(pub);
                }
            });

            marker.on('click', () => setSelectedPub(pub));
            marker.addTo(leafletMapRef.current);
            markersRef.current[pub.id] = marker;
        });

        // Fit bounds if coords exist and map not zoomed by user
        if (validCoords.length > 0 && !activeCrawl) {
            try {
                leafletMapRef.current.fitBounds(L.latLngBounds(validCoords), {
                    padding: [50, 50],
                    maxZoom: 14
                });
            } catch (e) {
                // ignore
            }
        }
    }, [filteredPubs, pubScoreMap, onViewDetail, activeCrawl]);

    // Crawl routing line & numbered waypoints
    const clearCrawlLayers = useCallback(() => {
        crawlLineRef.current.forEach(l => l.remove());
        crawlLineRef.current = [];
        Object.keys(markersRef.current)
            .filter(k => k.startsWith('crawl_'))
            .forEach(k => {
                markersRef.current[k].remove();
                delete markersRef.current[k];
            });
    }, []);

    useEffect(() => {
        clearCrawlLayers();
        setRouteData(null);
        setDirectionsOpen(false);

        const ids = activeCrawl ? activeCrawl.pubIds : (crawlPubIds.length >= 2 ? crawlPubIds : null);
        if (!ids || ids.length < 2 || !leafletMapRef.current) return;

        const waypoints = ids
            .map(id => localPubs.find(p => p.id === id))
            .filter(p => p?.lat && p?.lng)
            .map(p => [p.lat, p.lng]);

        if (waypoints.length < 2) return;

        ids.forEach((id, idx) => {
            const pub = localPubs.find(p => p.id === id);
            if (!pub?.lat || !pub?.lng) return;
            const m = L.marker([pub.lat, pub.lng], { icon: makeStepNumberIcon(idx + 1) })
                .bindTooltip(pub.name, { permanent: false })
                .addTo(leafletMapRef.current);
            markersRef.current[`crawl_${id}_${idx}`] = m;
        });

        setRouteLoading(true);
        fetchRoute(waypoints, travelMode).then(result => {
            setRouteLoading(false);
            if (!result || !leafletMapRef.current) {
                const fallback = L.polyline(waypoints, {
                    color: '#d97706',
                    weight: 4,
                    dashArray: '8 8'
                }).addTo(leafletMapRef.current);
                crawlLineRef.current.push(fallback);
                leafletMapRef.current.fitBounds(fallback.getBounds(), { padding: [40, 40] });
                return;
            }
            setRouteData(result);
            const line = L.polyline(result.coords, {
                color: '#d97706',
                weight: 5,
                opacity: 0.95
            }).addTo(leafletMapRef.current);
            crawlLineRef.current.push(line);
            leafletMapRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
        });
    }, [activeCrawl, crawlPubIds, travelMode, localPubs, clearCrawlLayers]);

    const flyToPub = useCallback((pub) => {
        if (!pub.lat || !pub.lng || !leafletMapRef.current) return;
        leafletMapRef.current.flyTo([pub.lat, pub.lng], 16, { duration: 0.8 });
        const marker = markersRef.current[pub.id];
        if (marker) setTimeout(() => marker.openPopup(), 850);
        setSelectedPub(pub);
    }, []);

    // AI Crawl Generation
    const generateAICrawl = async () => {
        if (!aiVibe.trim()) return;
        setAiLoading(true);
        try {
            const center = leafletMapRef.current ? leafletMapRef.current.getCenter() : null;
            const generateCrawlFn = firebase.app().functions('europe-west2').httpsCallable('generateAICrawl');

            const result = await generateCrawlFn({
                groupId,
                vibe: aiVibe,
                numStops: Number(aiNumStops),
                startLat: center?.lat,
                startLng: center?.lng
            });

            if (result.data?.pubIds) {
                const validIds = result.data.pubIds.filter(id => localPubs.find(p => p.id === id));
                setCrawlPubIds(validIds);
                if (validIds.length > 0) {
                    showToast(`AI created a ${validIds.length}-stop route for "${aiVibe}"!`, 'success');
                } else {
                    showToast('Could not find matching pubs for this vibe', 'info');
                }
            }
        } catch (err) {
            console.error('AI Crawl Error:', err);
            showToast('Failed to generate route', 'error');
        } finally {
            setAiLoading(false);
        }
    };

    // Save Crawl
    const saveCrawl = async () => {
        if (!crawlName.trim() || crawlPubIds.length < 2) return;
        try {
            await db.collection('crawls').add({
                groupId,
                name: crawlName.trim(),
                date: crawlDate || null,
                pubIds: crawlPubIds,
                creatorId: user?.uid || null,
                creatorName: user?.displayName || user?.email?.split('@')[0] || 'Member',
                createdAt: new Date(),
            });
            showToast('Pub crawl saved!', 'success');
            setDrawerOpen(false);
            setCrawlName('');
            setCrawlDate('');
            setCrawlPubIds([]);
        } catch (err) {
            console.error('Error saving crawl:', err);
            showToast('Failed to save crawl', 'error');
        }
    };

    // Delete Crawl
    const deleteCrawl = async (id) => {
        if (!window.confirm('Delete this crawl route?')) return;
        try {
            await db.collection('crawls').doc(id).delete();
            if (activeCrawl?.id === id) {
                setActiveCrawl(null);
                setRouteData(null);
            }
            showToast('Crawl deleted', 'info');
        } catch (err) {
            console.error(err);
            showToast('Failed to delete crawl', 'error');
        }
    };

    const toggleCrawlPub = (id) => {
        setCrawlPubIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const movePubUp = (i) => {
        if (i === 0) return;
        const a = [...crawlPubIds];
        [a[i - 1], a[i]] = [a[i], a[i - 1]];
        setCrawlPubIds(a);
    };

    const movePubDown = (i) => {
        if (i === crawlPubIds.length - 1) return;
        const a = [...crawlPubIds];
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        setCrawlPubIds(a);
    };

    const activeIds = activeCrawl ? activeCrawl.pubIds : crawlPubIds;
    const activeStops = activeIds.map(id => localPubs.find(p => p.id === id)).filter(Boolean);
    const pubsWithCoords = localPubs.filter(p => p.lat && p.lng);

    return (
        <div className="w-full space-y-6 animate-fadeIn pb-24">
            <style>{`
                .tavern-marker-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .tavern-marker-tooltip .leaflet-tooltip-content { padding: 0 !important; }
                .tavern-marker-tooltip::before { display: none !important; }

                .tavern-popup-wrapper .leaflet-popup-content-wrapper {
                    padding: 0 !important;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .tavern-popup-wrapper .leaflet-popup-content { margin: 0 !important; }
                .tavern-popup-wrapper .leaflet-popup-tip { background: #ffffff !important; }
            `}</style>

            {/* Header: Title and Route Planning Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-divider)] pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🗺️</span>
                        <h1 className="font-display text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight">
                            Interactive Map
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                        {pubsWithCoords.length} of {localPubs.length} pubs geocoded & mapped across your territory.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setDrawerOpen(true); setActiveCrawl(null); }}
                        className="btn-fun-primary !py-2.5 !px-5 text-xs font-extrabold"
                    >
                        <Route className="w-4 h-4" />
                        <span>Plan Crawl</span>
                    </button>
                </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="card-tavern p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border border-[var(--color-border)]">
                {/* Status and Tier Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--color-surface-offset)] p-1 rounded-xl border border-[var(--color-border)]">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                filter === 'all'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            All ({localPubs.length})
                        </button>
                        <button
                            onClick={() => setFilter('visited')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                filter === 'visited'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            Visited
                        </button>
                        <button
                            onClick={() => setFilter('toVisit')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                filter === 'toVisit'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            Hit List
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-[var(--color-divider)] mx-1 hidden sm:block" />

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {['all', 'Legendary', 'Great', 'Decent', 'Avoid', 'Unrated'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTierFilter(t)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                                    tierFilter === t
                                        ? 'bg-[var(--color-brand)] text-stone-900 border-[var(--color-brand)] font-bold'
                                        : 'bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-brand)]'
                                }`}
                            >
                                {t === 'all' ? 'All Tiers' : t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right controls: Map Style Switcher (Carto Dark vs OSM) */}
                <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase">
                        Theme:
                    </span>
                    <div className="flex items-center bg-[var(--color-surface-offset)] p-0.5 rounded-xl border border-[var(--color-border)]">
                        <button
                            onClick={() => handleSwitchTileStyle('dark')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                mapStyle === 'dark'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)]'
                            }`}
                        >
                            Dark Oak
                        </button>
                        <button
                            onClick={() => handleSwitchTileStyle('standard')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                mapStyle === 'standard'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)]'
                            }`}
                        >
                            Street
                        </button>
                    </div>
                </div>
            </div>

            {/* Map Canvas Card */}
            <div className="card-tavern overflow-hidden h-[34rem] sm:h-[40rem] relative flex flex-col p-0 border border-[var(--color-border)] shadow-xl">
                <div ref={mapContainerRef} className="w-full h-full z-0" />

                {/* Status Overlays */}
                {geocoding && (
                    <div className="absolute top-4 left-4 bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-full px-4 py-1.5 shadow-lg z-[1000] text-xs font-bold text-[var(--color-brand)] flex items-center gap-2">
                        <Compass className="w-4 h-4 animate-spin text-amber-500" />
                        <span>Locating taverns… {geocodeProgress.done}/{geocodeProgress.total}</span>
                    </div>
                )}

                {routeLoading && (
                    <div className="absolute top-4 left-4 bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-full px-4 py-1.5 shadow-lg z-[1000] text-xs font-bold text-[var(--color-brand)] flex items-center gap-2">
                        <Route className="w-4 h-4 animate-pulse text-amber-500" />
                        <span>Calculating walking route…</span>
                    </div>
                )}

                {/* Active Crawl floating banner */}
                {activeCrawl && (
                    <div className="absolute top-4 right-4 bg-[var(--color-surface)]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 shadow-xl z-[1000] max-w-xs flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 block">
                                Active Crawl Route
                            </span>
                            <h4 className="font-display text-base font-normal text-[var(--color-text)] truncate">
                                {activeCrawl.name}
                            </h4>
                        </div>
                        <button
                            onClick={() => {
                                setActiveCrawl(null);
                                setRouteData(null);
                            }}
                            className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-red-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Route Stats & Directions Breakdown (if active crawl route loaded) */}
            {routeData && activeStops.length >= 2 && (
                <div className="card-tavern p-5 sm:p-6 border border-[var(--color-border)] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-1 bg-[var(--color-surface-offset)] p-1 rounded-xl border border-[var(--color-border)]">
                            <button
                                onClick={() => setTravelMode('foot')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    travelMode === 'foot'
                                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                        : 'text-[var(--color-text-muted)]'
                                }`}
                            >
                                <Footprints className="w-3.5 h-3.5 text-amber-500" />
                                <span>Walking</span>
                            </button>
                            <button
                                onClick={() => setTravelMode('driving')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    travelMode === 'driving'
                                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                        : 'text-[var(--color-text-muted)]'
                                }`}
                            >
                                <Car className="w-3.5 h-3.5 text-blue-500" />
                                <span>Driving</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    Distance
                                </p>
                                <p className="text-xl font-display font-normal text-[var(--color-text)]">
                                    {fmtDist(routeData.totalDistance)}
                                </p>
                            </div>
                            <div className="border-l border-[var(--color-divider)] pl-6">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    Duration
                                </p>
                                <p className="text-xl font-display font-normal text-[var(--color-text)]">
                                    {fmtDuration(routeData.totalDuration)}
                                </p>
                            </div>
                            <div className="border-l border-[var(--color-divider)] pl-6">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    Stops
                                </p>
                                <p className="text-xl font-display font-normal text-[var(--color-text)]">
                                    {activeStops.length} pubs
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setDirectionsOpen(o => !o)}
                            className="btn-tavern text-xs px-3.5 py-2 font-bold"
                        >
                            {directionsOpen ? 'Hide Steps' : 'Turn-by-Turn Directions'}
                        </button>
                    </div>

                    {directionsOpen && (
                        <div className="pt-4 border-t border-[var(--color-divider)] space-y-4">
                            {/* Itinerary horizontal pub chips */}
                            <div className="flex gap-3 overflow-x-auto pb-3">
                                {activeStops.map((pub, idx) => (
                                    <div key={pub.id} className="flex items-center gap-2 shrink-0">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
                                            <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-900 flex items-center justify-center text-[10px] font-black">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-[var(--color-text)]">
                                                {pub.name}
                                            </span>
                                        </div>
                                        {idx < activeStops.length - 1 && (
                                            <ChevronRight className="w-4 h-4 text-[var(--color-text-faint)]" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Step by step list */}
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {routeData.steps.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-2.5 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)] text-xs"
                                    >
                                        <span className="w-5 h-5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center text-[9px] font-bold shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-[var(--color-text)]">{step.instruction}</p>
                                            <p className="text-[10px] text-[var(--color-text-faint)] mt-0.5">
                                                {fmtDist(step.distance)} · {fmtDuration(step.duration)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Fly-To Carousel of Pubs */}
            <div className="card-tavern p-4 sm:p-5 border border-[var(--color-border)]">
                <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider mb-3">
                    Click to fly to location on map:
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {filteredPubs.map(pub => {
                        const { score, hasScore } = pubScoreMap[pub.id] || { score: 0, hasScore: false };
                        const hasCoords = pub.lat && pub.lng;
                        const isSelected = selectedPub?.id === pub.id;
                        return (
                            <div
                                key={pub.id}
                                onClick={() => hasCoords && flyToPub(pub)}
                                className={`shrink-0 w-36 rounded-xl border p-2.5 transition flex flex-col justify-between ${
                                    isSelected
                                        ? 'border-[var(--color-brand)] bg-[var(--color-surface-offset)] shadow-md'
                                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brand)]/60'
                                } ${hasCoords ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                            >
                                <div className="h-16 w-full rounded-lg overflow-hidden bg-[var(--color-surface-offset)] mb-2">
                                    {pub.photoURL ? (
                                        <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl">🍺</div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-display text-sm font-normal text-[var(--color-text)] truncate">
                                        {pub.name}
                                    </h4>
                                    <p className="text-[10px] text-[var(--color-text-muted)] truncate mb-1">
                                        {pub.location || 'Local Pub'}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-divider)]">
                                    {hasScore ? (
                                        <span className="text-[11px] font-bold text-[var(--color-brand)] tabular-nums">
                                            ★ {score.toFixed(1)}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold text-[var(--color-text-faint)] uppercase">
                                            To Visit
                                        </span>
                                    )}
                                    {!hasCoords && (
                                        <span className="text-[9px] text-amber-500 font-bold">No GPS</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Saved Pub Crawls Grid */}
            {crawls.length > 0 && (
                <div className="card-tavern p-5 sm:p-6 border border-[var(--color-border)] space-y-4">
                    <h3 className="font-display text-2xl text-[var(--color-text)]">
                        Saved Crawl Routes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {crawls.map(crawl => {
                            const isActive = activeCrawl?.id === crawl.id;
                            const stopPubs = (crawl.pubIds || []).map(id => localPubs.find(p => p.id === id)).filter(Boolean);
                            return (
                                <div
                                    key={crawl.id}
                                    className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                                        isActive
                                            ? 'border-amber-500 bg-amber-500/5'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface-offset)]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="font-display text-lg text-[var(--color-text)]">
                                                {crawl.name}
                                            </h4>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-semibold">
                                                {crawl.date ? new Date(crawl.date).toLocaleDateString() : 'No date'} · {stopPubs.length} stops
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteCrawl(crawl.id)}
                                            className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Stops preview */}
                                    <div className="space-y-1">
                                        {stopPubs.slice(0, 3).map((p, idx) => (
                                            <div key={p.id} className="flex items-center gap-2 text-xs text-[var(--color-text)] truncate">
                                                <span className="w-4 h-4 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center text-[9px] font-bold shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="truncate">{p.name}</span>
                                            </div>
                                        ))}
                                        {stopPubs.length > 3 && (
                                            <span className="text-[10px] text-[var(--color-text-faint)] pl-6">
                                                +{stopPubs.length - 3} more
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (isActive) {
                                                setActiveCrawl(null);
                                                setRouteData(null);
                                            } else {
                                                setActiveCrawl(crawl);
                                                setCrawlPubIds([]);
                                            }
                                        }}
                                        className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                                            isActive
                                                ? 'bg-amber-500 text-stone-900 font-extrabold shadow-sm'
                                                : 'btn-tavern'
                                        }`}
                                    >
                                        {isActive ? 'Hide Route' : 'Display Route on Map'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Plan Crawl Drawer / Slide-Over */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="relative z-10 w-full max-w-md h-full overflow-y-auto card-tavern bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl flex flex-col p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4">
                            <div>
                                <h3 className="font-display text-2xl text-[var(--color-text)]">
                                    Plan Pub Crawl
                                </h3>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    Assemble your route or let Gemini generate one.
                                </p>
                            </div>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Name and Date */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                    Crawl Title
                                </label>
                                <input
                                    type="text"
                                    value={crawlName}
                                    onChange={e => setCrawlName(e.target.value)}
                                    placeholder="e.g. Saturday Night Ale Trail"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-brand)]"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                    Target Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={crawlDate}
                                    onChange={e => setCrawlDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-brand)]"
                                />
                            </div>
                        </div>

                        {/* AI Crawl Generator Box */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/30 space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <h4 className="text-xs font-bold text-[var(--color-text)]">
                                    AI Itinerary Assistant
                                </h4>
                            </div>
                            <input
                                type="text"
                                value={aiVibe}
                                onChange={e => setAiVibe(e.target.value)}
                                placeholder="Describe vibe (e.g. Cozy fireplace, craft IPA)"
                                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-brand)]"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Stops:</span>
                                    <input
                                        type="range"
                                        min="2"
                                        max="6"
                                        value={aiNumStops}
                                        onChange={e => setAiNumStops(parseInt(e.target.value))}
                                        className="flex-1 accent-amber-500"
                                    />
                                    <span className="text-xs font-bold text-[var(--color-text)]">{aiNumStops}</span>
                                </div>
                                <button
                                    onClick={generateAICrawl}
                                    disabled={aiLoading || !aiVibe.trim()}
                                    className="btn-brand text-xs px-3.5 py-1.5 font-bold disabled:opacity-50"
                                >
                                    {aiLoading ? 'Thinking...' : 'Generate'}
                                </button>
                            </div>
                        </div>

                        {/* Selected Route Order */}
                        {crawlPubIds.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                    Itinerary Order ({crawlPubIds.length} stops)
                                </label>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {crawlPubIds.map((id, idx) => {
                                        const pub = localPubs.find(p => p.id === id);
                                        if (!pub) return null;
                                        return (
                                            <div
                                                key={id}
                                                className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-xs"
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-900 flex items-center justify-center text-[10px] font-black shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-semibold text-[var(--color-text)] truncate">{pub.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => movePubUp(idx)}
                                                        className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] hover:text-[var(--color-brand)]"
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        onClick={() => movePubDown(idx)}
                                                        className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] hover:text-[var(--color-brand)]"
                                                    >
                                                        ↓
                                                    </button>
                                                    <button
                                                        onClick={() => toggleCrawlPub(id)}
                                                        className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Add/Remove Pubs List */}
                        <div className="space-y-2 flex-1">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                Tap Pubs to Include:
                            </label>
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {localPubs.map(pub => {
                                    const included = crawlPubIds.includes(pub.id);
                                    return (
                                        <div
                                            key={pub.id}
                                            onClick={() => toggleCrawlPub(pub.id)}
                                            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${
                                                included
                                                    ? 'border-amber-500 bg-amber-500/10'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface-offset)] hover:border-[var(--color-brand)]'
                                            }`}
                                        >
                                            <div className="truncate">
                                                <p className="font-semibold text-[var(--color-text)] truncate">{pub.name}</p>
                                                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{pub.location || 'Local Pub'}</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${
                                                included ? 'bg-amber-500 text-stone-900' : 'border border-[var(--color-border)]'
                                            }`}>
                                                {included ? '✓' : '+'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Drawer Actions */}
                        <div className="flex gap-2 pt-4 border-t border-[var(--color-divider)]">
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="btn-tavern flex-1 text-xs py-2.5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveCrawl}
                                disabled={!crawlName.trim() || crawlPubIds.length < 2}
                                className="btn-brand flex-[2] text-xs py-2.5 font-bold disabled:opacity-50"
                            >
                                Save Itinerary
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
