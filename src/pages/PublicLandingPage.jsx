import React, { useState, useEffect } from 'react';
import PintGlassLogo from '../components/PintGlassLogo';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import { DEMO_PUBLIC_GROUPS } from '../data/demoGroups';
import PublicFooter from '../components/PublicFooter';

export default function PublicLandingPage({ db, onLoginClick }) {
    const [publicGroups, setPublicGroups] = useState([]);
    const [searchCity, setSearchCity] = useState('');

    useEffect(() => {
        db.collection('groups')
            .where('isPublic', '==', true)
            .limit(10)
            .get()
            .then(snap => {
                const real = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPublicGroups(real.length === 0 ? DEMO_PUBLIC_GROUPS : real);
            })
            .catch(() => {
                setPublicGroups(DEMO_PUBLIC_GROUPS);
            });
    }, [db]);

    const filteredGroups = publicGroups.filter(g =>
        !searchCity || (g.city && g.city.toLowerCase().includes(searchCity.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-surface flex flex-col relative overflow-hidden">
            <SEO title="Pub Ranker — Stop arguing. Start ranking." path="/" />

            {/* Subtle background effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Top Navigation */}
            <header className="w-full p-4 flex justify-between items-center z-10 relative">
                <div className="flex items-center gap-2">
                    <PintGlassLogo size={28} showText={false} />
                    <span className="font-display font-black text-xl text-text tracking-tight">Pub Ranker</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/for-pubs" className="text-sm font-semibold text-text-muted hover:text-text transition">For Pubs</Link>
                    <button onClick={onLoginClick} className="bg-brand text-white px-6 py-2 rounded-full font-bold hover:bg-brand-hover shadow-sm hover:shadow-md transition-all">
                        Log In
                    </button>
                </div>
            </header>

            {/* Main Content - Centered */}
            <main className="flex-1 flex items-center justify-center p-4 z-10 relative pb-20">
                <div className="w-full max-w-lg space-y-6">
                    
                    {/* The Main Card */}
                    <div className="card-premium p-8 text-center border-t-4 border-t-brand shadow-2xl">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-brand-subtle dark:bg-brand/10 rounded-2xl flex items-center justify-center">
                                <PintGlassLogo size={48} showText={false} />
                            </div>
                        </div>
                        
                        <h1 className="font-display text-4xl sm:text-5xl font-black text-text mb-4 leading-tight tracking-tight">
                            Stop arguing.<br/>
                            <span className="text-brand">Start ranking.</span>
                        </h1>
                        
                        <p className="text-text-muted text-base mb-8 max-w-sm mx-auto font-medium">
                            The ultimate leaderboard for your friend group. Rate your local pubs, find the best pint, and never debate where to go again.
                        </p>

                        <div className="space-y-3">
                            <button 
                                onClick={onLoginClick}
                                className="w-full bg-brand hover:bg-brand-hover text-white py-4 rounded-xl font-black text-lg transition-all shadow-md transform hover:-translate-y-0.5"
                            >
                                Start Ranking
                            </button>
                            
                            <a href="#explore" className="w-full block text-center bg-surface-offset hover:bg-surface border border-border text-text py-4 rounded-xl font-bold text-base transition-all shadow-sm">
                                Explore Live Leaderboards
                            </a>
                        </div>
                    </div>

                    {/* Explore Section (Quick list) */}
                    <div id="explore" className="card-premium p-6 mt-8">
                        <h2 className="text-lg font-bold text-text mb-4">Discover Public Groups</h2>
                        
                        <div className="mb-4">
                            <input 
                                type="text" 
                                placeholder="Search by city (e.g. London)" 
                                value={searchCity}
                                onChange={e => setSearchCity(e.target.value)}
                                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-brand bg-surface-offset text-text outline-none text-sm font-medium"
                            />
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredGroups.length > 0 ? (
                                filteredGroups.map(group => (
                                    <div key={group.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-surface-offset border border-transparent hover:border-border transition cursor-pointer">
                                        <div>
                                            <h4 className="font-bold text-sm text-text">{group.name}</h4>
                                            <p className="text-xs text-text-muted mt-0.5">{group.city || 'Anywhere'} • {group.memberCount || 0} members</p>
                                        </div>
                                        <button onClick={onLoginClick} className="text-xs font-bold text-brand bg-brand-subtle px-3 py-1.5 rounded-lg">
                                            View
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-text-muted text-center py-4 italic">No groups found in that city.</p>
                            )}
                        </div>
                    </div>

                </div>
            </main>
            
            <div className="mt-auto">
                <PublicFooter />
            </div>
        </div>
    );
}
