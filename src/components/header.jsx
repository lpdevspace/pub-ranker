import React, { useState } from 'react';
import { firebase } from '../firebase'; // Need this for the FieldValue delete in ProfileModal

export default function Header({ user, page, setPage, canManageGroup, groupName, onSwitchGroup, auth, db, userProfile }) {
    const [showProfile, setShowProfile] = useState(false);
    
    const NavButton = ({ name, targetPage }) => {
        const isActive = page === targetPage;
        return (
            <button
                onClick={() => setPage(targetPage)}
                className={"px-4 py-2 rounded-lg font-semibold transition " + (isActive ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200")}
            >
                {name}
            </button>
        );
    };
    
    const displayName = userProfile?.nickname || userProfile?.displayName || user?.email || "User";
    const avatarUrl = userProfile?.avatarUrl || "";
    
    const handleSignOut = async () => {
        try {
            await auth.signOut();
        } catch (e) {
            console.error("Error signing out", e);
        }
    };
    
    return (
        <>
            <header className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-gray-800">Pub Ranker</h1>
                    <span className="text-lg text-blue-700 font-semibold">{groupName}</span>
                </div>
        
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <nav className="flex items-center flex-wrap gap-2">
                        <NavButton name="Dashboard" targetPage="dashboard" />
                        <NavButton name="Pubs" targetPage="pubs" />
                        <NavButton name="Pubs to Visit" targetPage="toVisit" />
                        <NavButton name="Map" targetPage="map" />
                        <NavButton name="Ranking Breakdown" targetPage="individual" />
                        <NavButton name="Spin the Wheel" targetPage="spin" />
                        <NavButton name="Hall of Fame" targetPage="leaderboard" />
                        {canManageGroup && (
                            <NavButton name="Manage Group" targetPage="admin" />
                        )}
                    </nav>
            
                    <div className="flex items-center border-l-2 border-gray-200 pl-4 ml-0 md:ml-2 gap-3">
                        <button onClick={onSwitchGroup} className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm" title="Switch, Join, or Create Group">
                            Switch Group
                        </button>
            
                        <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900" title="View and edit your profile">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-gray-300" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="flex flex-col items-start">
                                <span className="font-semibold">{displayName}</span>
                                <span className="text-xs text-gray-500">{user?.email}</span>
                            </span>
                        </button>
            
                        <button onClick={handleSignOut} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition text-sm">
                            Log Out
                        </button>
                    </div>
                </div>
            </header>
        
            {showProfile && (
                <ProfileModal user={user} userProfile={userProfile} db={db} onClose={() => setShowProfile(false)} />
            )}
        </>
    );
}

function ProfileModal({ user, userProfile, db, onClose }) {
    const [nickname, setNickname] = useState(userProfile?.nickname || "");
    const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || "");
    const [bio, setBio] = useState(userProfile?.bio || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    
    const handleSave = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setSaving(true);
    
        try {
            const userRef = db.collection("users").doc(user.uid);
            await userRef.update({
                nickname: nickname.trim() || firebase.firestore.FieldValue.delete(),
                avatarUrl: avatarUrl.trim() || firebase.firestore.FieldValue.delete(),
                bio: bio.trim() || firebase.firestore.FieldValue.delete(),
            });
            setMessage("Profile updated.");
            setTimeout(() => { onClose(); }, 600);
        } catch (e) {
            console.error("Error updating profile", e);
            setError("Could not save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div className="modal-backdrop">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Your Profile</h3>
        
                {error && <p className="text-sm text-red-500">{error}</p>}
                {message && <p className="text-sm text-green-600">{message}</p>}
        
                <form onSubmit={handleSave} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Name (from sign-in)</label>
                        <p className="text-sm text-gray-800">{userProfile?.displayName || user?.email || "Unknown user"}</p>
                    </div>
            
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nickname (shown in app)</label>
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Pool Shark, Craft Queen" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
            
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Avatar URL</label>
                        <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Paste an image link (optional)" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <p className="text-xs text-gray-500 mt-1">Use a square image for best results.</p>
                        {avatarUrl && (
                            <div className="mt-2 flex items-center gap-2">
                                <img src={avatarUrl} alt="Avatar preview" className="w-12 h-12 rounded-full object-cover border border-gray-300" onError={(e) => { e.target.style.display = "none"; }} />
                                <span className="text-xs text-gray-500">Preview</span>
                            </div>
                        )}
                    </div>
            
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Bio</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Short description (e.g. IPA fan, loves darts and pool)." className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
            
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800" disabled={saving}>Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}