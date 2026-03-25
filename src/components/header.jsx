import React, { useState } from 'react';
import { firebase } from '../firebase'; 

export default function Header({ user, page, setPage, canManageGroup, groupName, onSwitchGroup, auth, db, userProfile, isDarkMode, toggleDarkMode, scores, pubs, criteria }) {    
    const [showProfile, setShowProfile] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false); // For mobile menu toggle
    
    // --- NEW: Check if the user has ANY staff role ---
    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;
    
    const NavButton = ({ name, targetPage, icon }) => {
        const isActive = page === targetPage;
        return (
            <button
                onClick={() => setPage(targetPage)}
                className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
                    isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 transform scale-105" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
                <span>{icon}</span> {name}
            </button>
        );
    };
    
    const displayName = userProfile?.nickname || userProfile?.displayName || user?.email || "User";
    const avatarUrl = userProfile?.avatarUrl || "";
    
    const handleSignOut = async () => {
        try { await auth.signOut(); } 
        catch (e) { console.error("Error signing out", e); }
    };
    
    return (
        <>
            {/* Sticky Frosted Glass Header */}
            <header className="sticky top-0 z-[100] bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 mb-6 transition-colors duration-300 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* TOP ROW: Brand & User Actions */}
                    <div className="flex justify-between items-center h-20">
                        {/* Brand */}
                        <div className="flex flex-col justify-center">
                            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight">
                                Pub Ranker
                            </h1>
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                                {groupName}
                            </span>
                        </div>

                        {/* Desktop User Actions */}
                        <div className="hidden md:flex items-center gap-3">
                            <button 
                                onClick={toggleDarkMode} 
                                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                title="Toggle Dark Mode"
                            >
                                {isDarkMode ? '☀️' : '🌙'}
                            </button>

                            <button onClick={onSwitchGroup} className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                Switch Group
                            </button>
                
                            {/* Profile Pill */}
                            <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 pl-1 pr-4 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition group">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="font-bold text-sm text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate max-w-[100px]">
                                    {displayName.split(' ')[0]}
                                </span>
                            </button>

                            <button onClick={handleSignOut} className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition" title="Log Out">
                                🚪
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden flex items-center gap-2">
                            <button onClick={() => setShowProfile(true)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-bold text-gray-700 dark:text-gray-300">{displayName.charAt(0).toUpperCase()}</span>}
                            </button>
                            <button onClick={() => setIsNavOpen(!isNavOpen)} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xl">
                                {isNavOpen ? '✕' : '☰'}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Dropdown Actions (Only visible when hamburger clicked) */}
                    {isNavOpen && (
                        <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2 animate-fadeIn">
                            <button onClick={toggleDarkMode} className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300">
                                {isDarkMode ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
                            </button>
                            <button onClick={onSwitchGroup} className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300">
                                🔄 Switch Group
                            </button>
                            <button onClick={handleSignOut} className="w-full text-left px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 font-bold text-red-600 dark:text-red-400">
                                🚪 Log Out
                            </button>
                        </div>
                    )}

                    {/* BOTTOM ROW: Scrollable Navigation Pills */}
                    <div className="py-3 flex overflow-x-auto gap-2 hide-scrollbar pb-4 items-center">
                        <NavButton name="Dashboard" targetPage="dashboard" icon="📊" />
                        <NavButton name="Directory" targetPage="pubs" icon="🍻" />
                        <NavButton name="Hit List" targetPage="toVisit" icon="🎯" />
                        <NavButton name="Map Planner" targetPage="map" icon="🗺️" />
                        <NavButton name="Leaderboard" targetPage="leaderboard" icon="🏆" />
                        <NavButton name="Versus" targetPage="individual" icon="🥊" />
                        <NavButton name="Spin" targetPage="spin" icon="🎡" />
                        <NavButton name="Feedback" targetPage="feedback" icon="💬" />
                        
                        {canManageGroup && (
                            <div className="pl-2 border-l-2 border-gray-300 dark:border-gray-700 ml-1">
                                <NavButton name="Admin" targetPage="admin" icon="⚙️" />
                            </div>
                        )}
                        
                        {/* UPDATED: NOW SHOWS FOR ANY STAFF MEMBER */}
                        {isStaff && (
                            <NavButton name="Staff Menu" targetPage="superadmin" icon="🛡️" />
                        )}
                    </div>
                </div>
            </header>
            
            {/* CSS for hiding scrollbar on the nav row */}
            <style dangerouslySetContent={{__html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        
            {/* User Profile Modal */}
            {showProfile && (
                <ProfileModal user={user} userProfile={userProfile} db={db} onClose={() => setShowProfile(false)} scores={scores} pubs={pubs} />
            )}
        </>
    );
}

// --- PROFILE MODAL COMPONENT ---
function ProfileModal({ user, userProfile, db, onClose, scores = {}, pubs = [] }) {
    const [nickname, setNickname] = useState(userProfile?.nickname || "");
    const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || "");
    const [bio, setBio] = useState(userProfile?.bio || "");
    const [saving, setSaving] = useState(false);
    
    // --- CALCULATE BADGES ---
    let pubsRated = new Set();
    let perfectTens = 0;
    let writtenReviews = 0;
    
    Object.values(scores).forEach(pubScores => {
        Object.values(pubScores).forEach(critScores => {
            const myScore = critScores.find(s => s.userId === user.uid);
            if (myScore && myScore.value != null) {
                pubsRated.add(myScore.pubId);
                if (myScore.type === 'scale' && myScore.value === 10) perfectTens++;
                if (myScore.type === 'text' && myScore.value.toString().trim().length > 0) writtenReviews++;
            }
        });
    });

    const pubsAdded = pubs.filter(p => p.addedBy === user.uid).length;
    const ratedCount = pubsRated.size;

    const allBadges = [
        { emoji: '🍻', title: 'First Pint', desc: 'Rated your first pub', earned: ratedCount >= 1 },
        { emoji: '🥉', title: 'Bronze Pint', desc: 'Rated 5+ pubs', earned: ratedCount >= 5 },
        { emoji: '🥇', title: 'Gold Pint', desc: 'Rated 20+ pubs', earned: ratedCount >= 20 },
        { emoji: '✍️', title: 'The Scribe', desc: 'Left a written review', earned: writtenReviews > 0 },
        { emoji: '🎯', title: 'Bullseye', desc: 'Gave a perfect 10/10', earned: perfectTens > 0 },
        { emoji: '🗺️', title: 'The Explorer', desc: 'Added 5 pubs to the database', earned: pubsAdded >= 5 },
    ];

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await db.collection("users").doc(user.uid).update({
                nickname: nickname.trim() || firebase.firestore.FieldValue.delete(),
                avatarUrl: avatarUrl.trim() || firebase.firestore.FieldValue.delete(),
                bio: bio.trim() || firebase.firestore.FieldValue.delete(),
            });
            setTimeout(() => { onClose(); }, 500);
        } catch (e) { console.error(e); } 
        finally { setSaving(false); }
    };
    
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition">✕</button>

                <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-6">Your Profile</h3>
        
                <form onSubmit={handleSave} className="space-y-4 mb-8 border-b border-gray-200 dark:border-gray-700 pb-8">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-4 mb-2">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-white dark:border-gray-700" onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-sm">
                                {(userProfile?.displayName || user?.email || "U").charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Account Email</label>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[200px]">{user?.email}</p>
                        </div>
                    </div>
            
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Display Name</label>
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full px-4 py-3 border dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white" />
                    </div>
            
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Avatar URL (Optional)</label>
                        <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full px-4 py-3 border dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white" />
                    </div>
            
                    <div className="pt-2">
                        <button type="submit" disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition shadow-md disabled:opacity-50">
                            {saving ? "Saving..." : "Save Details"}
                        </button>
                    </div>
                </form>

                {/* THE TROPHY ROOM */}
                <div>
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Trophy Cabinet</h4>
                    <div className="grid grid-cols-3 gap-3">
                        {allBadges.map((badge, idx) => (
                            <div key={idx} className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${badge.earned ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 dark:from-yellow-900/20 dark:to-amber-900/10 dark:border-yellow-700/50 shadow-sm' : 'bg-gray-50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700 opacity-50 grayscale'}`} title={badge.desc}>
                                <span className="text-3xl mb-1 filter drop-shadow-sm">{badge.emoji}</span>
                                <span className={`text-[10px] font-black uppercase tracking-wider leading-tight ${badge.earned ? 'text-yellow-800 dark:text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`}>{badge.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}