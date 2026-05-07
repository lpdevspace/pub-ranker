import { useState, useEffect } from 'react';

export default function PublicLandingPage({ db, onLoginClick }) {
    const [publicGroups, setPublicGroups] = useState([]);
    const [searchCity, setSearchCity] = useState('');
    const [previewGroup, setPreviewGroup] = useState(null);
    const [previewPubs, setPreviewPubs] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        db.collection('groups')
            .where('isPublic', '==', true)
            .limit(20)
            .get()
            .then(snap =>
                setPublicGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            )
            .catch(e => console.error('Error fetching public groups', e));
    }, [db]);

    const filteredGroups = publicGroups.filter(g =>
        !searchCity || (g.city && g.city.toLowerCase().includes(searchCity.toLowerCase()))
    );

    const handlePreview = async (group) => {
        setPreviewGroup(group);
        setLoadingPreview(true);
        try {
            const snap = await db.collection('groups').doc(group.id).collection('pubs').get();
            const fetchedPubs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedPubs.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
            setPreviewPubs(fetchedPubs.slice(0, 5));
        } catch (e) {
            console.error(e);
        }
        setLoadingPreview(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white animate-fadeIn relative">
            <header className="p-6 max-w-7xl mx-auto flex justify-between items-center relative z-10">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Pub Ranker
                </h1>
                <button
                    onClick={onLoginClick}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition shadow-md"
                >
                    Sign In
                </button>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center relative z-10">
                <span className="text-6xl md:text-8xl mb-6 block drop-shadow-lg">🍻</span>
                <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-gray-900 dark:text-white">
                    Stop arguing.<br />
                    <span className="text-blue-600 dark:text-blue-400">Start ranking.</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
                    The ultimate platform for you and your mates to rank, review, and map out the best pubs in your city.
                </p>
                <button
                    onClick={onLoginClick}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-black text-xl hover:scale-105 transition transform shadow-xl hover:shadow-blue-500/25"
                >
                    Create Your Free Group
                </button>
            </main>

            <section className="max-w-7xl mx-auto px-6 py-16">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 gap-4">
                    <h3 className="text-2xl font-bold">🌍 Explore Public City Leaderboards</h3>
                    <input
                        type="text"
                        placeholder="Search by City..."
                        value={searchCity}
                        onChange={e => setSearchCity(e.target.value)}
                        className="px-4 py-2 border dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64 shadow-sm"
                    />
                </div>

                {filteredGroups.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                            No public groups found. Be the first to put your city on the map!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGroups.map(group => (
                            <div
                                key={group.id}
                                onClick={() => handlePreview(group)}
                                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl transition transform hover:-translate-y-1 cursor-pointer group/card"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-4xl">
                                        {group.coverPhoto
                                            ? <img src={group.coverPhoto} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt="Cover" />
                                            : '🍻'}
                                    </div>
                                    <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider group-hover/card:bg-blue-600 group-hover/card:text-white transition">
                                        Preview Top 5
                                    </span>
                                </div>
                                <h4 className="text-xl font-black mb-1 truncate">{group.groupName}</h4>
                                <p className="text-blue-600 dark:text-blue-400 text-sm mb-4 font-bold tracking-wider uppercase">
                                    📍 {group.city || 'Global'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">Members</span>
                                        <span className="text-lg font-black">👥 {group.members?.length || 1}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">Pubs Ranked</span>
                                        <span className="text-lg font-black">🍺 {group.pubCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {previewGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full relative border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setPreviewGroup(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center"
                        >
                            ✕
                        </button>
                        <h3 className="text-2xl font-black mb-1">{previewGroup.groupName}'s Top Pubs</h3>
                        <p className="text-gray-500 text-sm mb-6">📍 {previewGroup.city}</p>
                        {loadingPreview ? (
                            <p className="text-center text-gray-500 my-8">Loading rankings...</p>
                        ) : (
                            <div className="space-y-3">
                                {previewPubs.length === 0 ? (
                                    <p className="text-gray-500 italic text-center">No pubs rated yet.</p>
                                ) : (
                                    previewPubs.map((pub, index) => (
                                        <div key={pub.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            {pub.photoURL && (
                                                <img src={pub.photoURL} alt={pub.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold truncate dark:text-white">{pub.name}</h4>
                                                <p className="text-xs text-gray-500 truncate">{pub.location}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">
                                Want to see the full scores or challenge their rankings?
                            </p>
                            <button
                                onClick={() => { setPreviewGroup(null); onLoginClick(); }}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-700 transition"
                            >
                                Sign Up to Join Group
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
