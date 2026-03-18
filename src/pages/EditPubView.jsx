import React, { useState } from 'react';

export default function EditPubView({ pub, onBack, onSave }) {
    const [name, setName] = useState(pub.name);
    const [location, setLocation] = useState(pub.location);
    const [lat, setLat] = useState(pub.lat || "");
    const [lng, setLng] = useState(pub.lng || "");
    const [photoURL, setPhotoURL] = useState(pub.photoURL || "");
    const [googleLink, setGoogleLink] = useState(pub.googleLink || "");
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(pub.id, name, location, lat, lng, photoURL, googleLink);
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Pub</h2>
        
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Pub Name"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Location"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="Latitude"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="Longitude"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="Photo URL"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="url"
                    value={googleLink}
                    onChange={(e) => setGoogleLink(e.target.value)}
                    placeholder="Google Maps Link"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
        
                <div className="flex gap-3">
                    <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg font-semibold hover:bg-gray-500 transition"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}