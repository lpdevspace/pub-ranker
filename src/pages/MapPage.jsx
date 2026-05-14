import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeMissingPubs } from '../utils/geocode';

/* ─── tier helpers ──────────────────────────────────────────────────────── */

const tierColor = (score, hasScore) => {
    if (!hasScore) return '#9ca3af';
    if (score >= 8.5) return '#b46414';
    if (score >= 7)   return '#d4a017';
    if (score >= 5)   return '#ca8a04';
    return '#dc2626';
};

const tierLabel = (score, hasScore) => {
    if (!hasScore) return 'Unrated';
    if (score >= 8.5) return 'Legendary';
    if (score >= 7)   return 'Great';
    if (score >= 5)   return 'Decent';
    return 'Avoid';
};

const makeIcon = (color, label = '') =>
    L.divIcon({
        className: '',
        html: `
          <div style="
            width:2.2rem;height:2.2rem;
            background:${color};
            border:3px solid #fff;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
            transition:transform 0.15s ease,box-shadow 0.15s ease;
          ">
            <span style="transform:rotate(45deg);font-size:0.6rem;font-weight:900;color:#fff;line-height:1;">
              ${label}
            </span>
          </div>`,
        iconSize: [35, 35],
        iconAnchor: [17, 35],
        popupAnchor: [0, -38],
    });

