import React, { useState } from 'react';

export default function PubsToVisitPage({ pubs, canManageGroup, onPromotePub, onSelectPubForEdit }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("alphabetical");

    const filteredPubs = pubs.filter(pub => 
        pub.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (sortOption === "alphabetical") return a.name.localeCompare(b.name);
        if (sortOption === "newest") {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
        }
        return 0;
    });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Pubs to Visit</h2>
        
            <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Filter & Search</h3>
                <input
                    type="text"
                    placeholder="Search pubs to visit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div>
                    <label className="block font-medium text-gray-600 mb-2">Sort By</label>
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="alphabetical">Alphabetical (A-Z)</option>
                        <option value="newest">Newest Added</option>
                    </select>
                </div>
            </div>

            <div className="space-y-3">
                {filteredPubs.length > 0 ? (
                filteredPubs.map((pub) => (
                    <div
                        key={pub.id}
                        className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">{pub.name}</h3>
                            <p className="text-gray-600">{pub.location}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a 
                                href={pub.googleLink || `http://googleusercontent.com/maps.google.com/${pub.lat ? pub.lat+','+pub.lng : encodeURIComponent(pub.name + ' ' + pub.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-200 transition"
                            >
                                Open in Maps
                            </a>
                            {canManageGroup && (
                            <>
                                <button
                                    onClick={() => onPromotePub(pub.id)}
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition"
                                >
                                    Mark Visited
                                </button>
                                <button
                                    onClick={() => onSelectPubForEdit(pub)}
                                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition"
                                >
                                    Edit
                                </button>
                            </>
                            )}
                        </div>
                    </div>
                ))
                ) : (
                <p className="text-gray-500 text-center py-8">
                    No pubs match your search or all have been visited!
                </p>
                )}
            </div>
        </div>
    );
}