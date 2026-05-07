import React, { useState, useEffect } from 'react';

const AVAILABLE_TAGS = [
    '🍺 Beer Garden', '🐕 Dog Friendly', '🎱 Pool Table', 
    '📺 Live Sports', '🎵 Live Music', '🍔 Food Served',
    '🎯 Darts', '🍷 Cocktails', '🔥 Open Fire'
];

export default function EditPubView({ pub, onBack, onSave }) {
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [googleLink, setGoogleLink] = useState("");
    const [tags, setTags] = useState([]);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        if (pub) {
            setName(pub.name || "");
            setLocation(pub.location || "");
            setLat(pub.lat != null ? pub.lat : ""); 
            setLng(pub.lng != null ? pub.lng : "");
            setPhotoURL(pub.photoURL || "");
            setGoogleLink(pub.googleLink || "");
            setTags(Array.isArray(pub.tags) ? pub.tags : []);
            setIsLocked(pub.isLocked || false);
        }
    }, [pub]);

    const handleToggleTag = (tag) => {
        setTags(prev => {
            const currentTags = Array.isArray(prev) ? prev : [];
            return currentTags.includes(tag) 
                ? currentTags.filter(t => t !== tag) 
                : [...currentTags, tag];
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!pub || !pub.id) return; 
        const finalTags = Array.isArray(tags) ? tags : [];
        onSave(pub.id, name, location, lat, lng, photoURL, googleLink, finalTags);
    };

    if (!pub || !pub.id) {
        return (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md mx-auto text-center border border-gray-200 dark:border-gray-700 mt-12 animate-fadeIn">
                <span className="text-5xl mb-4 block">🍺</span>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Loading Pub...</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">If this takes too long, please go back and try again.</p>
                <button onClick={onBack} className="bg-amber-600 text-white font-bold px-6 py-2 rounded-xl shadow hover:bg-amber-700 transition">Back to Directory</button>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl max-w-2xl mx-auto border border-gray-200 dark:border-gray-700 animate-fadeIn relative overflow-hidden">
            
            {isLocked && (
                <div className="bg-amber-700 text-white p-3 -mx-6 -mt-6 mb-6 flex items-center justify-center gap-2 shadow-md">
                    <span className="text-xl">🔒</span>
                    <p className="font-bold text-sm tracking-wide">This pub is officially verified. Core details are locked.</p>
                </div>
            )}

            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6">Edit Pub Details</h2>
        
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pub Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isLocked} placeholder="e.g. The Red Lion" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Location / Town</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} disabled={isLocked} placeholder="e.g. Wolverhampton" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Latitude</label>
                        <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} disabled={isLocked} placeholder="52.5" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Longitude</label>
                        <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} disabled={isLocked} placeholder="-2.1" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Photo URL</label>
                    <input type="url" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Google Maps Link</label>
                    <input type="url" value={googleLink} onChange={(e) => setGoogleLink(e.target.value)} disabled={isLocked} placeholder="https://maps.google.com/..." className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Amenities / Tags</label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => handleToggleTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                                    tags.includes(tag)
                                        ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                    <button type="submit" className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition shadow-md">Save Changes</button>
                </div>
            </form>
        </div>
    );
}