const makeNumberIcon = (n, color) =>
    L.divIcon({
        className: '',
        html: `
          <div style="
            width:2rem;height:2rem;
            background:${color};
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="font-size:0.75rem;font-weight:900;color:#fff;">${n}</span>
          </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
    });

/* ─── OSRM routing ───────────────────────────────────────────────────────
   Free, no API key. Uses the public OSRM demo server.
   profile: 'foot' (walking) | 'driving' (driving)
   Returns { coords: [[lat,lng],...], steps: [{instruction,distance,duration},...],
             totalDistance, totalDuration } or null on failure.
────────────────────────────────────────────────────────────────────────── */
async function fetchRoute(waypoints, profile = 'foot') {
    if (waypoints.length < 2) return null;
    // OSRM expects lng,lat order in the URL
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&annotations=false`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return null;
        const route = data.routes[0];
        // geometry is GeoJSON [lng, lat] — flip to Leaflet [lat, lng]
        const routeCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        // flatten step instructions from all legs
        const steps = route.legs.flatMap(leg =>
            (leg.steps || []).map(step => ({
                instruction: step.maneuver?.type
                    ? formatInstruction(step.maneuver, step.name)
                    : (step.name || 'Continue'),
                distance: step.distance,   // metres
                duration: step.duration,   // seconds
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
    const photoBlock = pub.photoURL
        ? `<img src="${pub.photoURL}" alt="${pub.name}"
             style="width:100%;height:9rem;object-fit:cover;display:block;border-radius:0.6rem 0.6rem 0 0;" />`
        : `<div style="width:100%;height:5rem;background:${color};opacity:0.35;border-radius:0.6rem 0.6rem 0 0;"></div>`;
    const scoreBadge = hasScore
        ? `<span style="background:${color};color:#fff;padding:2px 9px;border-radius:9999px;font-size:0.78rem;font-weight:800;">${score.toFixed(1)}/10</span>
           <span style="color:#555;font-size:0.72rem;font-weight:700;">${tierLabel(score, hasScore)}</span>`
        : `<span style="color:#999;font-size:0.78rem;font-style:italic;">Not yet rated</span>`;
    const listType = pub._listType === 'visited'
        ? `<span style="background:#dcfce7;color:#166534;border-radius:9999px;padding:1px 7px;font-size:0.65rem;font-weight:700;">&#10003; Visited</span>`
        : `<span style="background:#fef9c3;color:#854d0e;border-radius:9999px;padding:1px 7px;font-size:0.65rem;font-weight:700;">&#128203; To Visit</span>`;
    const tagsBlock = (pub.tags || []).length
        ? `<p style="font-size:0.68rem;color:#777;margin-top:5px;line-height:1.5;">${pub.tags.slice(0, 4).join(' · ')}</p>`
        : '';
    return `
      <div style="width:220px;font-family:Satoshi,Inter,system-ui,sans-serif;pointer-events:none;background:#fff;border-radius:0.6rem;overflow:hidden;">
        ${photoBlock}
        <div style="padding:10px 12px 12px;background:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">
            <p style="font-weight:800;font-size:0.95rem;color:#1a1a1a;line-height:1.2;flex:1;">${pub.name}</p>
            ${listType}
          </div>
          <p style="font-size:0.72rem;color:#777;margin-bottom:7px;">&#128205; ${pub.location || ''}</p>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${scoreBadge}</div>
          ${tagsBlock}
        </div>
      </div>`;
};

const buildPopupHTML = (pub, score, hasScore, color) => {
    const photoBlock = pub.photoURL
        ? `<img src="${pub.photoURL}" alt="${pub.name}"
             style="width:100%;height:10rem;object-fit:cover;display:block;border-radius:0.6rem 0.6rem 0 0;" />`
        : `<div style="width:100%;height:5rem;background:${color};opacity:0.35;border-radius:0.6rem 0.6rem 0 0;"></div>`;
    const scoreHTML = hasScore
        ? `<span style="background:${color};color:#fff;padding:2px 9px;border-radius:9999px;font-weight:800;font-size:0.8rem;">${score.toFixed(1)}/10</span>
           <span style="color:#888;font-size:0.75rem;font-weight:600;">${tierLabel(score, hasScore)}</span>`
        : `<span style="color:#aaa;font-size:0.8rem;">Not yet rated</span>`;
    const tagsHTML = (pub.tags || []).length
        ? `<p style="font-size:0.7rem;color:#888;margin-top:5px;">${pub.tags.slice(0, 4).join(' · ')}</p>`
        : '';
    const googleHTML = pub.googleLink
        ? `<a href="${pub.googleLink}" target="_blank" rel="noopener noreferrer"
             style="display:block;text-align:center;margin-top:9px;background:#f3f0ec;border:1px solid #ddd;border-radius:0.5rem;padding:6px;font-size:0.75rem;font-weight:700;color:#555;text-decoration:none;">
             &#128205; Open in Google Maps
           </a>`
        : '';
    return `
      <div style="width:230px;font-family:Satoshi,Inter,system-ui,sans-serif;">
        ${photoBlock}
        <div style="padding:11px 12px 8px;">
          <p style="font-weight:800;font-size:1rem;margin-bottom:3px;color:#1a1a1a;">${pub.name}</p>
          <p style="font-size:0.75rem;color:#666;margin-bottom:7px;">&#128205; ${pub.location || ''}</p>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${scoreHTML}</div>
          ${tagsHTML}
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

    // The correct Firestore ref for this group's pubs subcollection
    const pubsRef = useMemo(
        () => db && groupId ? db.collection('groups').doc(groupId).collection('pubs') : null,
        [db, groupId]
    );

    const mapRef       = useRef(null);
    const leafletRef   = useRef(null);
    const markersRef   = useRef({});
    const crawlLineRef = useRef([]);   // array — may be multiple polylines + markers

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
    // routing state
    const [travelMode,       setTravelMode]        = useState('foot');  // 'foot' | 'driving'
    const [routeData,        setRouteData]         = useState(null);    // { coords, steps, totalDistance, totalDuration }
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

    /* ── geocode missing coords on mount ── */
    useEffect(() => {
        const missing = allPubs.filter(p => !p.lat || !p.lng);
        if (!missing.length || !pubsRef) return;
        setGeocoding(true);
        geocodeMissingPubs(allPubs, (done, total) => setGeocodeProgress({ done, total }))
            .then(results => {
                setGeocoding(false);
                if (!results.length) return;
                // Write geocoded lat/lng back to the correct subcollection path:
                // groups/{groupId}/pubs/{pubId}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── load crawls ── */
    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db.collection('crawls')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => setCrawls(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsub;
    }, [db, groupId]);

    /* ── init Leaflet ── */
    useEffect(() => {
        if (!mapRef.current || leafletRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([52.5, -2.1], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);
        leafletRef.current = map;
        return () => { map.remove(); leafletRef.current = null; };
    }, []);

    /* ── filtered pubs ── */
    const filteredPubs = useMemo(() => localPubs.filter(p => {
        if (filter === 'visited'  && p._listType !== 'visited')  return false;
        if (filter === 'toVisit'  && p._listType !== 'toVisit')  return false;
        const { score, hasScore } = pubScoreMap[p.id] || { score: 0, hasScore: false };
        if (tierFilter !== 'all' && tierLabel(score, hasScore) !== tierFilter) return false;
        return true;
    }), [localPubs, filter, tierFilter, pubScoreMap]);

    /* ── sync markers ── */
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
                direction: 'top', offset: [0, -30], opacity: 1, className: 'pub-hover-tooltip',
            });
            marker.bindPopup(buildPopupHTML(pub, score, hasScore, color), { maxWidth: 250 });
            marker.on('click', () => setSelectedPub(pub));
            marker.addTo(leafletRef.current);
            markersRef.current[pub.id] = marker;
        });
    }, [filteredPubs, pubScoreMap]);

    /* ── clear crawl layers helper ── */
    const clearCrawlLayers = useCallback(() => {
        crawlLineRef.current.forEach(l => l.remove());
        crawlLineRef.current = [];
        // remove crawl-numbered markers
        Object.keys(markersRef.current).filter(k => k.startsWith('crawl_')).forEach(k => {
            markersRef.current[k].remove();
            delete markersRef.current[k];
        });
    }, []);

    /* ── fetch route whenever active crawl or travel mode changes ── */
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

        // draw numbered stop markers immediately
        ids.forEach((id, idx) => {
            const pub = localPubs.find(p => p.id === id);
            if (!pub?.lat || !pub?.lng) return;
            const { score, hasScore } = pubScoreMap[id] || { score: 0, hasScore: false };
            const color = tierColor(score, hasScore);
            const m = L.marker([pub.lat, pub.lng], { icon: makeNumberIcon(idx + 1, color) })
                .bindTooltip(pub.name, { permanent: false })
                .addTo(leafletRef.current);
            markersRef.current[`crawl_${id}_${idx}`] = m;
        });

        // fetch real route
        setRouteLoading(true);
        fetchRoute(waypoints, travelMode).then(result => {
            setRouteLoading(false);
            if (!result || !leafletRef.current) {
                // fallback: straight dashed line
                const fallback = L.polyline(waypoints, { color: '#b46414', weight: 4, dashArray: '10 6', opacity: 0.85 })
                    .addTo(leafletRef.current);
                crawlLineRef.current.push(fallback);
                leafletRef.current.fitBounds(fallback.getBounds(), { padding: [40, 40] });
                return;
            }
            setRouteData(result);
            // outer glow
            const glow = L.polyline(result.coords, { color: '#ffffff', weight: 8, opacity: 0.5 })
                .addTo(leafletRef.current);
            // main route line
            const line = L.polyline(result.coords, { color: travelMode === 'foot' ? '#b46414' : '#1d6db5', weight: 5, opacity: 0.9 })
                .addTo(leafletRef.current);
            crawlLineRef.current.push(glow, line);
            leafletRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCrawl, crawlPubIds, travelMode, localPubs]);

    /* ── fly to pub ── */
    const flyToPub = useCallback((pub) => {
        if (!pub.lat || !pub.lng || !leafletRef.current) return;
        leafletRef.current.flyTo([pub.lat, pub.lng], 16, { duration: 0.8 });
        const marker = markersRef.current[pub.id];
        if (marker) setTimeout(() => marker.openPopup(), 850);
        setSelectedPub(pub);
    }, []);

    /* ── save / delete crawl ── */
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

    const pubsWithCoords    = localPubs.filter(p => p.lat && p.lng).length;
    const totalPubs         = localPubs.length;
    const visitedPubsSorted = localPubs.filter(p => p._listType === 'visited')
        .sort((a,b) => (pubScoreMap[b.id]?.score||0) - (pubScoreMap[a.id]?.score||0));

    const card = { background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-sm)' };

    // the crawl whose ids to show in directions
    const activeIds = activeCrawl ? activeCrawl.pubIds : crawlPubIds;
    const activeStops = activeIds.map(id => localPubs.find(p => p.id === id)).filter(Boolean);

    return (
        <div className="animate-fadeIn pb-20" style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>

            {/* ── tooltip styles ── */}
            <style>{`
                .pub-hover-tooltip {
                    padding: 0 !important;
                    border: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }
                .pub-hover-tooltip .leaflet-tooltip-content {
                    padding: 0 !important;
                    background: transparent !important;
                }
                .pub-hover-tooltip::before {
                    display: none !important;
                }
                /* The actual visible card sits inside the HTML content */
                .pub-hover-tooltip > div,
                .pub-hover-tooltip .leaflet-tooltip-content > div {
                    background: #fff !important;
                    border-radius: 0.6rem !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
                    border: 1px solid rgba(0,0,0,0.08) !important;
                    overflow: hidden !important;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes routePulse { 0%,100%{opacity:0.9} 50%{opacity:0.55} }
            `}</style>

            {/* ── page header ── */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'var(--space-2)' }}>
                <div>
                    <h2 className="text-page-title">Pub Map</h2>
                    <p className="text-muted" style={{ marginTop:'var(--space-1)' }}>
                        {pubsWithCoords} of {totalPubs} pubs on the map
                        {geocoding && (
                            <span style={{ color:'var(--color-brand)', fontWeight:700, marginLeft:'var(--space-2)' }}>
                                · Geocoding {geocodeProgress.done}/{geocodeProgress.total}…
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => { setDrawerOpen(true); setActiveCrawl(null); }}
                    style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', padding:'var(--space-2) var(--space-5)', background:'var(--color-brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', cursor:'pointer', boxShadow:'var(--shadow-md)', transition:'all var(--transition-interactive)' }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--color-brand-dark)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--color-brand)'; e.currentTarget.style.transform='none'; }}
                >
                    🗺️ + Create Crawl
                </button>
            </div>

            {/* ── filter bar ── */}
            <div style={{ display:'flex', gap:'var(--space-2)', flexWrap:'wrap' }}>
                {['all','visited','toVisit'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{ padding:'var(--space-2) var(--space-4)', borderRadius:'var(--radius-full)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', border:`1px solid ${filter===f ? 'var(--color-brand)' : 'var(--color-border)'}`, background:filter===f ? 'var(--color-brand)' : 'var(--color-surface)', color:filter===f ? '#fff' : 'var(--color-text-muted)', cursor:'pointer', transition:'all var(--transition-interactive)' }}
                    >
                        { f==='all' ? '🍺 All Pubs' : f==='visited' ? '✅ Visited' : '📋 To Visit' }
                    </button>
                ))}
                <div style={{ width:'1px', background:'var(--color-divider)', margin:'0 var(--space-1)' }} />
                {['all','Legendary','Great','Decent','Avoid','Unrated'].map(t => (
                    <button key={t} onClick={() => setTierFilter(t)}
                        style={{ padding:'var(--space-2) var(--space-4)', borderRadius:'var(--radius-full)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', border:`1px solid ${tierFilter===t ? 'var(--color-brand)' : 'var(--color-border)'}`, background:tierFilter===t ? 'var(--color-brand)' : 'var(--color-surface)', color:tierFilter===t ? '#fff' : 'var(--color-text-muted)', cursor:'pointer', transition:'all var(--transition-interactive)' }}
                    >
                        {t==='all' ? '⭐ All Tiers' : t}
                    </button>
                ))}
            </div>

            {/* ── tier legend ── */}
            <div style={{ display:'flex', gap:'var(--space-3)', flexWrap:'wrap', alignItems:'center' }}>
                <p className="text-label" style={{ marginRight:'var(--space-1)' }}>Tier key:</p>
                {[['Legendary','#b46414'],['Great','#d4a017'],['Decent','#ca8a04'],['Avoid','#dc2626'],['Unrated','#9ca3af']].map(([lbl,clr]) => (
                    <span key={lbl} style={{ display:'flex', alignItems:'center', gap:'var(--space-1)', fontSize:'var(--text-xs)', fontWeight:700, fontFamily:'var(--font-body)', color:'var(--color-text-muted)' }}>
                        <span style={{ width:'0.75rem', height:'0.75rem', borderRadius:'50%', background:clr, display:'inline-block', flexShrink:0 }} />
                        {lbl}
                    </span>
                ))}
            </div>

            {/* ══ MAP ══ */}
            <div style={{ ...card, overflow:'hidden', height:'32rem', position:'relative' }}>
                <div ref={mapRef} style={{ width:'100%', height:'100%' }} />
                {geocoding && (
                    <div style={{ position:'absolute', bottom:'1rem', left:'50%', transform:'translateX(-50%)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'var(--space-2) var(--space-5)', boxShadow:'var(--shadow-md)', zIndex:1000, fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)', color:'var(--color-brand)', display:'flex', alignItems:'center', gap:'var(--space-2)', whiteSpace:'nowrap' }}>
                        <span style={{ display:'inline-block', animation:'spin 1.2s linear infinite' }}>⚙️</span>
                        Auto-locating pubs… {geocodeProgress.done}/{geocodeProgress.total}
                    </div>
                )}
                {routeLoading && (
                    <div style={{ position:'absolute', bottom:'1rem', left:'50%', transform:'translateX(-50%)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'var(--space-2) var(--space-5)', boxShadow:'var(--shadow-md)', zIndex:1001, fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)', color:'var(--color-brand)', display:'flex', alignItems:'center', gap:'var(--space-2)', whiteSpace:'nowrap' }}>
                        <span style={{ display:'inline-block', animation:'spin 1.2s linear infinite' }}>🗺️</span>
                        Calculating route…
                    </div>
                )}
                {/* hover hint */}
                <div style={{ position:'absolute', top:'var(--space-3)', right:'var(--space-3)', background:'rgba(255,255,255,0.92)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:'var(--radius-lg)', padding:'var(--space-2) var(--space-3)', zIndex:500, fontSize:'0.7rem', fontFamily:'var(--font-body)', fontWeight:600, color:'#555', backdropFilter:'blur(4px)', pointerEvents:'none' }}>
                    Hover a pin · Click for details
                </div>
            </div>

            {/* ══ ROUTE INFO BAR — shown when a crawl route is active ══ */}
            {routeData && activeStops.length >= 2 && (
                <div style={{ ...card, padding:'var(--space-4) var(--space-5)', display:'flex', flexWrap:'wrap', alignItems:'center', gap:'var(--space-4)' }}>
                    {/* travel mode toggle */}
                    <div style={{ display:'flex', gap:'var(--space-2)', background:'var(--color-surface-offset)', borderRadius:'var(--radius-lg)', padding:'var(--space-1)' }}>
                        {[['foot','🚶 Walking'],['driving','🚗 Driving']].map(([mode, label]) => (
                            <button key={mode} onClick={() => setTravelMode(mode)}
                                style={{ padding:'var(--space-2) var(--space-4)', borderRadius:'var(--radius-md)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', border:'none', background:travelMode===mode ? 'var(--color-brand)' : 'transparent', color:travelMode===mode ? '#fff' : 'var(--color-text-muted)', cursor:'pointer', transition:'all var(--transition-interactive)' }}
                            >{label}</button>
                        ))}
                    </div>
                    {/* summary */}
                    <div style={{ display:'flex', gap:'var(--space-5)', flex:1, flexWrap:'wrap' }}>
                        <div style={{ textAlign:'center' }}>
                            <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', fontFamily:'var(--font-body)', fontWeight:600 }}>TOTAL DISTANCE</p>
                            <p style={{ fontSize:'var(--text-lg)', fontWeight:800, fontFamily:'var(--font-display)', color:'var(--color-text)' }}>{fmtDist(routeData.totalDistance)}</p>
                        </div>
                        <div style={{ textAlign:'center' }}>
                            <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', fontFamily:'var(--font-body)', fontWeight:600 }}>{travelMode === 'foot' ? 'WALK TIME' : 'DRIVE TIME'}</p>
                            <p style={{ fontSize:'var(--text-lg)', fontWeight:800, fontFamily:'var(--font-display)', color:'var(--color-text)' }}>{fmtDuration(routeData.totalDuration)}</p>
                        </div>
                        <div style={{ textAlign:'center' }}>
                            <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', fontFamily:'var(--font-body)', fontWeight:600 }}>STOPS</p>
                            <p style={{ fontSize:'var(--text-lg)', fontWeight:800, fontFamily:'var(--font-display)', color:'var(--color-text)' }}>{activeStops.length}</p>
                        </div>
                    </div>
                    {/* directions toggle */}
                    <button
                        onClick={() => setDirectionsOpen(o => !o)}
                        style={{ padding:'var(--space-2) var(--space-4)', borderRadius:'var(--radius-lg)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', border:`1px solid var(--color-border)`, background:'var(--color-surface-2)', color:'var(--color-text)', cursor:'pointer', display:'flex', alignItems:'center', gap:'var(--space-2)', transition:'all var(--transition-interactive)' }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='var(--color-brand)'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='var(--color-border)'}
                    >
                        📋 {directionsOpen ? 'Hide' : 'Show'} Directions
                        <span style={{ transition:'transform 0.2s', transform:directionsOpen?'rotate(180deg)':'none', display:'inline-block' }}>▾</span>
                    </button>
                </div>
            )}

            {/* ══ STEP-BY-STEP DIRECTIONS PANEL ══ */}
            {routeData && directionsOpen && (
                <div style={{ ...card, padding:'var(--space-5) var(--space-6)' }}>
                    <h3 className="text-section-heading" style={{ marginBottom:'var(--space-4)' }}>
                        {travelMode === 'foot' ? '🚶' : '🚗'} Turn-by-Turn Directions
                    </h3>

                    {/* stop sequence */}
                    <div style={{ display:'flex', gap:'var(--space-2)', overflowX:'auto', paddingBottom:'var(--space-3)', marginBottom:'var(--space-4)', borderBottom:'1px solid var(--color-divider)', scrollbarWidth:'thin' }}>
                        {activeStops.map((pub, idx) => (
                            <React.Fragment key={pub.id}>
                                <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-2)', minWidth:'5rem', maxWidth:'7rem' }}>
                                    {pub.photoURL
                                        ? <img src={pub.photoURL} alt={pub.name} loading="lazy" width="56" height="56"
                                               style={{ width:'3.5rem', height:'3.5rem', borderRadius:'50%', objectFit:'cover', border:'3px solid var(--color-brand)' }} />
                                        : <div style={{ width:'3.5rem', height:'3.5rem', borderRadius:'50%', background:tierColor(pubScoreMap[pub.id]?.score||0, pubScoreMap[pub.id]?.hasScore||false), display:'flex', alignItems:'center', justifyContent:'center', border:'3px solid var(--color-brand)', color:'#fff', fontWeight:900, fontSize:'0.9rem' }}>{idx+1}</div>
                                    }
                                    <p style={{ fontSize:'0.65rem', fontWeight:700, fontFamily:'var(--font-body)', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{pub.name}</p>
                                    <span style={{ background:'var(--color-brand)', color:'#fff', borderRadius:'var(--radius-full)', padding:'1px 7px', fontSize:'0.6rem', fontWeight:900 }}>Stop {idx+1}</span>
                                </div>
                                {idx < activeStops.length - 1 && (
                                    <div style={{ flexShrink:0, display:'flex', alignItems:'center', color:'var(--color-text-faint)', fontSize:'1.2rem', paddingTop:'1rem' }}>→</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* step list */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                        {routeData.steps.map((step, idx) => (
                            <div key={idx} style={{ display:'flex', alignItems:'flex-start', gap:'var(--space-3)', padding:'var(--space-3) var(--space-4)', borderRadius:'var(--radius-lg)', background: idx % 2 === 0 ? 'var(--color-surface-offset)' : 'transparent' }}>
                                <span style={{ width:'1.75rem', height:'1.75rem', borderRadius:'50%', background:'var(--color-surface-dynamic)', color:'var(--color-text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:900, flexShrink:0 }}>{idx+1}</span>
                                <div style={{ flex:1 }}>
                                    <p style={{ fontSize:'var(--text-sm)', fontWeight:600, fontFamily:'var(--font-body)', color:'var(--color-text)', lineHeight:1.4 }}>{step.instruction}</p>
                                    <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginTop:'var(--space-1)' }}>{fmtDist(step.distance)} · {fmtDuration(step.duration)}</p>
                                </div>
                            </div>
                        ))}
                        {/* arrival */}
                        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-3) var(--space-4)', borderRadius:'var(--radius-lg)', background:'var(--color-primary-highlight)', border:'1px solid var(--color-primary)' }}>
                            <span style={{ fontSize:'1.2rem' }}>🍺</span>
                            <p style={{ fontSize:'var(--text-sm)', fontWeight:700, fontFamily:'var(--font-body)', color:'var(--color-primary)' }}>You've arrived at {activeStops[activeStops.length-1]?.name}. Enjoy!</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ PUB LIST ══ */}
            <div style={{ ...card, padding:'var(--space-4)' }}>
                <p className="text-label" style={{ marginBottom:'var(--space-3)' }}>
                    {filteredPubs.filter(p=>p.lat&&p.lng).length} pubs shown — click to fly to location
                </p>
                {filteredPubs.length === 0 && (
                    <p className="text-muted" style={{ fontStyle:'italic', textAlign:'center', padding:'var(--space-6) 0' }}>No pubs match these filters.</p>
                )}
                <div style={{ display:'flex', gap:'var(--space-3)', overflowX:'auto', paddingBottom:'var(--space-2)', scrollbarWidth:'thin' }}>
                    {filteredPubs.map(pub => {
                        const { score, hasScore } = pubScoreMap[pub.id] || { score:0, hasScore:false };
                        const color = tierColor(score, hasScore);
                        const hasCoords = pub.lat && pub.lng;
                        const isSelected = selectedPub?.id === pub.id;
                        return (
                            <div
                                key={pub.id}
                                onClick={() => hasCoords && flyToPub(pub)}
                                style={{ flexShrink:0, width:'9rem', borderRadius:'var(--radius-lg)', border:`2px solid ${isSelected ? 'var(--color-brand)' : 'var(--color-border)'}`, background:isSelected ? 'var(--color-surface-offset)' : 'var(--color-surface-2)', cursor:hasCoords ? 'pointer' : 'default', opacity:hasCoords ? 1 : 0.45, overflow:'hidden', transition:'all var(--transition-interactive)', boxShadow:isSelected ? 'var(--shadow-md)' : 'none' }}
                                onMouseEnter={e => { if (hasCoords && !isSelected) e.currentTarget.style.borderColor='var(--color-brand)'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor='var(--color-border)'; }}
                            >
                                {pub.photoURL
                                    ? <img src={pub.photoURL} alt={pub.name} loading="lazy" width="144" height="72"
                                           style={{ width:'100%', height:'4.5rem', objectFit:'cover', display:'block' }} />
                                    : <div style={{ width:'100%', height:'4.5rem', background:color, opacity:0.25 }} />}
                                <div style={{ padding:'var(--space-2) var(--space-2) var(--space-3)' }}>
                                    <p style={{ fontWeight:700, fontSize:'var(--text-xs)', fontFamily:'var(--font-body)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'var(--space-1)' }}>{pub.name}</p>
                                    <p className="text-muted" style={{ fontSize:'0.65rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'var(--space-2)' }}>{pub.location}</p>
                                    {hasScore
                                        ? <span style={{ background:color, color:'#fff', borderRadius:'var(--radius-full)', padding:'1px 7px', fontSize:'0.65rem', fontWeight:800 }}>{score.toFixed(1)}</span>
                                        : !hasCoords
                                            ? <span style={{ fontSize:'0.6rem', color:'var(--color-text-faint)' }}>📍 no coords</span>
                                            : <span style={{ fontSize:'0.6rem', color:'var(--color-text-faint)' }}>Unrated</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══ SAVED CRAWLS ══ */}
            {crawls.length > 0 && (
                <div style={{ ...card, padding:'var(--space-6)' }}>
                    <h3 className="text-section-heading" style={{ marginBottom:'var(--space-4)' }}>🗺️ Saved Crawls</h3>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(280px,100%),1fr))', gap:'var(--space-4)' }}>
                        {crawls.map(crawl => {
                            const isActive = activeCrawl?.id === crawl.id;
                            const stopPubs = (crawl.pubIds || []).map(id => localPubs.find(p => p.id === id)).filter(Boolean);
                            return (
                                <div key={crawl.id}
                                    style={{ background:'var(--color-surface-offset)', border:`1px solid ${isActive ? 'var(--color-brand)' : 'var(--color-border)'}`, borderRadius:'var(--radius-lg)', padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:'var(--space-3)', transition:'border-color var(--transition-interactive)' }}
                                >
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                        <div>
                                            <p style={{ fontWeight:800, fontSize:'var(--text-base)', fontFamily:'var(--font-display)', marginBottom:'var(--space-1)' }}>{crawl.name}</p>
                                            <p className="text-muted" style={{ fontSize:'var(--text-xs)' }}>
                                                {crawl.date ? `📅 ${new Date(crawl.date).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}` : 'No date set'}
                                                {' · '}{stopPubs.length} stops
                                            </p>
                                        </div>
                                        <button onClick={() => deleteCrawl(crawl.id)}
                                            style={{ color:'var(--color-error)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', opacity:0.6 }}
                                            onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                                            onMouseLeave={e=>e.currentTarget.style.opacity='0.6'}
                                        >🗑️</button>
                                    </div>
                                    <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                                        {stopPubs.slice(0,4).map((p,idx) => (
                                            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                                                <span style={{ width:'1.25rem', height:'1.25rem', background:'var(--color-brand)', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:900, flexShrink:0 }}>{idx+1}</span>
                                                <p style={{ fontSize:'var(--text-xs)', fontWeight:600, fontFamily:'var(--font-body)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                                            </div>
                                        ))}
                                        {stopPubs.length > 4 && <p className="text-muted" style={{ fontSize:'var(--text-xs)', paddingLeft:'calc(1.25rem + var(--space-2))' }}>+{stopPubs.length-4} more</p>}
                                    </div>
                                    {/* travel mode toggle per saved crawl */}
                                    {isActive && (
                                        <div style={{ display:'flex', gap:'var(--space-2)', background:'var(--color-surface)', borderRadius:'var(--radius-lg)', padding:'var(--space-1)' }}>
                                            {[['foot','🚶'],['driving','🚗']].map(([mode, icon]) => (
                                                <button key={mode} onClick={() => setTravelMode(mode)}
                                                    style={{ flex:1, padding:'var(--space-2)', borderRadius:'var(--radius-md)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', border:'none', background:travelMode===mode ? 'var(--color-brand)' : 'transparent', color:travelMode===mode ? '#fff' : 'var(--color-text-muted)', cursor:'pointer', transition:'all var(--transition-interactive)' }}
                                                >{icon} {mode === 'foot' ? 'Walk' : 'Drive'}</button>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => { setActiveCrawl(isActive ? null : crawl); if (!isActive) setCrawlPubIds([]); }}
                                        style={{ padding:'var(--space-2) var(--space-4)', borderRadius:'var(--radius-lg)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', border:`1px solid ${isActive ? 'var(--color-brand)' : 'var(--color-border)'}`, background:isActive ? 'var(--color-brand)' : 'transparent', color:isActive ? '#fff' : 'var(--color-text)', cursor:'pointer', transition:'all var(--transition-interactive)' }}
                                    >
                                        {isActive ? '✕ Hide Route' : '👁 View Route on Map'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══ CRAWL BUILDER DRAWER ══ */}
            {drawerOpen && (
                <div style={{ position:'fixed', inset:0, zIndex:9000, display:'flex', justifyContent:'flex-end' }}>
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)' }} onClick={() => setDrawerOpen(false)} />
                    <div style={{ position:'relative', zIndex:1, width:'min(420px,100vw)', height:'100%', overflowY:'auto', background:'var(--color-surface)', boxShadow:'-4px 0 32px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column' }}>
                        <div style={{ padding:'var(--space-5) var(--space-6)', borderBottom:'1px solid var(--color-divider)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--color-surface)', zIndex:1 }}>
                            <h3 className="text-section-heading">🗺️ Create a Pub Crawl</h3>
                            <button onClick={() => setDrawerOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-muted)', fontSize:'1.5rem', lineHeight:1 }}>×</button>
                        </div>
                        <div style={{ padding:'var(--space-5) var(--space-6)', display:'flex', flexDirection:'column', gap:'var(--space-5)', flex:1 }}>
                            <div>
                                <label className="text-label" style={{ display:'block', marginBottom:'var(--space-2)' }}>Crawl Name</label>
                                <input type="text" value={crawlName} onChange={e => setCrawlName(e.target.value)}
                                    placeholder="e.g. Wolverhampton Classic"
                                    style={{ width:'100%', padding:'var(--space-3) var(--space-4)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'var(--color-surface-2)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', outline:'none' }}
                                    onFocus={e=>e.target.style.borderColor='var(--color-brand)'}
                                    onBlur={e=>e.target.style.borderColor='var(--color-border)'}
                                />
                            </div>
                            <div>
                                <label className="text-label" style={{ display:'block', marginBottom:'var(--space-2)' }}>Date (optional)</label>
                                <input type="date" value={crawlDate} onChange={e => setCrawlDate(e.target.value)}
                                    style={{ width:'100%', padding:'var(--space-3) var(--space-4)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'var(--color-surface-2)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', outline:'none' }}
                                    onFocus={e=>e.target.style.borderColor='var(--color-brand)'}
                                    onBlur={e=>e.target.style.borderColor='var(--color-border)'}
                                />
                            </div>
                            {crawlPubIds.length > 0 && (
                                <div>
                                    <label className="text-label" style={{ display:'block', marginBottom:'var(--space-2)' }}>Route Order ({crawlPubIds.length} stops)</label>
                                    <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                                        {crawlPubIds.map((id, idx) => {
                                            const pub = localPubs.find(p => p.id === id);
                                            if (!pub) return null;
                                            return (
                                                <div key={id} style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', background:'var(--color-surface-offset)', padding:'var(--space-2) var(--space-3)', borderRadius:'var(--radius-lg)', border:'1px solid var(--color-border)' }}>
                                                    <span style={{ width:'1.5rem', height:'1.5rem', background:'var(--color-brand)', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:900, flexShrink:0 }}>{idx+1}</span>
                                                    <p style={{ flex:1, fontSize:'var(--text-sm)', fontWeight:600, fontFamily:'var(--font-body)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pub.name}</p>
                                                    <div style={{ display:'flex', gap:'var(--space-1)' }}>
                                                        <button onClick={() => movePubUp(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-muted)', fontSize:'0.9rem', padding:'2px' }}>↑</button>
                                                        <button onClick={() => movePubDown(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-muted)', fontSize:'0.9rem', padding:'2px' }}>↓</button>
                                                        <button onClick={() => toggleCrawlPub(id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-error)', fontSize:'0.9rem', padding:'2px' }}>×</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-label" style={{ display:'block', marginBottom:'var(--space-2)' }}>Add Pubs to Route</label>
                                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', maxHeight:'16rem', overflowY:'auto', paddingRight:'var(--space-1)' }}>
                                    {visitedPubsSorted.map(pub => {
                                        const included = crawlPubIds.includes(pub.id);
                                        const { score, hasScore } = pubScoreMap[pub.id] || { score:0, hasScore:false };
                                        const color = tierColor(score, hasScore);
                                        return (
                                            <div key={pub.id} onClick={() => toggleCrawlPub(pub.id)}
                                                style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-3)', borderRadius:'var(--radius-lg)', border:`1px solid ${included ? 'var(--color-brand)' : 'var(--color-border)'}`, background:included ? 'var(--color-surface-offset)' : 'transparent', cursor:'pointer', transition:'all var(--transition-interactive)' }}
                                            >
                                                <div style={{ width:'1.25rem', height:'1.25rem', borderRadius:'var(--radius-sm)', border:`2px solid ${included ? 'var(--color-brand)' : 'var(--color-border)'}`, background:included ? 'var(--color-brand)' : 'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                                    {included && <span style={{ color:'#fff', fontSize:'0.65rem', fontWeight:900 }}>✓</span>}
                                                </div>
                                                {pub.photoURL
                                                    ? <img src={pub.photoURL} alt={pub.name} loading="lazy" width="32" height="32" style={{ width:'2rem', height:'2rem', borderRadius:'var(--radius-sm)', objectFit:'cover', flexShrink:0 }} />
                                                    : <div style={{ width:'2rem', height:'2rem', borderRadius:'var(--radius-sm)', background:color, opacity:0.25, flexShrink:0 }} />}
                                                <div style={{ flex:1, minWidth:0 }}>
                                                    <p style={{ fontSize:'var(--text-sm)', fontWeight:700, fontFamily:'var(--font-body)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pub.name}</p>
                                                    <p className="text-muted" style={{ fontSize:'var(--text-xs)' }}>{pub.location}</p>
                                                </div>
                                                {hasScore && <span style={{ background:color, color:'#fff', borderRadius:'var(--radius-full)', padding:'1px 7px', fontSize:'var(--text-xs)', fontWeight:800, flexShrink:0 }}>{score.toFixed(1)}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div style={{ padding:'var(--space-4) var(--space-6)', borderTop:'1px solid var(--color-divider)', position:'sticky', bottom:0, background:'var(--color-surface)', display:'flex', gap:'var(--space-3)' }}>
                            <button onClick={() => setDrawerOpen(false)} style={{ flex:1, padding:'var(--space-3)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'transparent', color:'var(--color-text-muted)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', cursor:'pointer' }}>Cancel</button>
                            <button onClick={saveCrawl} disabled={!crawlName.trim() || crawlPubIds.length < 2}
                                style={{ flex:2, padding:'var(--space-3)', border:'none', borderRadius:'var(--radius-lg)', background:(!crawlName.trim()||crawlPubIds.length<2) ? 'var(--color-surface-dynamic)' : 'var(--color-brand)', color:(!crawlName.trim()||crawlPubIds.length<2) ? 'var(--color-text-faint)' : '#fff', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', cursor:(!crawlName.trim()||crawlPubIds.length<2) ? 'not-allowed' : 'pointer', transition:'all var(--transition-interactive)' }}
                            >
                                Save Crawl ({crawlPubIds.length} stops)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
