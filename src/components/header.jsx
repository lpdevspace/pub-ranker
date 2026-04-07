import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase'; 

export default function Header({ user, page, setPage, canManageGroup, groupName, onSwitchGroup, auth, db, userProfile, isDarkMode, toggleDarkMode, scores = {}, pubs = [], criteria = [], groupId }) {    
    const [showProfile, setShowProfile] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false); 
    
    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;
    
    const NavButton = ({ name, targetPage, icon }) => {
        const isActive = page === targetPage;
        return (
            <button
                onClick={() => setPage(targetPage)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive 
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm transform scale-[1.02]" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
                <span className="text-base">{icon}</span>
                <span>{name}</span>
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
            <header className="sticky top-0 z-[100] bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 mb-6 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Top Utility Bar */}
                    <div className="flex justify-between items-center h-16">
                        <div className="flex flex-col justify-center min-w-0 pr-4">
                            <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight truncate">
                                Pub Ranker
                            </h1>
                            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest truncate">
                                {groupName}
                            </span>
                        </div>

                        {/* Desktop Controls */}
                        <div className="hidden md:flex items-center gap-2">
                            <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition" title="Toggle Theme">
                                {isDarkMode ? '☀️' : '🌙'}
                            </button>

                            <button onClick={onSwitchGroup} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition flex items-center gap-1 text-sm font-semibold" title="Switch Group">
                                🔄 <span className="hidden lg:inline">Switch</span>
                            </button>
                
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                            <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition group border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover shadow-sm" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 truncate max-w-[100px]">
                                    {displayName.split(' ')[0]}
                                </span>
                            </button>

                            <button onClick={handleSignOut} className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-1" title="Log Out">
                                🚪
                            </button>
                        </div>

                        {/* Mobile Controls */}
                        <div className="md:hidden flex items-center gap-1.5">
                            <button onClick={() => setShowProfile(true)} className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">{displayName.charAt(0).toUpperCase()}</div>}
                            </button>
                            <button onClick={() => setIsNavOpen(!isNavOpen)} className="p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                <span className="text-xl leading-none">{isNavOpen ? '✕' : '☰'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Dropdown Menu */}
                    {isNavOpen && (
                        <div className="md:hidden py-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1 animate-fadeIn">
                            <button onClick={() => { toggleDarkMode(); setIsNavOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                {isDarkMode ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
                            </button>
                            <button onClick={() => { onSwitchGroup(); setIsNavOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                🔄 Switch Group
                            </button>
                            <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-red-600 dark:text-red-400 text-sm">
                                🚪 Log Out
                            </button>
                        </div>
                    )}

                    {/* Scrollable Navigation */}
                    <div className="py-2.5 flex overflow-x-auto gap-1 hide-scrollbar items-center border-t border-gray-100 dark:border-gray-800/50">
                        <NavButton name="Dashboard" targetPage="dashboard" icon="📊" />
                        <NavButton name="Directory" targetPage="pubs" icon="🍻" />
                        <NavButton name="Hit List" targetPage="toVisit" icon="🎯" />
                        <NavButton name="Events" targetPage="events" icon="📅" />
                        <NavButton name="Map Planner" targetPage="map" icon="🗺️" />
                        <NavButton name="Leaderboard" targetPage="leaderboard" icon="🏆" />
                        <NavButton name="Versus" targetPage="individual" icon="🥊" />
                        <NavButton name="Spin" targetPage="spin" icon="🎡" />
                        <NavButton name="Feedback" targetPage="feedback" icon="💬" />
                        
                        {canManageGroup && (
                            <>
                                <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1 shrink-0"></div>
                                <NavButton name="Admin" targetPage="admin" icon="⚙️" />
                            </>
                        )}
                        
                        {isStaff && (
                            <NavButton name="Staff Menu" targetPage="superadmin" icon="🛡️" />
                        )}
                    </div>
                </div>
            </header>
            
            <style dangerouslySetInnerHTML={{__html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        
            {showProfile && (
                <ProfileModal user={user} userProfile={userProfile} db={db} groupId={groupId} onClose={() => setShowProfile(false)} scores={scores} pubs={pubs} />
            )}
        </>
    );
}

function ProfileModal({ user, userProfile, db, groupId, onClose, scores = {}, pubs = [] }) {
    const [nickname, setNickname] = useState(userProfile?.nickname || "");
    const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || "");
    const [bio, setBio] = useState(userProfile?.bio || "");
    const [saving, setSaving] = useState(false);
    
    const [gamification, setGamification] = useState({ badges: [] });
    const [crawlsCreated, setCrawlsCreated] = useState(0);
    
    useEffect(() => {
        if (!db) return;
        db.collection('global').doc('gamification').get().then(doc => {
            if (doc.exists && doc.data()) {
                setGamification(doc.data());
            }
        });
    }, [db]);

    useEffect(() => {
        if (!db || !groupId || !user) return;
        db.collection('crawls').where('groupId', '==', groupId).where('createdBy', '==', user.uid).get().then(snap => {
            setCrawlsCreated(snap.size);
        });
    }, [db, groupId, user]);

    // SAFELY CALCULATE STATS
    let pubsRated = new Set();
    let perfectTens = 0;
    let writtenReviews = 0;
    
    const safeScores = scores || {};
    Object.values(safeScores).forEach(pubScores => {
        const safePubScores = pubScores || {};
        Object.values(safePubScores).forEach(critScores => {
            const safeCritScores = Array.isArray(critScores) ? critScores : [];
            const myScore = safeCritScores.find(s => s.userId === user?.uid);
            if (myScore && myScore.value != null) {
                pubsRated.add(myScore.pubId);
                if (myScore.type === 'scale' && myScore.value === 10) perfectTens++;
                if (myScore.type === 'text' && myScore.value.toString().trim().length > 0) writtenReviews++;
            }
        });
    });

    const safePubs = Array.isArray(pubs) ? pubs : [];
    const pubsAdded = safePubs.filter(p => p.addedBy === user?.uid).length;
    const ratedCount = pubsRated.size;

    const badges = gamification.badges && gamification.badges.length > 0 ? gamification.badges.map(b => {
        let earned = false;
        if (b.metric === 'rated') earned = ratedCount >= b.threshold;
        else if (b.metric === 'reviews') earned = writtenReviews >= b.threshold;
        else if (b.metric === 'added') earned = pubsAdded >= b.threshold;
        else if (b.metric === 'tens') earned = perfectTens >= b.threshold;
        else if (b.metric === 'crawls') earned = crawlsCreated >= b.threshold;
        return { ...b, earned };
    }) : [
        { emoji: '🍻', title: 'First Pint', desc: 'Rated your first pub', earned: ratedCount >= 1 },
        { emoji: '🥇', title: 'Gold Pint', desc: 'Rated 20+ pubs', earned: ratedCount >= 20 }
    ];

    const handleSave = async (e) => {
        e.preventDefault();
        if(!user?.uid) return;
        setSaving(true);

        // Sanitize the Avatar URL
        let safeAvatarUrl = avatarUrl.trim();
        if (safeAvatarUrl && !safeAvatarUrl.startsWith('http://') && !safeAvatarUrl.startsWith('https://')) {
            alert("Avatar URL must start with http:// or https://");
            setSaving(false);
            return;
        }

        try {
            await db.collection("users").doc(user.uid).update({
                nickname: nickname.trim() || firebase.firestore.FieldValue.delete(),
                avatarUrl: safeAvatarUrl || firebase.firestore.FieldValue.delete(),
                bio: bio.trim() || firebase.firestore.FieldValue.delete(),
            });
            setTimeout(() => { onClose(); }, 500);
        } catch (e) { console.error(e); } 
        finally { setSaving(false); }
    };
    
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition">✕</button>

                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Edit Profile</h3>
        
                <form onSubmit={handleSave} className="space-y-4 mb-8 border-b border-gray-100 dark:border-gray-800 pb-8">
                    <div className="flex items-center gap-4 mb-2">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Preview" className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white dark:border-gray-800" onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-sm">
                                {(userProfile?.displayName || user?.email || "U").charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Account Email</label>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{user?.email}</p>
                        </div>
                    </div>
            
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Display Name</label>
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors" />
                    </div>
            
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Avatar URL</label>
                        <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Bio</label>
                        <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} maxLength="40" placeholder="e.g. Pale Ale Enthusiast" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors" />
                    </div>
            
                    <div className="pt-3">
                        <button type="submit" disabled={saving} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition shadow-sm disabled:opacity-50">
                            {saving ? "Saving..." : "Save Details"}
                        </button>
                    </div>
                </form>

                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 text-center">Your Stats</h4>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center">
                        <p className="text-xl font-black text-gray-900 dark:text-white">{ratedCount}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Rated</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center">
                        <p className="text-xl font-black text-gray-900 dark:text-white">{writtenReviews}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Reviews</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center">
                        <p className="text-xl font-black text-gray-900 dark:text-white">{crawlsCreated}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Crawls</p>
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 text-center">Trophy Cabinet</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {badges.map((badge, idx) => (
                            <div key={idx} className={`flex flex-col items-center p-3 rounded-2xl text-center transition-all ${badge.earned ? 'bg-amber-50 dark:bg-amber-900/20 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 opacity-50 grayscale'}`} title={badge.desc}>
                                <span className="text-2xl mb-1">{badge.emoji}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${badge.earned ? 'text-amber-700 dark:text-amber-500' : 'text-gray-400'}`}>{badge.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}