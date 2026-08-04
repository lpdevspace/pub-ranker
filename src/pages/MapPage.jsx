import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeMissingPubs } from '../utils/geocode';

/* ─── tier helpers ──────────────────────────────────────────────────────── */
const tierColor = (score, hasScore) => {
    if (!hasScore) return 'var(--color-text-faint)';
    if (score >= 8.5) return 'var(--color-brand)';
    if (score >= 7)   return 'color-mix(in srgb, var(--color-brand) 75%, #000)';
    if (score >= 5)   return '#f59e0b';
    return '#dc2626';
};

const tierLabel = (score, hasScore) => {
    if (!hasScore) return 'Unrated';
    if (score >= 8.5) return 'Legendary';
    if (score >= 7)   return 'Great';
    if (score >= 5)   return 'Decent';
    return 'Avoid';
};

/* Simplified flat markers */
const makeIcon = (color, label = '') =>
    L.divIcon({
        className: '',
        html: `
          <div style="
            width:2rem;height:2rem;
            background:${color};
            border:2px solid var(--color-surface);
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
            transition:transform 0.15s ease;
          ">
            <span style="transform:rotate(45deg);font-size:0.6rem;font-weight:900;color:#fff;line-height:1;">
              ${label}
            </span>
          </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
    });

const makeNumberIcon = (n, color) =>
    L.divIcon({
        className: '',
        html: `
          <div style="
            width:1.8rem;height:1.8rem;
            background:${color};
            border:2px solid var(--color-surface);
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="font-size:0.75rem;font-weight:900;color:#fff;">${n}</span>
          </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
    });

/* ─── OSRM routing ─────────────────────────────────────────────────────── */
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

/* ─── tooltip / popup builders ─────────────────────────────────────────── */
const buildTooltipHTML = (pub, score, hasScore, color) => {
    const photoUrl = pub.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo';
    const photoBlock = `<img src="${photoUrl}" alt="${pub.name}" style="width:100%;height:6rem;object-fit:cover;display:block;border-radius:var(--radius-lg) var(--radius-lg) 0 0;" />`;
    const scoreBadge = hasScore
        ? `<span style="background:${color};color:#fff;padding:2px 6px;border-radius:var(--radius-full);font-size:0.7rem;font-weight:800;">${score.toFixed(1)}</span>
           <span style="color:var(--color-text-muted);font-size:0.65rem;font-weight:700;text-transform:uppercase;">${tierLabel(score, hasScore)}</span>`
        : `<span style="color:var(--color-text-faint);font-size:0.7rem;font-weight:600;">Unrated</span>`;
    return `
      <div style="width:180px;pointer-events:none;background:var(--color-surface);border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--color-border);">
        ${photoBlock}
        <div style="padding:8px 10px 10px;">
          <p style="font-weight:800;font-size:0.85rem;color:var(--color-text);line-height:1.2;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pub.name}</p>
          <p style="font-size:0.65rem;color:var(--color-text-muted);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pub.location || ''}</p>
          <div style="display:flex;align-items:center;gap:6px;">${scoreBadge}</div>
        </div>
      </div>`;
};

const buildPopupHTML = (pub, score, hasScore, color) => {
    const photoUrl = pub.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo';
    const photoBlock = `<img src="${photoUrl}" alt="${pub.name}" style="width:100%;height:8rem;object-fit:cover;display:block;border-radius:var(--radius-lg) var(--radius-lg) 0 0;" />`;
    const scoreHTML = hasScore
        ? `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:var(--radius-full);font-weight:900;font-size:0.8rem;">${score.toFixed(1)}/10</span>
           <span style="color:var(--color-text-muted);font-size:0.7rem;font-weight:700;text-transform:uppercase;">${tierLabel(score, hasScore)}</span>`
        : `<span style="color:var(--color-text-faint);font-size:0.8rem;font-weight:600;">Unrated</span>`;
    const googleHTML = pub.googleLink
        ? `<a href="${pub.googleLink}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:10px;background:var(--color-surface-offset);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:6px;font-size:0.7rem;font-weight:800;color:var(--color-text);text-decoration:none;">Open in Google Maps</a>`
        : '';
    return `
      <div style="width:200px;">
        ${photoBlock}
        <div style="padding:10px 12px 12px;">
          <p style="font-weight:900;font-size:0.95rem;margin-bottom:2px;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pub.name}</p>
          <p style="font-size:0.7rem;color:var(--color-text-muted);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pub.location || ''}</p>
          <div style="display:flex;align-items:center;gap:6px;">${scoreHTML}</div>
          ${googleHTML}
        </div>
      </div>`;
};

