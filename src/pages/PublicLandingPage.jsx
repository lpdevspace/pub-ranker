import React, { useState, useEffect } from 'react';
import PintGlassLogo from '../components/PintGlassLogo';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import { DEMO_PUBLIC_GROUPS } from '../data/demoGroups';
import PublicFooter from '../components/PublicFooter';
import { useAuth } from '../context/AuthContext';
import { 
    Beer, 
    Trophy, 
    Navigation, 
    Sparkles, 
    ArrowRight, 
    Flame, 
    MapPin, 
    Users,
    CheckCircle2
} from 'lucide-react';

export default function PublicLandingPage({ db, onLoginClick }) {
    const { enableDemoMode } = useAuth();
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
        <div className="min-h-screen bg-[var(--color-bg)] flex flex-col relative overflow-hidden text-[var(--color-text)]">
            <SEO title="Pub Ranker — Stop arguing. Start ranking." path="/" />

            {/* Glowing background ambient lights */}
            <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[350px] right-[-100px] w-[500px] h-[400px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Top Navigation */}
            <header className="w-full px-6 py-4 flex justify-between items-center z-10 max-w-[1560px] mx-auto">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/25">
                        <Beer className="w-5 h-5 text-slate-950 font-black fill-current" />
                    </div>
                    <span className="font-display font-extrabold text-xl tracking-tight text-[var(--color-text)]">
                        Pub Ranker
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Link 
                        to="/for-pubs" 
                        className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition px-3 py-1.5 hidden sm:inline-block"
                    >
                        For Venues
                    </Link>
                    <button 
                        onClick={onLoginClick} 
                        className="btn-fun-secondary !text-xs !py-1.5 !px-4"
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={enableDemoMode} 
                        className="btn-fun-primary !text-xs !py-1.5 !px-4 hidden sm:inline-flex"
                    >
                        ⚡ Live Demo
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 z-10 flex flex-col items-center text-center">
                
                {/* Pill Announcement */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-wider mb-8 animate-float">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pub Ranker V2 · The Modern Social Leaderboard</span>
                </div>

                {/* Big Display Headline */}
                <h1 className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight max-w-3xl leading-[1.08] mb-6">
                    Stop arguing.<br />
                    <span className="fun-gradient-text">Start ranking.</span>
                </h1>

                <p className="text-[var(--color-text-muted)] text-lg sm:text-xl max-w-2xl font-medium mb-10 leading-relaxed">
                    The ultimate social app for pub lovers. Rate local watering holes, plan optimal crawls with turn-by-turn routes, track the Guinness Index, and settle the pub debate once and for all.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md mb-16">
                    <button 
                        onClick={enableDemoMode}
                        className="btn-fun-primary w-full sm:w-auto flex-1 !py-3.5 !text-base font-extrabold shadow-xl"
                    >
                        <span>🍺 Explore Live Demo</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onLoginClick}
                        className="btn-fun-secondary w-full sm:w-auto flex-1 !py-3.5 !text-base font-bold"
                    >
                        Create Group Free
                    </button>
                </div>

                {/* Bento Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mb-20">
                    {/* Bento 1: Custom Ranking */}
                    <div className="card-fun p-6 flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mb-5">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Group Leaderboards</h3>
                            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                                Rate on Ale, Atmosphere, Guinness, and Pint Price. Custom weighted scoring ensures fairness for the whole squad.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-[var(--color-divider)] flex items-center gap-2 text-xs font-bold text-amber-500">
                            <Flame className="w-4 h-4" />
                            <span>100% Democratic Scoring</span>
                        </div>
                    </div>

                    {/* Bento 2: Crawl Routes */}
                    <div className="card-fun p-6 flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-5">
                                <Navigation className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">OSRM Crawl Planner</h3>
                            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                                Select top spots and generate real walking directions with turn-by-turn guidance and distance metrics.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-[var(--color-divider)] flex items-center gap-2 text-xs font-bold text-purple-400">
                            <Sparkles className="w-4 h-4" />
                            <span>Smart Waypoint Calculation</span>
                        </div>
                    </div>

                    {/* Bento 3: Guinness Index */}
                    <div className="card-fun p-6 flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5">
                                <Beer className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">The Guinness Index</h3>
                            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                                Crown the undisputed best pour in your city with our dedicated stout tracking and pint price breakdown.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-[var(--color-divider)] flex items-center gap-2 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Live Pint Price Tracker</span>
                        </div>
                    </div>
                </div>

                {/* Explore Public Collectives Section */}
                <div id="explore" className="w-full card-fun p-8 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold">Discover Public Collectives</h2>
                            <p className="text-sm text-[var(--color-text-muted)]">Check out how other friend groups and societies rate their pubs.</p>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Filter by city (e.g. London)" 
                            value={searchCity}
                            onChange={e => setSearchCity(e.target.value)}
                            className="w-full sm:w-64"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredGroups.map(group => (
                            <div 
                                key={group.id}
                                className="p-4 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-amber-500/40 transition flex items-center justify-between cursor-pointer"
                                onClick={enableDemoMode}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-sm">
                                        🍺
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--color-text)] truncate max-w-[160px]">{group.name || group.groupName}</h4>
                                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                                            <MapPin className="w-3 h-3 text-amber-500" />
                                            <span>{group.city || 'United Kingdom'}</span>
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                            </div>
                        ))}
                    </div>
                </div>

            </main>

            <PublicFooter />
        </div>
    );
}
