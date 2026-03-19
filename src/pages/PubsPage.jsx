import React, { useState } from 'react';

export default function PubsPage({
    pubs,
    criteria,
    scores,
    onSelectPub,
    onSelectPubForEdit,
    canManageGroup,
    pubsRef,
    allUsers,
    currentUser,
    currentGroup,
    groupRef,
}) {
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [yesNoFilter, setYesNoFilter] = useState("");
    const [sortOption, setSortOption] = useState("highest");

    const handleDeleteScore = async (score) => {
        if (!groupRef || !score?.id) return;
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this rating?"
        );
        if (!confirmDelete) return;
        try {
            await groupRef.collection("scores").doc(score.id).delete();
        } catch (e) {
            console.error("Error deleting score", e);
        }
    };

    const handleDeletePub = async (pubId) => {
        if (!pubsRef || !pubId) return;
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this pub? This action cannot be undone."
        );
        if (!confirmDelete) return;
        try {
            await pubsRef.doc(pubId).delete();
            console.log("Pub deleted successfully");
        } catch (e) {
            console.error("Error deleting pub", e);
        }
    };

    function canDeleteScore(score, user, currentGroup) {
        if (!user || !currentGroup) return false;
        const isOwner = currentGroup.ownerUid === user.uid;
        const isManager = currentGroup.managers?.includes(user.uid);
        return isOwner || isManager;
    }

    const getUserName = (userId) => {
        const u = allUsers[userId];
        if (!u) return "Unknown User";
        return u.nickname || u.displayName || u.email || "Unknown User";
    };

    // Filter Logic
    const yesNoCriteria = criteria.filter((c) => c.type === "yes-no");

    const filteredPubs = pubs.filter((pub) => {
        const matchesSearch = pub.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (yesNoFilter) {
            const pubScores = scores[pub.id] ?? {};
            const criterionScores = pubScores[yesNoFilter] ?? [];
            const hasYes = criterionScores.some(s => s.type === 'yes-no' && s.value === true);
            if (!hasYes) return false;
        }
        return true;
    }).sort((a, b) => {
        if (sortOption === "highest") return b.avgScore - a.avgScore;
        if (sortOption === "lowest") return a.avgScore - b.avgScore;
        if (sortOption === "alphabetical") return a.name.localeCompare(b.name);
        if (sortOption === "newest") {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
        }
        return 0;
    });

    // Compute Breakdown for Selected Pub
    let breakdown = null;

    if (selectedPubForDetail) {
        const pub = selectedPubForDetail;
        const b = {};
        const pubScores = scores[pub.id] ?? {};
        
        criteria.forEach((crit) => {
            const criterionScores = pubScores[crit.id] ?? [];
            
            const mappedScores = criterionScores.map((s) => ({
                id: s.id,
                value: s.value,
                userId: s.userId,
                userName: getUserName(s.userId),
                type: s.type,
                criterionId: s.criterionId,
            }));

            if (criterionScores.length === 0) {
                b[crit.id] = {
                    name: crit.name,
                    type: crit.type,
                    scores: [],
                    average: 0,
                };
            } else {
                const usable = criterionScores.filter((s) => s.value != null);
                const sum = usable.reduce((acc, s) => {
                    if (s.type === "scale") return acc + s.value;
                    if (s.type === "price") return acc + s.value / 2;
                    return acc;
                }, 0);
                const avg = usable.length ? sum / usable.length : 0;
                
                b[crit.id] = {
                    name: crit.name,
                    type: crit.type,
                    scores: mappedScores,
                    average: avg,
                };
            }
        });
        breakdown = b;
    }

   return (
        <>
            {selectedPubForDetail && breakdown && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 overflow-y-auto transition-opacity duration-300">
                    {/* MODAL BACKGROUND */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative transition-colors duration-300">
                        <button 
                            onClick={() => setSelectedPubForDetail(null)}
                            className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
                        {selectedPubForDetail.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{selectedPubForDetail.location}</p>
                
                        <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <div>
                                <p className="text-sm text-blue-800 dark:text-blue-300 uppercase font-bold">Overall Rating</p>
                                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {selectedPubForDetail.avgScore.toFixed(1)}
                                </p>
                            </div>
                        </div>
                
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">Detailed Breakdown</h3>
                            {Object.values(breakdown).map((data) => (
                                <div key={data.name} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{data.name}</h4>
                                    {data.scores.length > 0 && (data.type === 'scale' || data.type === 'price') && (
                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {data.average.toFixed(1)}
                                    </span>
                                    )}
                                </div>
                        
                                {data.scores.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No ratings yet</p>
                                ) : (
                                    <div className="mt-3">
                                        {/* IF IT IS A TEXT REVIEW, RENDER AS CHAT BUBBLES */}
                                        {data.type === "text" ? (
                                            <div className="space-y-3">
                                                {data.scores.map((s) => (
                                                    <div key={s.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm relative">
                                                        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">{s.userName}</p>
                                                        <p className="text-gray-600 dark:text-gray-300 italic text-sm">"{s.value}"</p>
                                                        {canDeleteScore(s, currentUser, currentGroup) && (
                                                            <button
                                                                onClick={() => handleDeleteScore(s)}
                                                                className="absolute top-2 right-2 text-xs text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* IF IT IS A NORMAL NUMBER/BOOL RATING, RENDER AS STANDARD ROWS */
                                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                                {data.scores.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-600"
                                                    >
                                                        <span>
                                                            <span className="font-semibold dark:text-gray-200">{s.userName}:</span>{" "}
                                                            {data.type === "yes-no"
                                                                ? s.value ? "Yes" : "No"
                                                                : data.type === "currency"
                                                                ? `£${parseFloat(s.value).toFixed(2)}`
                                                                : s.value}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {canDeleteScore(s, currentUser, currentGroup) && (
                                                                <button
                                                                    className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                                                                    onClick={() => handleDeleteScore(s)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Visited Pubs</h2>
            
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Filter & Search</h3>
            
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                    />
            
                    {yesNoCriteria.length > 0 && (
                        <div>
                            <label className="block font-medium text-gray-600 dark:text-gray-300 mb-2">
                                Filter by Yes Criterion
                            </label>
                            <select
                                value={yesNoFilter}
                                onChange={(e) => setYesNoFilter(e.target.value)}
                                className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">All Pubs</option>
                                {yesNoCriteria.map((c) => (
                                    <option key={c.id} value={c.id}>
                                    {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block font-medium text-gray-600 dark:text-gray-300 mb-2">
                            Sort By
                        </label>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        >
                            <option value="highest">Highest Rated</option>
                            <option value="lowest">Lowest Rated</option>
                            <option value="alphabetical">Alphabetical (A-Z)</option>
                            <option value="newest">Newest Added</option>
                        </select>
                    </div>
                </div>
            
                <div className="space-y-3">
                    {filteredPubs.map((pub) => (
                    <div
                        key={pub.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                        <div className="flex flex-col sm:flex-row">
                        {pub.photoURL && (
                            <div className="sm:w-32 sm:h-32 h-40 overflow-hidden flex-shrink-0">
                            <img
                                src={pub.photoURL}
                                alt={pub.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                e.target.style.display = "none";
                                }}
                            />
                            </div>
                        )}
                        <div className="flex-1 p-4 flex flex-col justify-between">
                            <div className="mb-3">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {pub.name}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">{pub.location}</p>
                            <div className="mt-1">
                                <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-semibold">
                                    Score: {pub.avgScore.toFixed(1)} ({new Set(Object.values(scores[pub.id] || {}).flat().filter(s => s.type === 'scale' || s.type === 'price').map(s => s.userId)).size} ratings)
                                </span>
                            </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedPubForDetail(pub)}
                                className="bg-purple-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-purple-600 transition text-sm"
                            >
                                Details
                            </button>
                            <button
                                onClick={() => onSelectPub(pub)}
                                className="bg-blue-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-600 transition text-sm"
                            >
                                Rate
                            </button>
                            {canManageGroup && (
                                <>
                                <button
                                    onClick={() => onSelectPubForEdit(pub)}
                                    className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeletePub(pub.id)}
                                    className="bg-red-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                                >
                                    Delete
                                </button>
                                </>
                            )}
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
            
                {filteredPubs.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No pubs match your search.
                    </p>
                )}
            </div>
        </>
    );
    
}