/* ─── main component ────────────────────────────────────────────────────── */
export default function MapPage({ pubs, newPubs, scores, criteria, db, groupId, setPage, allUsers, user }) {
    const pubsArray     = Array.isArray(pubs)     ? pubs     : Object.values(pubs     || {});
    const newPubsArray  = Array.isArray(newPubs)  ? newPubs  : Object.values(newPubs  || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj     = scores || {};

    const pubsRef = useMemo(
        () => db && groupId ? db.collection('groups').doc(groupId).collection('pubs') : null,
        [db, groupId]
    );

    const mapRef       = useRef(null);
    const leafletRef   = useRef(null);
    const markersRef   = useRef({});
    const crawlLineRef = useRef([]); 

    const [filter,           setFilter]           = useState('all');
    const [tierFilter,       setTierFilter]        = useState('all');
    const [selectedPub,      setSelectedPub]       = useState(null);
    const [crawls,           setCrawls]            = useState([]);
    const [activeCrawl,      setActiveCrawl]       = useState(null);
    const [drawerOpen,       setDrawerOpen]        = useState(false);
    const [crawlName,        setCrawlName]         = useState('');
    const [crawlDate,        setCrawlDate]         = useState('');
    const [crawlPubIds,      setCrawlPubIds]       = useState([]);
    const [geocoding,        setGeocoding]         = useState(false);
    const [geocodeProgress,  setGeocodeProgress]   = useState({ done: 0, total: 0 });
    const [localPubs,        setLocalPubs]         = useState([]);
    const [travelMode,       setTravelMode]        = useState('foot');
    const [routeData,        setRouteData]         = useState(null);
    const [routeLoading,     setRouteLoading]      = useState(false);
    const [directionsOpen,   setDirectionsOpen]    = useState(false);

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
            let totalScore = 0, totalWeight = 0;
            Object.entries(scoresObj[pub.id] ?? {}).forEach(([cid, cScores]) => {
                const w = effectiveWeights[cid] ?? 1;
                (cScores || []).forEach(s => {
                    if (s.type === 'scale' && s.value != null)  { totalScore += s.value * w; totalWeight += w; }
                    if (s.type === 'price' && s.value != null)  { totalScore += (s.value * 2) * w; totalWeight += w; }
                });
            });
            map[pub.id] = totalWeight > 0 ? { score: totalScore / totalWeight, hasScore: true } : { score: 0, hasScore: false };
        });
        return map;
    }, [allPubs, scoresObj, effectiveWeights]);

    useEffect(() => { setLocalPubs(allPubs); }, [allPubs]);

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
                    batch.set(
                        pubsRef.doc(id),
                        { lat, lng },
                        { merge: true }
                    )
                );
                batch.commit().catch(console.error);
                setLocalPubs(prev => prev.map(p => {
                    const found = results.find(r => r.id === p.id);
                    return found ? { ...p, lat: found.lat, lng: found.lng } : p;
                }));
            });
    }, [allPubs, pubsRef]);

    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db.collection('crawls')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => setCrawls(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsub;
    }, [db, groupId]);

    useEffect(() => {
        if (!mapRef.current || leafletRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([52.5, -2.1], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19,
        }).addTo(map);
        leafletRef.current = map;
        return () => { map.remove(); leafletRef.current = null; };
    }, []);

    const filteredPubs = useMemo(() => localPubs.filter(p => {
        if (filter === 'visited'  && p._listType !== 'visited')  return false;
        if (filter === 'toVisit'  && p._listType !== 'toVisit')  return false;
        const { score, hasScore } = pubScoreMap[p.id] || { score: 0, hasScore: false };
        if (tierFilter !== 'all' && tierLabel(score, hasScore) !== tierFilter) return false;
        return true;
    }), [localPubs, filter, tierFilter, pubScoreMap]);

    useEffect(() => {
        if (!leafletRef.current) return;
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};
        filteredPubs.forEach(pub => {
            if (!pub.lat || !pub.lng) return;
            const { score, hasScore } = pubScoreMap[pub.id] || { score: 0, hasScore: false };
            const color  = tierColor(score, hasScore);
            const label  = hasScore ? score.toFixed(1) : '';
            const marker = L.marker([pub.lat, pub.lng], { icon: makeIcon(color, label) });
            marker.bindTooltip(buildTooltipHTML(pub, score, hasScore, color), {
                direction: 'top', offset: [0, -25], opacity: 1, className: 'pub-hover-tooltip',
            });
            marker.bindPopup(buildPopupHTML(pub, score, hasScore, color), { maxWidth: 220, className: 'pub-popup' });
            marker.on('click', () => setSelectedPub(pub));
            marker.addTo(leafletRef.current);
            markersRef.current[pub.id] = marker;
        });
    }, [filteredPubs, pubScoreMap]);

    const clearCrawlLayers = useCallback(() => {
        crawlLineRef.current.forEach(l => l.remove());
        crawlLineRef.current = [];
        Object.keys(markersRef.current).filter(k => k.startsWith('crawl_')).forEach(k => {
            markersRef.current[k].remove();
            delete markersRef.current[k];
        });
    }, []);

    useEffect(() => {
        clearCrawlLayers();
        setRouteData(null);
        setDirectionsOpen(false);

        const ids = activeCrawl ? activeCrawl.pubIds : (crawlPubIds.length >= 2 ? crawlPubIds : null);
        if (!ids || ids.length < 2 || !leafletRef.current) return;

        const waypoints = ids
            .map(id => localPubs.find(p => p.id === id))
            .filter(p => p?.lat && p?.lng)
            .map(p => [p.lat, p.lng]);
        if (waypoints.length < 2) return;

        ids.forEach((id, idx) => {
            const pub = localPubs.find(p => p.id === id);
            if (!pub?.lat || !pub?.lng) return;
            const m = L.marker([pub.lat, pub.lng], { icon: makeNumberIcon(idx + 1, 'var(--color-brand)') })
                .bindTooltip(pub.name, { permanent: false })
                .addTo(leafletRef.current);
            markersRef.current[`crawl_${id}_${idx}`] = m;
        });

        setRouteLoading(true);
        fetchRoute(waypoints, travelMode).then(result => {
            setRouteLoading(false);
            if (!result || !leafletRef.current) {
                const fallback = L.polyline(waypoints, { color: 'var(--color-brand)', weight: 3, dashArray: '8 8' })
                    .addTo(leafletRef.current);
                crawlLineRef.current.push(fallback);
                leafletRef.current.fitBounds(fallback.getBounds(), { padding: [40, 40] });
                return;
            }
            setRouteData(result);
            const line = L.polyline(result.coords, { color: 'var(--color-brand)', weight: 4, opacity: 0.9 })
                .addTo(leafletRef.current);
            crawlLineRef.current.push(line);
            leafletRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
        });
    }, [activeCrawl, crawlPubIds, travelMode, localPubs]);

    const flyToPub = useCallback((pub) => {
        if (!pub.lat || !pub.lng || !leafletRef.current) return;
        leafletRef.current.flyTo([pub.lat, pub.lng], 16, { duration: 0.8 });
        const marker = markersRef.current[pub.id];
        if (marker) setTimeout(() => marker.openPopup(), 850);
        setSelectedPub(pub);
    }, []);

    const saveCrawl = async () => {
        if (!crawlName.trim() || crawlPubIds.length < 2) return;
        try {
            await db.collection('crawls').add({
                groupId, name: crawlName.trim(), date: crawlDate || null,
                pubIds: crawlPubIds, creatorId: user?.uid || null,
                creatorName: user?.displayName || user?.email || 'Unknown',
                createdAt: new Date(),
            });
            setDrawerOpen(false); setCrawlName(''); setCrawlDate(''); setCrawlPubIds([]);
        } catch (err) { console.error('Error saving crawl:', err); }
    };

    const deleteCrawl = async (id) => {
        if (!window.confirm('Delete this crawl?')) return;
        await db.collection('crawls').doc(id).delete().catch(console.error);
        if (activeCrawl?.id === id) { setActiveCrawl(null); setRouteData(null); }
    };

    const toggleCrawlPub = (id) =>
        setCrawlPubIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const movePubUp   = (i) => { if (i === 0) return; const a = [...crawlPubIds]; [a[i-1],a[i]] = [a[i],a[i-1]]; setCrawlPubIds(a); };
    const movePubDown = (i) => { if (i === crawlPubIds.length-1) return; const a = [...crawlPubIds]; [a[i],a[i+1]] = [a[i+1],a[i]]; setCrawlPubIds(a); };

    const activeIds = activeCrawl ? activeCrawl.pubIds : crawlPubIds;
    const activeStops = activeIds.map(id => localPubs.find(p => p.id === id)).filter(Boolean);
    const visitedPubsSorted = localPubs.filter(p => p._listType === 'visited')
        .sort((a,b) => (pubScoreMap[b.id]?.score||0) - (pubScoreMap[a.id]?.score||0));

    return (
        <div className="space-y-6 md:space-y-8 animate-fadeIn pb-24">

            <style>{`
                .pub-hover-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                .pub-hover-tooltip .leaflet-tooltip-content { padding: 0 !important; }
                .pub-hover-tooltip::before { display: none !important; }
                .pub-popup .leaflet-popup-content-wrapper { padding: 0; border-radius: var(--radius-lg); overflow: hidden; background: var(--color-surface); border: 1px solid var(--color-border); box-shadow: var(--shadow-sm); }
                .pub-popup .leaflet-popup-content { margin: 0; }
                .pub-popup .leaflet-popup-tip { background: var(--color-surface); border: 1px solid var(--color-border); border-top: none; border-left: none; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="relative z-10">
                    <h2 className="font-display text-3xl md:text-4xl font-bold mb-1 text-text">Pub Map</h2>
                    <p className="font-body text-sm font-semibold text-muted">
                        {localPubs.filter(p=>p.lat&&p.lng).length} of {localPubs.length} pubs on the map
                    </p>
                </div>
                <button
                    onClick={() => { setDrawerOpen(true); setActiveCrawl(null); }}
                    className="relative z-10 bg-surface text-brand hover:bg-gray-50 px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:-translate-y-1 border-none cursor-pointer"
                >
                    🗺️ + Create Crawl
                </button>
            </div>

            <div className="card-premium p-4 md:p-5 flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap">
                    {['all','visited','toVisit'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full font-bold text-xs border cursor-pointer transition-colors ${filter === f ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted hover:bg-surface-offset'}`}
                        >
                            { f==='all' ? '🍺 All' : f==='visited' ? '✅ Visited' : '📋 To Visit' }
                        </button>
                    ))}
                    <div className="w-[1px] bg-divider mx-1" />
                    {['all','Legendary','Great','Decent','Avoid','Unrated'].map(t => (
                        <button key={t} onClick={() => setTierFilter(t)}
                            className={`px-3 py-1.5 rounded-full font-bold text-xs border cursor-pointer transition-colors ${tierFilter === t ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted hover:bg-surface-offset'}`}
                        >
                            {t==='all' ? '⭐ All Tiers' : t}
                        </button>
                    ))}
                </div>
                <div className="flex gap-4 flex-wrap items-center">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Key:</p>
                    {[['Legendary','var(--color-brand)'],['Great','color-mix(in srgb, var(--color-brand) 75%, #000)'],['Decent','#f59e0b'],['Avoid','#dc2626'],['Unrated','var(--color-text-faint)']].map(([lbl,clr]) => (
                        <span key={lbl} className="flex items-center gap-1.5 text-xs font-bold text-text">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background:clr }} />
                            {lbl}
                        </span>
                    ))}
                </div>
            </div>

            <div className="card-premium overflow-hidden h-[36rem] relative flex flex-col p-0 border border-border shadow-inner">
                <div ref={mapRef} className="w-full h-full z-0" />
                
                {geocoding && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-full px-4 py-2 shadow-sm z-[1000] font-bold text-xs text-brand flex items-center gap-2">
                        <span className="inline-block animate-[spin_1s_linear_infinite]">⚙️</span>
                        Locating pubs… {geocodeProgress.done}/{geocodeProgress.total}
                    </div>
                )}
                {routeLoading && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-full px-4 py-2 shadow-sm z-[1000] font-bold text-xs text-brand flex items-center gap-2">
                        <span className="inline-block animate-[spin_1s_linear_infinite]">🗺️</span>
                        Calculating route…
                    </div>
                )}
            </div>

            {routeData && activeStops.length >= 2 && (
                <div className="card-premium p-6 md:p-8 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex gap-2 p-1 bg-surface-offset rounded-lg border border-divider">
                            {[['foot','🚶 Walking'],['driving','🚗 Driving']].map(([mode, label]) => (
                                <button key={mode} onClick={() => setTravelMode(mode)}
                                    className={`px-3 py-1.5 rounded-md font-bold text-xs border-none cursor-pointer transition-colors ${travelMode === mode ? 'bg-surface text-text shadow-xs' : 'bg-transparent text-muted'}`}
                                >{label}</button>
                            ))}
                        </div>
                        <div className="flex gap-6 items-center">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Distance</p>
                                <p className="text-xl font-black text-text tabular-nums">{fmtDist(routeData.totalDistance)}</p>
                            </div>
                            <div className="text-right border-l border-divider pl-6">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Time</p>
                                <p className="text-xl font-black text-text tabular-nums">{fmtDuration(routeData.totalDuration)}</p>
                            </div>
                            <div className="text-right border-l border-divider pl-6">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Stops</p>
                                <p className="text-xl font-black text-text tabular-nums">{activeStops.length}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDirectionsOpen(o => !o)}
                            className="px-4 py-2 rounded-lg font-bold text-xs border border-border bg-surface hover:border-brand text-text cursor-pointer transition-colors"
                        >
                            📋 {directionsOpen ? 'Hide' : 'Show'} Directions
                        </button>
                    </div>

                    {directionsOpen && (
                        <div className="mt-4 pt-4 border-t border-divider">
                            <div className="flex gap-4 overflow-x-auto pb-4 scroll-x-clean mb-4">
                                {activeStops.map((pub, idx) => (
                                    <React.Fragment key={pub.id}>
                                        <div className="shrink-0 flex flex-col items-center gap-2 w-20">
                                            <img src={pub.photoURL || 'https://placehold.co/100x100/1e293b/ffffff?text=' + (idx+1)} alt={pub.name} loading="lazy" className="w-12 h-12 rounded-full object-cover border-2 border-brand" />
                                            <p className="text-[10px] font-bold text-center line-clamp-2 w-full leading-tight">{pub.name}</p>
                                        </div>
                                        {idx < activeStops.length - 1 && (
                                            <div className="shrink-0 flex items-center text-muted font-black text-lg pt-2">→</div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2">
                                {routeData.steps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-surface-offset border border-divider">
                                        <span className="w-6 h-6 rounded-full bg-surface text-muted border border-divider flex items-center justify-center text-[10px] font-black shrink-0">{idx+1}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-text leading-tight">{step.instruction}</p>
                                            <p className="text-[10px] text-muted font-bold tracking-wide mt-1 uppercase">{fmtDist(step.distance)} · {fmtDuration(step.duration)}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-brand-subtle border border-brand/20 text-brand">
                                    <span className="text-xl">🍺</span>
                                    <p className="text-sm font-black">Arrive at {activeStops[activeStops.length-1]?.name}.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="card-premium p-6 md:p-8">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-4">Click to fly to location</p>
                <div className="flex gap-4 overflow-x-auto pb-2 scroll-x-clean">
                    {filteredPubs.map(pub => {
                        const { score, hasScore } = pubScoreMap[pub.id] || { score:0, hasScore:false };
                        const hasCoords = pub.lat && pub.lng;
                        const isSelected = selectedPub?.id === pub.id;
                        return (
                            <div
                                key={pub.id}
                                onClick={() => hasCoords && flyToPub(pub)}
                                className={`shrink-0 w-32 rounded-xl border ${isSelected ? 'border-brand bg-surface-offset shadow-sm' : 'border-border bg-surface'} ${hasCoords ? 'cursor-pointer hover:border-brand/50' : 'cursor-default opacity-50'} overflow-hidden transition-colors flex flex-col`}
                            >
                                <img src={pub.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo'} alt={pub.name} loading="lazy" className="w-full h-20 object-cover block" />
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div>
                                        <p className="font-bold text-xs line-clamp-1 mb-0.5 text-text">{pub.name}</p>
                                        <p className="text-muted text-[10px] line-clamp-1 mb-2">{pub.location}</p>
                                    </div>
                                    {hasScore
                                        ? <span className="inline-block text-brand bg-brand-subtle rounded-sm px-1.5 py-0.5 text-[10px] font-black w-fit">{score.toFixed(1)}</span>
                                        : <span className="text-[9px] font-bold text-text-faint uppercase">Unrated</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {crawls.length > 0 && (
                <div className="card-premium p-6 md:p-8">
                    <h3 className="text-card-title mb-6">Saved Crawls</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {crawls.map(crawl => {
                            const isActive = activeCrawl?.id === crawl.id;
                            const stopPubs = (crawl.pubIds || []).map(id => localPubs.find(p => p.id === id)).filter(Boolean);
                            return (
                                <div key={crawl.id} className={`bg-surface-offset border ${isActive ? 'border-brand' : 'border-divider'} rounded-xl p-4 flex flex-col gap-4 transition-colors`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-sm text-text mb-1">{crawl.name}</p>
                                            <p className="text-muted text-[10px] font-bold uppercase tracking-wider">
                                                {crawl.date ? new Date(crawl.date).toLocaleDateString() : 'No date'} · {stopPubs.length} stops
                                            </p>
                                        </div>
                                        <button onClick={() => deleteCrawl(crawl.id)} className="bg-transparent border-none cursor-pointer text-text-muted hover:text-error transition-colors">🗑️</button>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {stopPubs.slice(0,4).map((p,idx) => (
                                            <div key={p.id} className="flex items-center gap-2">
                                                <span className="w-4 h-4 bg-surface text-muted border border-divider rounded-full flex items-center justify-center text-[9px] font-black shrink-0">{idx+1}</span>
                                                <p className="text-xs font-bold text-text truncate">{p.name}</p>
                                            </div>
                                        ))}
                                        {stopPubs.length > 4 && <p className="text-muted text-[10px] font-bold pl-6">+{stopPubs.length-4} more</p>}
                                    </div>
                                    <button
                                        onClick={() => { setActiveCrawl(isActive ? null : crawl); if (!isActive) setCrawlPubIds([]); }}
                                        className={`mt-auto px-4 py-2 rounded-lg font-bold text-xs border cursor-pointer transition-colors w-full ${isActive ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-text hover:bg-surface-offset'}`}
                                    >
                                        {isActive ? 'Hide Route' : 'View on Map'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {drawerOpen && (
                <div className="fixed inset-0 z-[9000] flex justify-end animate-fadeIn">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    <div className="relative z-10 w-full max-w-[420px] h-full overflow-y-auto bg-surface shadow-2xl flex flex-col border-l border-border">
                        <div className="px-6 py-5 border-b border-divider flex justify-between items-center sticky top-0 bg-surface/90 backdrop-blur-md z-10">
                            <h3 className="text-lg font-black text-text">Create Crawl</h3>
                            <button onClick={() => setDrawerOpen(false)} className="bg-transparent border-none cursor-pointer text-muted text-2xl leading-none hover:text-text">×</button>
                        </div>
                        <div className="px-6 py-6 flex flex-col gap-6 flex-1">
                            <div>
                                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Crawl Name</label>
                                <input type="text" value={crawlName} onChange={e => setCrawlName(e.target.value)}
                                    placeholder="e.g. Birthday Pub Crawl"
                                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface-offset text-text text-sm outline-none focus:border-brand transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Date (optional)</label>
                                <input type="date" value={crawlDate} onChange={e => setCrawlDate(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface-offset text-text text-sm outline-none focus:border-brand transition-colors"
                                />
                            </div>
                            
                            {crawlPubIds.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Route Order ({crawlPubIds.length} stops)</label>
                                    <div className="flex flex-col gap-2">
                                        {crawlPubIds.map((id, idx) => {
                                            const pub = localPubs.find(p => p.id === id);
                                            if (!pub) return null;
                                            return (
                                                <div key={id} className="flex items-center gap-3 bg-surface-offset px-3 py-2 rounded-lg border border-divider">
                                                    <span className="w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">{idx+1}</span>
                                                    <p className="flex-1 text-sm font-bold text-text truncate">{pub.name}</p>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button onClick={() => movePubUp(idx)} className="bg-surface border border-divider rounded p-1 cursor-pointer text-muted hover:text-text">↑</button>
                                                        <button onClick={() => movePubDown(idx)} className="bg-surface border border-divider rounded p-1 cursor-pointer text-muted hover:text-text">↓</button>
                                                        <button onClick={() => toggleCrawlPub(id)} className="bg-surface border border-divider rounded p-1 cursor-pointer text-error hover:bg-error/10">✕</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Add Pubs to Route</label>
                                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-2 scroll-y-clean">
                                    {visitedPubsSorted.map(pub => {
                                        const included = crawlPubIds.includes(pub.id);
                                        return (
                                            <div key={pub.id} onClick={() => toggleCrawlPub(pub.id)}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${included ? 'border-brand bg-brand-subtle' : 'border-divider bg-surface hover:bg-surface-offset'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 border ${included ? 'border-brand bg-brand' : 'border-muted bg-transparent'}`}>
                                                    {included && <span className="text-white text-[9px] font-black">✓</span>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-text truncate">{pub.name}</p>
                                                    <p className="text-muted text-[10px] truncate">{pub.location}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t border-divider sticky bottom-0 bg-surface/90 backdrop-blur-md flex gap-3">
                            <button onClick={() => setDrawerOpen(false)} className="flex-1 py-2.5 border border-border rounded-lg bg-transparent text-muted font-bold text-sm cursor-pointer hover:bg-surface-offset">Cancel</button>
                            <button onClick={saveCrawl} disabled={!crawlName.trim() || crawlPubIds.length < 2}
                                className={`flex-[2] btn-premium text-sm ${(!crawlName.trim()||crawlPubIds.length<2) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Save Crawl
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
