import React, { useState } from 'react';

const AVAILABLE_TAGS = [
    '🍺 Beer Garden', '🐕 Dog Friendly', '🎱 Pool Table', 
    '📺 Live Sports', '🎵 Live Music', '🍔 Food Served',
    '🎯 Darts', '🍷 Cocktails', '🔥 Open Fire'
];

export default function EditPubView({ pub, onBack, onSave }) {
    // --- NULL SAFETY NET ---
    const safePub = pub || {};
    
    const [name, setName] = useState(safePub.name || "");
    const [location, setLocation] = useState(safePub.location || "");
    const [lat, setLat] = useState(safePub.lat || "");
    const [lng, setLng] = useState(safePub.lng || "");
    const [photoURL, setPhotoURL] = useState(safePub.photoURL || "");
    const [googleLink, setGoogleLink] = useState(safePub.googleLink || "");
    
    const [tags, setTags] = useState(Array.isArray(safePub.tags) ? safePub.tags : []);
    
    const handleToggleTag = (tag) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(safePub.id, name, location, lat, lng, photoURL, googleLink, tags);
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl max-w-2xl mx-auto border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6">Edit Pub Details</h2>
        
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pub Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Red Lion" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">City / Area</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Latitude</label>
                        <input type="number" step="0.0000001" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="51.5074" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Longitude</label>
                        <input type="number" step="0.0000001" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-0.1278" className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Photo URL</label>
                    <input type="url" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Google Maps Link</label>
                    <input type="url" value={googleLink} onChange={(e) => setGoogleLink(e.target.value)} placeholder="https://maps.app.goo.gl/..." className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50 dark:bg-gray-700 dark:text-white" />
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-bold text-gray-800 dark:text-white mb-3">Amenities & Features</label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map(tag => {
                            const isSelected = tags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleToggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                        isSelected 
                                        ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300 shadow-sm transform scale-105' 
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>
        
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button type="submit" className="flex-1 bg-brand text-white py-3 rounded-xl font-black hover:opacity-80 transition shadow-md">
                        Save Changes
                    </button>
                    <button type="button" onClick={onBack} className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white py-3 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}