import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

export default function CampaignBuilderPage({ db, user, onBack }) {
    const [managedPubs, setManagedPubs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Campaign State
    const [selectedPubId, setSelectedPubId] = useState("");
    const [campaignName, setCampaignName] = useState("");
    const [offerType, setOfferType] = useState("Free Pint (Any Draught)");
    const [audience, setAudience] = useState("Hit List Users");
    const [radius, setRadius] = useState(5);
    const [isLaunching, setIsLaunching] = useState(false);

    useEffect(() => {
        if (!db || !user) return;
        const unsub = db.collection('pubs')
            .where('claimedBy', 'array-contains', user.uid)
            .onSnapshot(snap => {
                const pubs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setManagedPubs(pubs);
                if (pubs.length > 0) setSelectedPubId(pubs[0].id);
                setLoading(false);
            });
        return () => unsub();
    }, [db, user]);

    const selectedPub = managedPubs.find(p => p.id === selectedPubId);

    // Mock calculation for UI purposes (In production, you'd run a geospatial query on your users)
    const baseUsersInCity = 15420; 
    const audienceMultiplier = audience === "Hit List Users" ? 0.15 : audience === "Past Visitors" ? 0.35 : 1.0;
    const radiusMultiplier = radius / 20; 
    const estimatedReach = Math.floor(baseUsersInCity * audienceMultiplier * radiusMultiplier);
    const estimatedCost = Math.max(15, Math.floor(estimatedReach * 0.05)); // Base £15 + 5p per user

    const handleLaunchCampaign = async (e) => {
        e.preventDefault();
        if (!selectedPubId || !campaignName.trim()) {
            alert("Please select a venue and name your campaign.");
            return;
        }

        setIsLaunching(true);
        try {
            // 1. Save the promotion to the database
            await db.collection('promotions').add({
                pubId: selectedPub.id,
                pubName: selectedPub.name,
                businessOwnerId: user.uid,
                campaignName: campaignName.trim(),
                offerType,
                audience,
                radius: Number(radius),
                status: 'active', // In a real app with Stripe, this would be 'pending_payment'
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days from now
            });

            // 2. Simulate the Stripe Checkout experience
            alert(`Redirecting to Stripe Checkout to pay £${estimatedCost}.00...\n\n(Simulated Success! Campaign is now live in the database.)`);
            onBack();
        } catch (err) {
            alert("Failed to launch campaign: " + err.message);
            setIsLaunching(false);
        }
    };

    if (loading) return <div className="text-center py-20 animate-pulse text-gray-500">Loading campaign manager...</div>;

    if (managedPubs.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 mt-8">
                <span className="text-6xl mb-4 block">🏢</span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Venues Managed</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">You need to claim and verify a venue before you can run promotions.</p>
                <button onClick={onBack} className="bg-brand text-white font-bold px-6 py-3 rounded-xl hover:opacity-80 transition">Go to Venue Portal</button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-20 mt-4 px-4 sm:px-0">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm">
                    ←
                </button>
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">Campaign Builder</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Premium Advertising Suite</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: The Form */}
                <div className="lg:col-span-7 space-y-6">
                    <form onSubmit={handleLaunchCampaign} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6">
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">1. Select Venue</label>
                            <select 
                                value={selectedPubId} 
                                onChange={e => setSelectedPubId(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none cursor-pointer font-semibold"
                            >
                                {managedPubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">2. Campaign Name (Internal)</label>
                            <input 
                                type="text" 
                                value={campaignName} 
                                onChange={e => setCampaignName(e.target.value)} 
                                placeholder="e.g. Friday Night Footfall Booster" 
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none font-medium"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">3. The Offer</label>
                                <select 
                                    value={offerType} 
                                    onChange={e => setOfferType(e.target.value)}
                                    className="w-full px-4 py-3 border border-orange-200 dark:border-orange-900/50 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-300 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer font-bold"
                                >
                                    <option value="Free Pint (Any Draught)">Free Pint (Any Draught)</option>
                                    <option value="20% Off First Round">20% Off First Round</option>
                                    <option value="Queue Jump / VIP Entry">Queue Jump / VIP Entry</option>
                                    <option value="Free Bar Snacks">Free Bar Snacks</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">4. Target Audience</label>
                                <select 
                                    value={audience} 
                                    onChange={e => setAudience(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none cursor-pointer font-medium"
                                >
                                    <option value="Hit List Users">Users with us on their Hit List</option>
                                    <option value="Past Visitors">Users who have rated us before</option>
                                    <option value="All Local Users">Broadcast to everyone</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">5. Geographic Radius</label>
                                <span className="font-black text-brand">{radius} Miles</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" max="20" step="1"
                                value={radius} 
                                onChange={e => setRadius(e.target.value)}
                                className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2 px-1">
                                <span>1m (Walking)</span>
                                <span>20m (Driving)</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-4">
                            <button type="submit" disabled={isLaunching} className="w-full bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-200 text-white dark:text-gray-900 text-lg font-black py-4 rounded-xl shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50">
                                {isLaunching ? "Processing..." : "Launch Campaign via Stripe"} 💳
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-3 font-semibold flex justify-center gap-2">
                                <span>🔒 Secure payment</span> • <span>Campaign runs for 7 days</span>
                            </p>
                        </div>
                    </form>
                </div>

                {/* RIGHT COLUMN: Mobile Preview & Stats */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Stats Widget */}
                    <div className="bg-gradient-to-br from-brand to-purple-600 p-6 rounded-3xl shadow-lg text-white flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Estimated Reach</p>
                            <p className="text-4xl font-black">{estimatedReach.toLocaleString()}</p>
                            <p className="text-sm font-medium opacity-90 mt-1">Targeted Local Users</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Est. Cost</p>
                            <p className="text-4xl font-black">£{estimatedCost.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Mobile Phone Mockup */}
                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-[2.5rem] shadow-inner border-8 border-gray-800 dark:border-black max-w-sm mx-auto relative overflow-hidden h-[500px] flex flex-col">
                        {/* Fake Dynamic Island / Notch */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 dark:bg-black rounded-b-2xl z-20"></div>
                        
                        {/* Phone Screen Content */}
                        <div className="bg-gray-50 dark:bg-gray-800 flex-1 rounded-2xl overflow-hidden relative z-10 flex flex-col">
                            
                            {/* Fake App Header */}
                            <div className="bg-white dark:bg-gray-900 p-4 pt-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shadow-sm">
                                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pub Ranker</span>
                                <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></span>
                            </div>

                            {/* The Feed / Dashboard Simulation */}
                            <div className="p-4 flex-1 bg-gray-50 dark:bg-gray-800 space-y-4 overflow-y-hidden">
                                
                                {/* --- THE DYNAMIC PROMOTION TICKET --- */}
                                <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group border border-orange-300 animate-pulse">
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="bg-black/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider backdrop-blur-sm">Sponsored Offer</span>
                                            <span className="text-2xl drop-shadow-sm">🎟️</span>
                                        </div>
                                        <h3 className="font-black text-lg leading-tight mb-1">{selectedPub?.name || "Your Pub Name"}</h3>
                                        <p className="text-sm font-bold opacity-90">{offerType}</p>
                                        
                                        <div className="mt-4 bg-white/20 backdrop-blur-md rounded-lg p-2 text-center border border-white/30 cursor-pointer hover:bg-white/30 transition">
                                            <p className="text-xs font-black uppercase tracking-wider">Tap to claim in-store</p>
                                        </div>
                                    </div>
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                                </div>
                                {/* ----------------------------------- */}

                                {/* Fake underlying app content */}
                                <div className="bg-white dark:bg-gray-700 h-24 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 opacity-50"></div>
                                <div className="bg-white dark:bg-gray-700 h-32 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 opacity-50"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}