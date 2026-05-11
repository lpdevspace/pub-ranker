import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeMissingPubs } from '../utils/geocode';

/* ─── tier helpers ──────────────────────────────────────────────────────── */

const tierColor = (score, hasScore) => {
    if (!hasScore) return '#9ca3af'; // grey — unrated
    if (score >= 8.5) return '#b46414'; // brown — Legendary
    if (score >= 7)   return '#d4a017'; // gold — Great
    if (score >= 5)   return '#ca8a04'; // yellow — Decent
    return '#dc2626';                   // red — Avoid
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
            width:2rem;height:2rem;
            background:${color};
            border:3px solid #fff;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:0.6rem;font-weight:900;color:#fff;">
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

/* ─── main component ────────────────────────────────────────────────────── */

export default function MapPage({ pubs, newPubs, scores, criteria, db, groupId, setPage, allUsers, user }) {
    const pubsArray     = Array.isArray(pubs)     ? pubs     : Object.values(pubs     || {});
    const newPubsArray  = Array.isArray(newPubs)  ? newPubs  : Object.values(newPubs  || {});
    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const scoresObj     = scores || {};

    const mapRef        = useRef(null);   // DOM node
    const leafletRef    = useRef(null);   // L.Map instance
    const markersRef    = useRef({});     // pubId → L.Marker
    const crawlLineRef  = useRef(null);   // L.Polyline for active crawl preview

    const [filter,       setFilter]       = useState('all');   // 'all' | 'visited' | 'toVisit'
    const [tierFilter,   setTierFilter]   = useState('all');   // 'all' | 'Legendary' | 'Great' | 'Decent' | 'Avoid' | 'Unrated'
    const [selectedPub,  setSelectedPub]  = useState(null);
    const [crawls,       setCrawls]       = useState([]);
    const [activeCrawl,  setActiveCrawl]  = useState(null);    // crawl being previewed on map
    const [drawerOpen,   setDrawerOpen]   = useState(false);
    const [crawlName,    setCrawlName]    = useState('');
    const [crawlDate,    setCrawlDate]    = useState('');
    const [crawlPubIds,  setCrawlPubIds]  = useState([]);      // ordered list of pub ids in builder
    const [geocoding,    setGeocoding]    = useState(false);
    const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });
    const [localPubs,    setLocalPubs]    = useState([]);

    /* ── merge all pubs into one list ── */
    const allPubs = useMemo(() => [
        ...pubsArray.map(p => ({ ...p, _listType: 'visited' })),
        ...newPubsArray.map(p => ({ ...p, _listType: 'toVisit' })),
    ], [pubsArray, newPubsArray]);

    /* ── weighted scores ── */
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

    /* ── keep a local copy of pubs so we can update coords after geocoding ── */
    useEffect(() => { setLocalPubs(allPubs); }, [allPubs]);

    /* ── geocode pubs missing lat/lng on mount ── */
    useEffect(() => {
        const missing = allPubs.filter(p => !p.lat || !p.lng);
        if (!missing.length || !db || !groupId) return;
        setGeocoding(true);
        geocodeMissingPubs(allPubs, (done, total) => {
            setGeocodeProgress({ done, total });
        }).then(results => {
            setGeocoding(false);
            if (!results.length) return;
            // write lat/lng back to Firestore
            const batch = db.batch();
            results.forEach(({ id, lat, lng }) => {
                const ref = db.collection('pubs').doc(id);
                batch.update(ref, { lat, lng });
            });
            batch.commit().catch(console.error);
            // update local state so markers appear immediately
            setLocalPubs(prev => prev.map(p => {
                const found = results.find(r => r.id === p.id);
                return found ? { ...p, lat: found.lat, lng: found.lng } : p;
            }));
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── load crawls from Firestore ── */
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
    const filteredPubs = useMemo(() => {
        return localPubs.filter(p => {
            if (filter === 'visited' && p._listType !== 'visited') return false;
            if (filter === 'toVisit' && p._listType !== 'toVisit') return false;
            const { score, hasScore } = pubScoreMap[p.id] || { score: 0, hasScore: false };
            if (tierFilter !== 'all' && tierLabel(score, hasScore) !== tierFilter) return false;
            return true;
        });
    }, [localPubs, filter, tierFilter, pubScoreMap]);

    /* ── sync markers ── */
    useEffect(() => {
        if (!leafletRef.current) return;
        const map = leafletRef.current;

        // remove old markers
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        filteredPubs.forEach(pub => {
            if (!pub.lat || !pub.lng) return;
            const { score, hasScore } = pubScoreMap[pub.id] || { score: 0, hasScore: false };
            const color  = tierColor(score, hasScore);
            const label  = hasScore ? score.toFixed(1) : '';
            const marker = L.marker([pub.lat, pub.lng], { icon: makeIcon(color, label) });

            const photoHTML = pub.photoURL
                ? `<img src="${pub.photoURL}" alt="${pub.name}" style="width:100%;height:7rem;object-fit:cover;border-radius:0.5rem 0.5rem 0 0;display:block;" loading="lazy" />`
                : `<div style="width:100%;height:4rem;background:${color};border-radius:0.5rem 0.5rem 0 0;opacity:0.4;"></div>`;

            const scoreHTML = hasScore
                ? `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:9999px;font-weight:800;font-size:0.8rem;">${score.toFixed(1)}/10</span>
                   <span style="color:#888;font-size:0.75rem;font-weight:600;">${tierLabel(score, hasScore)}</span>`
                : `<span style="color:#aaa;font-size:0.8rem;">Not yet rated</span>`;

            const tagsHTML = (pub.tags || []).length
                ? `<p style="font-size:0.7rem;color:#888;margin-top:4px;">${pub.tags.slice(0, 3).join(' · ')}</p>`
                : '';

            const googleHTML = pub.googleLink
                ? `<a href="${pub.googleLink}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:8px;background:#f3f0ec;border:1px solid #ddd;border-radius:0.5rem;padding:6px;font-size:0.75rem;font-weight:700;color:#555;text-decoration:none;">📍 Open in Google Maps</a>`
                : '';

            marker.bindPopup(`
              <div style="width:200px;font-family:Satoshi,Inter,sans-serif;">
                ${photoHTML}
                <div style="padding:10px 10px 6px;">
                  <p style="font-weight:800;font-size:0.95rem;margin-bottom:4px;color:#1a1a1a;">${pub.name}</p>
                  <p style="font-size:0.75rem;color:#666;margin-bottom:6px;">📍 ${pub.location || ''}</p>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${scoreHTML}</div>
                  ${tagsHTML}
                  ${googleHTML}
                </div>
              </div>
            `, { maxWidth: 220 });

            marker.on('click', () => setSelectedPub(pub));
            marker.addTo(map);
            markersRef.current[pub.id] = marker;
        });
    }, [filteredPubs, pubScoreMap]);

    /* ── crawl route preview ── */
    useEffect(() => {
        if (!leafletRef.current) return;
        if (crawlLineRef.current) { crawlLineRef.current.remove(); crawlLineRef.current = null; }
        const ids = activeCrawl ? activeCrawl.pubIds : crawlPubIds;
        if (!ids || ids.length < 2) return;
        const coords = ids.map(id => localPubs.find(p => p.id === id)).filter(p => p?.lat && p?.lng).map(p => [p.lat, p.lng]);
        if (coords.length < 2) return;
        crawlLineRef.current = L.polyline(coords, { color: '#b46414', weight: 4, dashArray: '10 6', opacity: 0.85 }).addTo(leafletRef.current);
        leafletRef.current.fitBounds(crawlLineRef.current.getBounds(), { padding: [40, 40] });

        // place numbered markers for crawl stops
        ids.forEach((id, idx) => {
            const pub = localPubs.find(p => p.id === id);
            if (!pub?.lat || !pub?.lng) return;
            const { score, hasScore } = pubScoreMap[id] || { score: 0, hasScore: false };
            const color = tierColor(score, hasScore);
            const m = L.marker([pub.lat, pub.lng], { icon: makeNumberIcon(idx + 1, color) })
                .bindTooltip(pub.name, { permanent: false })
                .addTo(leafletRef.current);
            // store under crawl key so we can clean up
            markersRef.current[`crawl_${id}_${idx}`] = m;
        });
    }, [activeCrawl, crawlPubIds, localPubs, pubScoreMap]);

    /* ── fly to pub when selected from sidebar ── */
    const flyToPub = useCallback((pub) => {
        if (!pub.lat || !pub.lng || !leafletRef.current) return;
        leafletRef.current.flyTo([pub.lat, pub.lng], 16, { duration: 0.8 });
        const marker = markersRef.current[pub.id];
        if (marker) marker.openPopup();
        setSelectedPub(pub);
    }, []);

    /* ── save crawl ── */
    const saveCrawl = async () => {
        if (!crawlName.trim() || crawlPubIds.length < 2) return;
        try {
            await db.collection('crawls').add({
                groupId,
                name: crawlName.trim(),
                date: crawlDate || null,
                pubIds: crawlPubIds,
                creatorId: user?.uid || null,
                creatorName: user?.displayName || user?.email || 'Unknown',
                createdAt: new Date(),
            });
            setDrawerOpen(false);
            setCrawlName('');
            setCrawlDate('');
            setCrawlPubIds([]);
        } catch (err) { console.error('Error saving crawl:', err); }
    };

    /* ── delete crawl ── */
    const deleteCrawl = async (id) => {
        if (!window.confirm('Delete this crawl?')) return;
        await db.collection('crawls').doc(id).delete().catch(console.error);
        if (activeCrawl?.id === id) setActiveCrawl(null);
    };

    /* ── toggle pub in crawl builder ── */
    const toggleCrawlPub = (id) => {
        setCrawlPubIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const movePubUp   = (idx) => { if (idx === 0) return; const a = [...crawlPubIds]; [a[idx-1],a[idx]] = [a[idx],a[idx-1]]; setCrawlPubIds(a); };
    const movePubDown = (idx) => { if (idx === crawlPubIds.length-1) return; const a = [...crawlPubIds]; [a[idx],a[idx+1]] = [a[idx+1],a[idx]]; setCrawlPubIds(a); };

    const pubsWithCoords    = localPubs.filter(p => p.lat && p.lng).length;
    const totalPubs         = localPubs.length;
    const visitedPubsSorted = localPubs.filter(p => p._listType === 'visited').sort((a,b) => {
        const sa = pubScoreMap[a.id]?.score || 0;
        const sb = pubScoreMap[b.id]?.score || 0;
        return sb - sa;
    });

    /* ── card style ── */
    const card = { background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-sm)' };

    return (
        <div className="animate-fadeIn pb-20" style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>

            {/* ── page header ── */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'var(--space-2)' }}>
                <div>
                    <h2 className="text-page-title">Pub Map</h2>
                    <p className="text-muted" style={{ marginTop:'var(--space-1)' }}>
                        {pubsWithCoords} of {totalPubs} pubs on the map
                        {geocoding && <span style={{ color:'var(--color-brand)', fontWeight:700, marginLeft:'var(--space-2)' }}>
                            · Geocoding {geocodeProgress.done}/{geocodeProgress.total}…
                        </span>}
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
                {[['Legendary','#b46414'],['Great','#d4a017'],['Decent','#ca8a04'],['Avoid','#dc2626'],['Unrated','#9ca3af']].map(([label,color]) => (
                    <span key={label} style={{ display:'flex', alignItems:'center', gap:'var(--space-1)', fontSize:'var(--text-xs)', fontWeight:700, fontFamily:'var(--font-body)', color:'var(--color-text-muted)' }}>
                        <span style={{ width:'0.75rem', height:'0.75rem', borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />
                        {label}
                    </span>
                ))}
            </div>

            {/* ── main layout: sidebar + map ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'var(--space-4)' }} className="lg:grid-cols-[280px_1fr]">

                {/* sidebar */}
                <div style={{ ...card, padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:'var(--space-3)', maxHeight:'36rem', overflowY:'auto' }}>
                    <p className="text-label">{filteredPubs.filter(p=>p.lat&&p.lng).length} pubs shown</p>
                    {filteredPubs.length === 0 && (
                        <p className="text-muted" style={{ fontStyle:'italic', textAlign:'center', padding:'var(--space-8) 0' }}>No pubs match these filters.</p>
                    )}
                    {filteredPubs.map(pub => {
                        const { score, hasScore } = pubScoreMap[pub.id] || { score:0, hasScore:false };
                        const color = tierColor(score, hasScore);
                        const hasCoords = pub.lat && pub.lng;
                        return (
                            <div
                                key={pub.id}
                                onClick={() => hasCoords && flyToPub(pub)}
                                style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-3)', borderRadius:'var(--radius-lg)', border:`1px solid ${selectedPub?.id===pub.id ? 'var(--color-brand)' : 'var(--color-border)'}`, background:selectedPub?.id===pub.id ? 'var(--color-surface-offset)' : 'transparent', cursor:hasCoords ? 'pointer' : 'default', opacity:hasCoords ? 1 : 0.45, transition:'all var(--transition-interactive)' }}
                                onMouseEnter={e => { if (hasCoords) e.currentTarget.style.borderColor='var(--color-brand)'; }}
                                onMouseLeave={e => { if (selectedPub?.id!==pub.id) e.currentTarget.style.borderColor='var(--color-border)'; }}
                            >
                                {pub.photoURL
                                    ? <img src={pub.photoURL} alt={pub.name} loading="lazy" width="40" height="40" style={{ width:'2.5rem', height:'2.5rem', borderRadius:'var(--radius-md)', objectFit:'cover', flexShrink:0 }} />
                                    : <div style={{ width:'2.5rem', height:'2.5rem', borderRadius:'var(--radius-md)', background:color, opacity:0.3, flexShrink:0 }} />}
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontWeight:700, fontSize:'var(--text-sm)', fontFamily:'var(--font-body)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pub.name}</p>
                                    <p className="text-muted" style={{ fontSize:'var(--text-xs)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pub.location}</p>
                                </div>
                                {hasScore
                                    ? <span style={{ background:color, color:'#fff', borderRadius:'var(--radius-full)', padding:'2px 8px', fontSize:'var(--text-xs)', fontWeight:800, flexShrink:0 }}>{score.toFixed(1)}</span>
                                    : !hasCoords && <span style={{ fontSize:'0.65rem', color:'var(--color-text-faint)', fontFamily:'var(--font-body)' }}>📍 no coords</span>}
                            </div>
                        );
                    })}
                </div>

                {/* map */}
                <div style={{ ...card, overflow:'hidden', minHeight:'36rem', position:'relative' }}>
                    <div ref={mapRef} style={{ width:'100%', height:'100%', minHeight:'36rem' }} />
                    {geocoding && (
                        <div style={{ position:'absolute', bottom:'1rem', left:'50%', transform:'translateX(-50%)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'var(--space-2) var(--space-5)', boxShadow:'var(--shadow-md)', zIndex:1000, fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)', color:'var(--color-brand)', display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                            <span className="animate-spin" style={{ display:'inline-block' }}>⚙️</span>
                            Auto-locating pubs… {geocodeProgress.done}/{geocodeProgress.total}
                        </div>
                    )}
                </div>
            </div>

            {/* ── saved crawls ── */}
            {crawls.length > 0 && (
                <div style={{ ...card, padding:'var(--space-6)' }}>
                    <h3 className="text-section-heading" style={{ marginBottom:'var(--space-4)' }}>🗺️ Saved Crawls</h3>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(280px,100%),1fr))', gap:'var(--space-4)' }}>
                        {crawls.map(crawl => {
                            const isActive = activeCrawl?.id === crawl.id;
                            const stopPubs = (crawl.pubIds || []).map(id => localPubs.find(p => p.id === id)).filter(Boolean);
                            return (
                                <div
                                    key={crawl.id}
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
                                        <button onClick={() => deleteCrawl(crawl.id)} style={{ color:'var(--color-error)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', opacity:0.6, transition:'opacity var(--transition-interactive)' }}
                                            onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.6'}
                                        >🗑️</button>
                                    </div>
                                    {/* stop list */}
                                    <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                                        {stopPubs.slice(0, 4).map((p, idx) => (
                                            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                                                <span style={{ width:'1.25rem', height:'1.25rem', background:'var(--color-brand)', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:900, flexShrink:0 }}>{idx+1}</span>
                                                <p style={{ fontSize:'var(--text-xs)', fontWeight:600, fontFamily:'var(--font-body)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                                            </div>
                                        ))}
                                        {stopPubs.length > 4 && <p className="text-muted" style={{ fontSize:'var(--text-xs)', paddingLeft:'calc(1.25rem + var(--space-2))' }}>+{stopPubs.length-4} more</p>}
                                    </div>
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

            {/* ── crawl builder drawer ── */}
            {drawerOpen && (
                <div style={{ position:'fixed', inset:0, zIndex:9000, display:'flex', justifyContent:'flex-end' }}>
                    {/* overlay */}
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)' }} onClick={() => setDrawerOpen(false)} />
                    {/* panel */}
                    <div style={{ position:'relative', zIndex:1, width:'min(420px,100vw)', height:'100%', overflowY:'auto', background:'var(--color-surface)', boxShadow:'-4px 0 32px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column' }}>
                        {/* header */}
                        <div style={{ padding:'var(--space-5) var(--space-6)', borderBottom:'1px solid var(--color-divider)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--color-surface)', zIndex:1 }}>
                            <h3 className="text-section-heading">🗺️ Create a Pub Crawl</h3>
                            <button onClick={() => setDrawerOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-muted)', fontSize:'1.5rem', lineHeight:1 }}>×</button>
                        </div>

                        <div style={{ padding:'var(--space-5) var(--space-6)', display:'flex', flexDirection:'column', gap:'var(--space-5)', flex:1 }}>

                            {/* crawl name */}
                            <div>
                                <label className="text-label" style={{ display:'block', marginBottom:'var(--space-2)' }}>Crawl Name</label>
                                <input
                                    type="text"
                                    value={crawlName}
                                    onChange={e => setCrawlName(e.target.value)}
                                    placeholder="e.g. Wolverhampton Classic"
                                    style={{ width:'100%', padding:'var(--space-3) var(--space-4)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'var(--color-surface-2)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', outline:'none' }}
                                    onFocus={e=>e.target.style.borderColor='var(--color-brand)'}
                                    onBlur={e=>e.target.style.borderColor='var(--color-border)'}
                                />
                            </div>

                            {/* crawl date */}
                            <div>
                                <label className="text-label" style={{ display:'block', marginBottom:'var(--space-2)' }}>Date (optional)</label>
                                <input
                                    type="date"
                                    value={crawlDate}
                                    onChange={e => setCrawlDate(e.target.value)}
                                    style={{ width:'100%', padding:'var(--space-3) var(--space-4)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'var(--color-surface-2)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', outline:'none' }}
                                    onFocus={e=>e.target.style.borderColor='var(--color-brand)'}
                                    onBlur={e=>e.target.style.borderColor='var(--color-border)'}
                                />
                            </div>

                            {/* selected pubs (ordered) */}
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

                            {/* pub picker */}
                            <div>
                                <label className="text-label" style={{ display:'block', marginBottom:'var(--space-2)' }}>Add Pubs to Route</label>
                                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', maxHeight:'16rem', overflowY:'auto', paddingRight:'var(--space-1)' }}>
                                    {visitedPubsSorted.map(pub => {
                                        const included = crawlPubIds.includes(pub.id);
                                        const { score, hasScore } = pubScoreMap[pub.id] || { score:0, hasScore:false };
                                        const color = tierColor(score, hasScore);
                                        return (
                                            <div
                                                key={pub.id}
                                                onClick={() => toggleCrawlPub(pub.id)}
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

                        {/* sticky footer */}
                        <div style={{ padding:'var(--space-4) var(--space-6)', borderTop:'1px solid var(--color-divider)', position:'sticky', bottom:0, background:'var(--color-surface)', display:'flex', gap:'var(--space-3)' }}>
                            <button onClick={() => setDrawerOpen(false)} style={{ flex:1, padding:'var(--space-3)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'transparent', color:'var(--color-text-muted)', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', cursor:'pointer' }}>Cancel</button>
                            <button
                                onClick={saveCrawl}
                                disabled={!crawlName.trim() || crawlPubIds.length < 2}
                                style={{ flex:2, padding:'var(--space-3)', border:'none', borderRadius:'var(--radius-lg)', background: (!crawlName.trim()||crawlPubIds.length<2) ? 'var(--color-surface-dynamic)' : 'var(--color-brand)', color: (!crawlName.trim()||crawlPubIds.length<2) ? 'var(--color-text-faint)' : '#fff', fontWeight:700, fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', cursor:(!crawlName.trim()||crawlPubIds.length<2) ? 'not-allowed' : 'pointer', transition:'all var(--transition-interactive)' }}
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
