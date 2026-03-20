import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { firebase } from '../firebase'; 

export default function PubsPage({ pubs, scores, criteria, db, groupId, userProfile }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [crawlMode, setCrawlMode] = useState(false);
    const [crawlRoute, setCrawlRoute] = useState([]); 
    
    // Saved Crawls State
    const [savedCrawls, setSavedCrawls] = useState([]);
    const [activeTab, setActiveTab] = useState('directory'); 
    
    // Save/Edit Modal State
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [crawlName, setCrawlName] = useState("");
    const [crawlDate, setCrawlDate] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [editingCrawlId, setEditingCrawlId] = useState(null);

    // --- NEW: AUTO-ROUTE GENERATOR STATE ---
    const [showAutoModal, setShowAutoModal] = useState(false);
    const [autoCount, setAutoCount] = useState(4);
    const [autoStatus, setAutoStatus] = useState("all"); // 'all', 'visited', 'to-visit'
    const [autoFixedType, setAutoFixedType] = useState("none"); // 'none', 'start', 'end'
    const [autoFixedPubId, setAutoFixedPubId] = useState("");

    // Fetch Saved Crawls
    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db.collection('crawls')
            .where('groupId', '==', groupId)
            .onSnapshot(snap => {
                const crawls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                crawls.sort((a, b) => new Date(b.date) - new Date(a.date));
                setSavedCrawls(crawls);
            });
        return () => unsub();
    }, [db, groupId]);

    // Calculate Pub Averages
    const pubsWithStats = useMemo(() => {
        return pubs.map(pub => {
            let totalScore = 0; let count = 0;
            criteria.filter(c => c.type === 'scale').forEach(c => {
                const cScores = scores[pub.id]?.[c.id] || [];
                cScores.forEach(s => { if (s.value != null && !isNaN(s.value)) { totalScore += s.value; count++; } });
            });
            const avg = count > 0 ? (totalScore / count) : null;
            let tier = 'unrated', color = 'bg-gray-400', emoji = '⚪';
            if (avg !== null) {
                if (avg >= 8.5) { tier = 'god'; color = 'bg-purple-500'; emoji = '🟣'; }
                else if (avg >= 7.0) { tier = 'great'; color = 'bg-blue-500'; emoji = '🔵'; }
                else if (avg >= 5.0) { tier = 'average'; color = 'bg-yellow-500'; emoji = '🟡'; }
                else { tier = 'avoid'; color = 'bg-red-500'; emoji = '🔴'; }
            }
            return { ...pub, avg, tier, color, emoji };
        }).filter(pub => pub.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [pubs, scores, criteria, searchTerm]);

    const defaultCenter = pubs.length > 0 && pubs[0].lat ? [pubs[0].lat, pubs[0].lng] : [51.505, -0.09];

    // Crawl Logic
    const toggleCrawlStop = (pubId) => setCrawlRoute(prev => prev.includes(pubId) ? prev.filter(id => id !== pubId) : [...prev, pubId]);
    const crawlCoordinates = crawlRoute.map(id => pubsWithStats.find(p => p.id === id)).filter(p => p && p.lat && p.lng).map(p => [p.lat, p.lng]);

    const copyItinerary = () => {
        const text = crawlRoute.map((id, index) => {
            const p = pubsWithStats.find(pub => pub.id === id);
            return `${index + 1}. ${p?.name || 'Unknown'} ${p?.avg ? `(${p.avg.toFixed(1)}/10)` : ''}`;
        }).join('\n');
        navigator.clipboard.writeText(`🍻 Tonight's Pub Crawl:\n\n${text}`);
        alert("Itinerary copied to clipboard!");
    };

    // --- NEW: THE ROUTE GENERATOR AI ENGINE ---
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    };

    // Dynamically filter pubs for the Generator dropdown so users can't select invalid pubs
    const validAutoPubs = useMemo(() => {
        let pool = pubsWithStats.filter(p => p.lat && p.lng);
        if (autoStatus === 'visited') pool = pool.filter(p => p.status === 'visited');
        if (autoStatus === 'to-visit') pool = pool.filter(p => p.status !== 'visited');
        return pool.sort((a, b) => a.name.localeCompare(b.name));
    }, [pubsWithStats, autoStatus]);

    const generateAutoCrawl = (e) => {
        e.preventDefault();
        
        let poolLeft = [...validAutoPubs];

        if (poolLeft.length < autoCount) {
            alert(`Not enough pubs match your filters! Found ${poolLeft.length}, but you asked for ${autoCount}.`);
            return;
        }

        let route = [];
        let currentPub = null;

        // Determine starting point
        if ((autoFixedType === 'start' || autoFixedType === 'end') && autoFixedPubId) {
            currentPub = poolLeft.find(p => p.id === autoFixedPubId);
        } else {
            // Random start - prefer highly rated pubs if available
            const goodPubs = poolLeft.filter(p => (p.avg || 0) >= 7.0);
            currentPub = goodPubs.length > 0 ? goodPubs[Math.floor(Math.random() * goodPubs.length)] : poolLeft[Math.floor(Math.random() * poolLeft.length)];
        }

        if (!currentPub) return alert("The selected pub doesn't match your filters!");

        route.push(currentPub.id);
        poolLeft = poolLeft.filter(p => p.id !== currentPub.id);

        // Nearest-Neighbor Algorithm
        while (route.length < autoCount && poolLeft.length > 0) {
            let closestPub = null;
            let minDistance = Infinity;

            for (const p of poolLeft) {
                const dist = getDistance(currentPub.lat, currentPub.lng, p.lat, p.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestPub = p;
                }
            }

            if (closestPub) {
                route.push(closestPub.id);
                currentPub = closestPub;
                poolLeft = poolLeft.filter(p => p.id !== closestPub.id);
            } else {
                break;
            }
        }

        // If they wanted to END at the specific pub, reverse the array!
        if (autoFixedType === 'end') {
            route.reverse();
        }

        setCrawlRoute(route);
        setCrawlMode(true);
        setShowAutoModal(false);
    };

    // --- EDIT & DELETE LOGIC ---
    const handleEditCrawl = (crawl) => {
        setEditingCrawlId(crawl.id);
        setCrawlName(crawl.name);
        setCrawlDate(crawl.date);
        setCrawlRoute(crawl.route);
        setCrawlMode(true); 
    };

    const handleDeleteCrawl = async (crawlId, crawlName) => {
        if (!window.confirm(`Are you sure you want to delete "${crawlName}"? This cannot be undone.`)) return;
        try { await db.collection('crawls').doc(crawlId).delete(); } 
        catch (error) { alert("Failed to delete crawl."); }
    };

    const resetPlanner = () => {
        setCrawlMode(false);
        setCrawlRoute([]);
        setEditingCrawlId(null);
        setCrawlName("");
        setCrawlDate("");
    };

    const handleSaveCrawl = async (e) => {
        e.preventDefault();
        if (!crawlName.trim() || !crawlDate || crawlRoute.length === 0) return;
        setIsSaving(true);
        try {
            if (editingCrawlId) {
                await db.collection('crawls').doc(editingCrawlId).update({ name: crawlName.trim(), date: crawlDate, route: crawlRoute });
                alert("Crawl updated successfully!");
            } else {
                await db.collection('crawls').add({ groupId, name: crawlName.trim(), date: crawlDate, route: crawlRoute, createdBy: userProfile?.uid || 'unknown', creatorName: userProfile?.displayName || 'Unknown User', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                alert("New crawl saved successfully!");
            }
            setShowSaveModal(false);
            resetPlanner();
        } catch (error) { alert("Failed to save the crawl."); }
        setIsSaving(false);
    };

    const createCustomIcon = (pub) => {
        const isCrawlStop = crawlRoute.includes(pub.id);
        const stopNumber = crawlRoute.indexOf(pub.id) + 1;
        const html = isCrawlStop 
            ? `<div class="w-8 h-8 bg-black text-white font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-black/50 transform scale-110">${stopNumber}</div>`
            : `<div class="text-3xl filter drop-shadow-md hover:scale-125 transition-transform cursor-pointer">${pub.emoji}</div>`;
        return L.divIcon({ html, className: 'custom-leaflet-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4 relative animate-fadeIn">
            
            {/* LEFT SIDE: THE MAP */}
            <div className="flex-1 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 relative z-0">
                <MapContainer center={defaultCenter} zoom={13} className="w-full h-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                    {crawlMode && crawlCoordinates.length > 1 && <Polyline positions={crawlCoordinates} color="#000000" weight={4} dashArray="10, 10" className="animate-pulse" />}
                    {pubsWithStats.map(pub => {
                        if (!pub.lat || !pub.lng) return null;
                        return (
                            <Marker key={pub.id} position={[pub.lat, pub.lng]} icon={createCustomIcon(pub)}>
                                <Popup className="rounded-xl overflow-hidden">
                                    <div className="text-center p-1">
                                        <h3 className="font-bold text-lg">{pub.name}</h3>
                                        <p className="text-sm text-gray-600 mb-2">{pub.avg ? `Score: ${pub.avg.toFixed(1)}/10` : 'Unrated'}</p>
                                        {crawlMode && (
                                            <button onClick={() => toggleCrawlStop(pub.id)} className={`w-full py-1 px-2 rounded font-bold text-white ${crawlRoute.includes(pub.id) ? 'bg-red-500' : 'bg-blue-600'}`}>
                                                {crawlRoute.includes(pub.id) ? 'Remove Stop' : 'Add to Crawl'}
                                            </button>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* RIGHT SIDE: DIRECTORY & PLANNER */}
            <div className="w-full lg:w-96 flex flex-col gap-4 h-full">
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col gap-3 flex-shrink-0 transition-colors">
                    {!crawlMode && <input type="text" placeholder="Search pubs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" />}
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={crawlMode ? resetPlanner : () => setCrawlMode(true)}
                            className={`flex-1 py-2 rounded-lg font-bold transition-all ${crawlMode ? 'bg-black text-white shadow-lg' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'}`}
                        >
                            {crawlMode ? "🛑 Exit Planner" : "🗺️ Manual Route"}
                        </button>

                        {!crawlMode && (
                            <button 
                                onClick={() => setShowAutoModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-md flex items-center gap-2"
                                title="Auto-generate a smart route!"
                            >
                                ✨ Auto
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto flex flex-col transition-colors">
                    {crawlMode ? (
                        /* CRAWL ITINERARY VIEW */
                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold mb-1 dark:text-white">{editingCrawlId ? 'Editing Crawl' : 'Your Crawl Route'}</h3>
                            {editingCrawlId && <p className="text-xs text-blue-500 mb-4 font-semibold">Editing: {crawlName}</p>}
                            
                            {crawlRoute.length === 0 ? (
                                <p className="text-gray-500 text-center italic mt-10">Click on map pins to add stops to your crawl!</p>
                            ) : (
                                <div className="space-y-3 flex-1 overflow-y-auto">
                                    {crawlRoute.map((id, index) => {
                                        const pub = pubsWithStats.find(p => p.id === id);
                                        return (
                                            <div key={id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{index + 1}</div>
                                                <div className="flex-1 min-w-0"><h4 className="font-bold text-gray-800 dark:text-white truncate">{pub?.name || 'Unknown'}</h4></div>
                                                <button onClick={() => toggleCrawlStop(id)} className="text-red-500 text-xl hover:scale-110 flex-shrink-0">✕</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {crawlRoute.length > 0 && (
                                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
                                    <button onClick={() => setShowSaveModal(true)} className={`w-full text-white font-bold py-2 rounded-lg transition-colors ${editingCrawlId ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        {editingCrawlId ? '💾 Update This Event' : '💾 Save This Event'}
                                    </button>
                                    <button onClick={copyItinerary} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-colors">📋 Copy for WhatsApp</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* TABS FOR DIRECTORY VS SAVED CRAWLS */
                        <div className="flex flex-col h-full">
                            <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                                <button onClick={() => setActiveTab('directory')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'directory' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Pub Directory</button>
                                <button onClick={() => setActiveTab('saved')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'saved' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Saved Crawls</button>
                            </div>

                            <div className="p-4 overflow-y-auto flex-1">
                                {activeTab === 'directory' ? (
                                    <div className="space-y-3">
                                        {pubsWithStats.map(pub => (
                                            <div key={pub.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition cursor-pointer">
                                                <div className="min-w-0 pr-2">
                                                    <h4 className="font-bold text-gray-800 dark:text-white truncate">{pub.name}</h4>
                                                    <p className="text-xs text-gray-500 truncate">{pub.location || 'Unknown location'}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0"><div className="text-xl mb-1">{pub.emoji}</div></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {savedCrawls.length === 0 ? (
                                            <p className="text-center text-gray-500 italic mt-8">No crawls saved yet. Go plan one!</p>
                                        ) : (
                                            savedCrawls.map(crawl => {
                                                const canEdit = crawl.createdBy === userProfile?.uid || userProfile?.isSuperAdmin;
                                                return (
                                                    <div key={crawl.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-col gap-3">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 dark:text-white text-lg">{crawl.name}</h4>
                                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                                                                    {new Date(crawl.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded">{crawl.route.length} Stops</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500">Planned by {crawl.creatorName}</p>
                                                        
                                                        <div className="flex gap-2 mt-1">
                                                            <button onClick={() => { setCrawlRoute(crawl.route); setCrawlMode(true); }} className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">
                                                                📍 View
                                                            </button>
                                                            {canEdit && (
                                                                <>
                                                                    <button onClick={() => handleEditCrawl(crawl)} className="flex-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 font-semibold py-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition text-sm">
                                                                        ✏️ Edit
                                                                    </button>
                                                                    <button onClick={() => handleDeleteCrawl(crawl.id, crawl.name)} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold px-3 py-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition text-sm">
                                                                        🗑️
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- NEW: AUTO GENERATOR MODAL --- */}
            {showAutoModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setShowAutoModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                        
                        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-2">Smart Generator</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Let the AI build the most geographically efficient route for you.</p>
                        
                        <form onSubmit={generateAutoCrawl} className="space-y-5">
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Number of Pubs</label>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="2" max="10" value={autoCount} onChange={(e) => setAutoCount(Number(e.target.value))} className="flex-1 accent-purple-500" />
                                    <span className="font-black text-xl text-purple-600 dark:text-purple-400 w-8 text-center">{autoCount}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Filter By Status</label>
                                <select value={autoStatus} onChange={e => setAutoStatus(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none focus:border-purple-500">
                                    <option value="all">Include All Pubs</option>
                                    <option value="visited">Only Pubs We've Visited</option>
                                    <option value="to-visit">Hit List (Not Visited Yet)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Fixed Point</label>
                                <select value={autoFixedType} onChange={e => { setAutoFixedType(e.target.value); setAutoFixedPubId(""); }} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white font-semibold outline-none focus:border-purple-500 mb-2">
                                    <option value="none">🎲 Random Starting Point</option>
                                    <option value="start">📍 Start the route here...</option>
                                    <option value="end">🏁 End the route here...</option>
                                </select>

                                {autoFixedType !== "none" && (
                                    <select value={autoFixedPubId} onChange={e => setAutoFixedPubId(e.target.value)} className="w-full px-4 py-3 border border-purple-300 dark:border-purple-600 rounded-xl bg-purple-50 dark:bg-purple-900/20 dark:text-white font-semibold outline-none focus:border-purple-500" required>
                                        <option value="">Select a specific pub...</option>
                                        {validAutoPubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                            </div>
                            
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg shadow-purple-500/30 transform hover:scale-[1.02]">
                                    Generate Route
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SAVE/UPDATE MODAL */}
            {showSaveModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 relative">
                        <button onClick={() => setShowSaveModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{editingCrawlId ? 'Update Pub Crawl' : 'Save Pub Crawl'}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Confirm your event name and date.</p>
                        <form onSubmit={handleSaveCrawl} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Event Name</label>
                                <input type="text" value={crawlName} onChange={e => setCrawlName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                <input type="date" value={crawlDate} onChange={e => setCrawlDate(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" required />
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={isSaving || !crawlName || !crawlDate} className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md disabled:opacity-50 ${editingCrawlId ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    {isSaving ? 'Saving...' : editingCrawlId ? 'Update Crawl' : 'Save Event to Dashboard'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}