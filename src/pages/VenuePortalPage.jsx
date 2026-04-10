import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../firebase';

export default function VenuePortalPage({ db, user }) {
    const [claimedPubs, setClaimedPubs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [globalScores, setGlobalScores] = useState({});

    // 1. Fetch pubs using array-contains
    useEffect(() => {
        if (!db || !user) return;
        
        const unsub = db.collection('pubs')
            .where('claimedBy', 'array-contains', user.uid)
            .onSnapshot(snap => {
                const pubs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setClaimedPubs(pubs);
                setLoading(false);
                
                pubs.forEach(pub => {
                    db.collectionGroup('scores').where('pubId', '==', pub.id).get()
                        .then(scoreSnap => {
                            const scores = scoreSnap.docs.map(s => s.data());
                            setGlobalScores(prev => ({ ...prev, [pub.id]: scores }));
                        })
                        .catch(err => {
                            console.error("Score fetch error:", err);
                            // If Firebase needs an index, it will tell us here
                            if (err.message.includes("index") || err.message.includes("FAILED_PRECONDITION")) {
                                if (!window.hasAlertedIndex) {
                                    window.hasAlertedIndex = true;
                                    alert("Analytics Error: Firebase needs a Search Index to calculate your global stats.\n\nPlease open your browser's Developer Console (F12 or Right Click -> Inspect -> Console), look for the red error text, and click the direct Firebase link to build the index. Wait 2 minutes, and refresh the page!");
                                }
                            }
                        });
                });
            });

        return () => unsub();
    }, [db, user]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        try {
            const snap = await db.collection('pubs').get();
            const allPubs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const term = searchTerm.toLowerCase();
            const matches = allPubs.filter(p => p.name.toLowerCase().includes(term) || (p.location && p.location.toLowerCase().includes(term)));
            setSearchResults(matches);
        } catch (err) { alert("Error searching database."); }
        setIsSearching(false);
    };

    const handleClaimPub = async (pub) => {
        const isAlreadyManager = Array.isArray(pub.claimedBy) ? pub.claimedBy.includes(user.uid) : pub.claimedBy === user.uid;
        
        if (isAlreadyManager) {
            alert("You are already managing this venue!");
            return;
        }

        const businessEmail = window.prompt(
            `To verify you own/manage ${pub.name}, please enter your official business email address. Our team will verify this shortly.`
        );

        if (!businessEmail || !businessEmail.includes('@')) {
            alert("A valid business email is required to claim a venue.");
            return;
        }

        try {
            await db.collection('venueClaims').add({
                pubId: pub.id,
                pubName: pub.name,
                requestedByUid: user.uid,
                contactEmail: businessEmail.trim(),
                status: 'pending',
                requestedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`Verification request sent for ${pub.name}! Our team will email ${businessEmail} shortly to confirm ownership.`);
            setSearchResults([]);
            setSearchTerm("");
        } catch (err) { alert("Failed to submit claim request. " + err.message); }
    };

    // --- FIX 2: Step Down Logic (Unlocks if last manager) ---
    const handleRemoveMyself = async (pub) => {
        if (!window.confirm(`Are you sure you want to step down as a manager of ${pub.name}? You will lose access to its analytics.`)) return;
        try {
            const isLastManager = Array.isArray(pub.claimedBy) && pub.claimedBy.length <= 1;
            
            const updates = {
                claimedBy: firebase.firestore.FieldValue.arrayRemove(user.uid)
            };
            
            if (isLastManager) {
                updates.isLocked = false;
            }

            await db.collection('pubs').doc(pub.id).update(updates);
            alert("You have been removed as a manager.");
        } catch (err) { alert("Failed to remove manager status: " + err.message); }
    };

    // --- FIX 3: Edit Business Profile ---
    const handleEditProfile = async (pub) => {
        const newPhoto = window.prompt("Enter a new Photo URL for your venue:", pub.photoURL || "");
        if (newPhoto === null) return; // Cancelled
        
        const newLocation = window.prompt("Enter the business address/location:", pub.location || "");
        if (newLocation === null) return;
        
        try {
            await db.collection('pubs').doc(pub.id).update({
                photoURL: newPhoto.trim(),
                location: newLocation.trim()
            });
            alert("Business profile updated!");
        } catch (err) {
            alert("Failed to update profile: " + err.message);
        }
    };

    if (loading) return <div className="text-center py-20 animate-pulse text-gray-500">Loading your venues...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-20">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8 rounded-3xl shadow-xl flex justify-between items-center">
                <div>
                    <span className="text-xs font-black uppercase tracking-widest text-brand mb-2 block">Pub Ranker Business</span>
                    <h2 className="text-3xl font-black mb-2">Venue Portal</h2>
                    <p className="text-gray-400 max-w-lg">Claim your venue to unlock local insights, respond to reviews, and run targeted promotions to groups in your city.</p>
                </div>
                <div className="hidden md:block text-6xl opacity-50">🏢</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Claim a Venue</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Search for your pub in our global database to request management access.</p>
                
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input 
                        type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                        placeholder="Search for your pub (e.g. The Crown)..." 
                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                    />
                    <button type="submit" disabled={isSearching} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold hover:opacity-80 transition disabled:opacity-50">
                        {isSearching ? "Searching..." : "Search"}
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3 max-h-60 overflow-y-auto">
                        {searchResults.map(pub => {
                            const isAlreadyManager = Array.isArray(pub.claimedBy) ? pub.claimedBy.includes(user.uid) : pub.claimedBy === user.uid;
                            const hasManagers = pub.claimedBy && pub.claimedBy.length > 0;
                            
                            return (
                                <div key={pub.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            {pub.name}
                                            {hasManagers && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Claimed</span>}
                                        </h4>
                                        <p className="text-xs text-gray-500">{pub.location || 'Unknown Location'}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleClaimPub(pub)}
                                        disabled={isAlreadyManager}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition ${isAlreadyManager ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:opacity-80 shadow-sm'}`}
                                    >
                                        {isAlreadyManager ? 'Managed By You' : hasManagers ? 'Request Co-Management' : 'Claim Venue'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {claimedPubs.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white">Your Venues</h3>
                    {claimedPubs.map(pub => {
                        const pubScores = globalScores[pub.id] || [];
                        const scaleScores = pubScores.filter(s => s.type === 'scale' && s.value !== null);
                        const avgRating = scaleScores.length > 0 ? (scaleScores.reduce((sum, s) => sum + s.value, 0) / scaleScores.length).toFixed(1) : "N/A";

                        return (
                            <div key={pub.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-6 items-center">
                                    {pub.photoURL ? <img src={pub.photoURL} alt={pub.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 shadow-sm" /> : <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-4xl shadow-sm">🍺</div>}
                                    <div className="flex-1 text-center md:text-left">
                                        <h4 className="text-2xl font-black text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
                                            {pub.name} <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Verified Owner</span>
                                        </h4>
                                        <p className="text-gray-500 dark:text-gray-400 mt-1">📍 {pub.location || 'Add your address'}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        <button onClick={() => handleEditProfile(pub)} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:opacity-80 transition whitespace-nowrap">Edit Profile</button>
                                        <button onClick={() => handleRemoveMyself(pub)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider text-center">Step Down</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="p-6 text-center">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Global Rating</p>
                                        <p className="text-4xl font-black text-brand">{avgRating}<span className="text-lg text-gray-400">/10</span></p>
                                    </div>
                                    <div className="p-6 text-center">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Ratings</p>
                                        <p className="text-4xl font-black text-gray-800 dark:text-white">{pubScores.length}</p>
                                    </div>
                                    <div className="p-6 text-center flex flex-col justify-center items-center">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Targeted Promotions</p>
                                        <button onClick={() => alert("Premium Dashboard coming soon!")} className="bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold px-6 py-2 rounded-xl shadow-md hover:scale-105 transition transform w-full">Unlock Premium 🔒</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}