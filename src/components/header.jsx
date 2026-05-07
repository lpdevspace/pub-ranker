import React, { useState, useEffect, useRef, useMemo } from 'react';
import { firebase } from '../firebase';
import { getUserDisplayName } from '../utils/users';

// ── Animated SVG dark-mode toggle ──────────────────────────────────────────
// Shows a crisp sun in light mode, a crescent moon in dark mode.
// `size` controls width/height in px. Inherits colour via currentColor.
function DarkModeToggle({ isDarkMode, onToggle, size = 20 }) {
    return (
        <button
            onClick={onToggle}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ width: 36, height: 36 }}
            className="flex items-center justify-center rounded-full text-gray-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 dark:text-gray-400 transition-all duration-200"
        >
            {isDarkMode ? (
                // Sun — shown when currently in dark mode (click to go light)
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1"  x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1"  y1="12" x2="3"  y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
                </svg>
            ) : (
                // Moon — shown when currently in light mode (click to go dark)
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            )}
        </button>
    );
}

// ── Pint-glass SVG logo mark ────────────────────────────────────────────────
function PintMark({ size = 28 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 40" fill="none" aria-hidden="true">
            {/* Glass body */}
            <path d="M6 4 L4 36 Q4 38 6 38 L26 38 Q28 38 28 36 L26 4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
            {/* Foam top */}
            <path d="M7 4 Q10 1 13 4 Q16 7 19 4 Q22 1 25 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Beer fill */}
            <path d="M8 14 L7.5 36 Q7.5 37 8.5 37 L23.5 37 Q24.5 37 24.5 36 L24 14 Z" fill="currentColor" opacity="0.15" />
        </svg>
    );
}

export default function Header({ user, page, setPage, canManageGroup, groupName, onSwitchGroup, auth, db, userProfile, isDarkMode, toggleDarkMode, scores = {}, pubs = [], criteria = [], groupId }) {
    const [showProfile, setShowProfile] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);

    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;
    const displayName = userProfile?.nickname || userProfile?.displayName || user?.email || 'User';
    const avatarUrl = userProfile?.avatarUrl || '';

    // Global search
    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (q.length < 2) return [];
        return pubs
            .filter(p => p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q))
            .slice(0, 8)
            .map(p => ({ ...p, isVisited: p.status === 'visited' }));
    }, [searchQuery, pubs]);

    useEffect(() => {
        if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
        else setSearchQuery('');
    }, [showSearch]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setShowSearch(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleSignOut = async () => {
        try { await auth.signOut(); }
        catch (e) { console.error('Error signing out', e); }
    };

    const NavButton = ({ name, targetPage, icon }) => {
        const isActive = page === targetPage;
        return (
            <button
                onClick={() => setPage(targetPage)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive
                        ? 'bg-amber-600 text-white shadow-sm scale-[1.02]'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400'
                }`}
            >
                <span className="text-base">{icon}</span>
                <span>{name}</span>
            </button>
        );
    };

    const bottomNavItems = [
        { icon: '📊', label: 'Dashboard', page: 'dashboard' },
        { icon: '🍻', label: 'Pubs',      page: 'pubs' },
        { icon: '🗺️', label: 'Map',       page: 'map' },
        { icon: '🏆', label: 'Rankings',  page: 'leaderboard' },
        { icon: '☰',  label: 'More',      page: '__more__' },
    ];

    return (
        <>
            {/* ── GLOBAL SEARCH OVERLAY ── */}
            {showSearch && (
                <div
                    className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
                    onClick={() => setShowSearch(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400 flex-shrink-0" aria-hidden="true">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search pubs by name or location…"
                                className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-base focus:outline-none"
                            />
                            <button onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-bold text-sm transition">ESC</button>
                        </div>
                        {searchQuery.length >= 2 && (
                            <div className="max-h-80 overflow-y-auto">
                                {searchResults.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-gray-400 text-sm">No pubs found for "{searchQuery}"</div>
                                ) : (
                                    searchResults.map(pub => (
                                        <button
                                            key={pub.id}
                                            onClick={() => { setPage(pub.isVisited ? 'pubs' : 'toVisit'); setShowSearch(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition text-left border-b border-gray-50 dark:border-gray-800 last:border-0"
                                        >
                                            {pub.photoURL ? (
                                                <img src={pub.photoURL} alt={pub.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" loading="lazy" width="40" height="40" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-lg flex-shrink-0">🍺</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{pub.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{pub.location || 'No location'}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                pub.isVisited
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                                {pub.isVisited ? 'Visited' : 'To Visit'}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        {searchQuery.length < 2 && (
                            <div className="px-4 py-6 text-center text-gray-400 text-sm">Type at least 2 characters to search</div>
                        )}
                    </div>
                </div>
            )}

            {/* ── HEADER ── */}
            <header className="sticky top-0 z-[100] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 mb-6 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Top Bar */}
                    <div className="flex justify-between items-center h-16">

                        {/* Logo */}
                        <div className="flex items-center gap-2.5 pr-4 min-w-0">
                            <span className="text-amber-600 dark:text-amber-400 flex-shrink-0">
                                <PintMark size={28} />
                            </span>
                            <div className="flex flex-col justify-center min-w-0">
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate leading-tight">
                                    Pub Ranker
                                </h1>
                                {groupName && (
                                    <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest truncate">
                                        {groupName}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Desktop Controls */}
                        <div className="hidden md:flex items-center gap-1">
                            {/* Search */}
                            <button
                                onClick={() => setShowSearch(true)}
                                aria-label="Search pubs"
                                title="Search pubs (⌘K)"
                                className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                </svg>
                            </button>

                            {/* Dark mode toggle — SVG sun/moon */}
                            <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />

                            {canManageGroup && (
                                <button
                                    onClick={() => setPage('admin')}
                                    aria-label="Group admin"
                                    title="Group Admin"
                                    className={`flex items-center justify-center w-9 h-9 rounded-full transition ${
                                        page === 'admin'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
                                    }`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
                                    </svg>
                                </button>
                            )}

                            {isStaff && (
                                <button
                                    onClick={() => setPage('superadmin')}
                                    aria-label="Staff menu"
                                    title="Staff Menu"
                                    className={`flex items-center justify-center w-9 h-9 rounded-full transition ${
                                        page === 'superadmin'
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
                                    }`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </button>
                            )}

                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                            {/* Switch group */}
                            <button
                                onClick={onSwitchGroup}
                                title="Switch Group"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                    <path d="M17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                    <path d="M7 23 3 19l4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                </svg>
                                <span className="hidden lg:inline">Switch</span>
                            </button>

                            {/* For Venues pill */}
                            <button
                                onClick={() => setPage('business')}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-black uppercase tracking-wider transition shadow-sm"
                            >
                                For Venues
                            </button>

                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                            {/* Avatar / profile */}
                            <button
                                onClick={() => setShowProfile(true)}
                                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                aria-label="Open profile"
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover shadow-sm" loading="lazy" width="28" height="28" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 truncate max-w-[100px]">
                                    {displayName.split(' ')[0]}
                                </span>
                            </button>

                            {/* Sign out */}
                            <button
                                onClick={handleSignOut}
                                aria-label="Sign out"
                                title="Sign out"
                                className="flex items-center justify-center w-9 h-9 rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition"
                            >
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>

                        {/* Mobile Controls — search + dark toggle + avatar */}
                        <div className="md:hidden flex items-center gap-1">
                            <button
                                onClick={() => setShowSearch(true)}
                                aria-label="Search pubs"
                                className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                </svg>
                            </button>

                            {/* Dark mode toggle visible in mobile header too */}
                            <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} size={18} />

                            <button
                                onClick={() => setShowProfile(true)}
                                aria-label="Open profile"
                                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shadow-sm"
                            >
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" width="32" height="32" />
                                    : <div className="w-full h-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs">{displayName.charAt(0).toUpperCase()}</div>
                                }
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Nav row */}
                    <div className="py-2.5 flex overflow-x-auto gap-1 hide-scrollbar items-center border-t border-gray-100 dark:border-gray-800/50">
                        <NavButton name="Dashboard"  targetPage="dashboard"  icon="📊" />
                        <NavButton name="Taproom"    targetPage="taproom"    icon="📱" />
                        <NavButton name="Directory"  targetPage="pubs"       icon="🍻" />
                        <NavButton name="Hit List"   targetPage="toVisit"    icon="🎯" />
                        <NavButton name="Insights"   targetPage="insights"   icon="📈" />
                        <NavButton name="Events"     targetPage="events"     icon="📅" />
                        <NavButton name="Map"        targetPage="map"        icon="🗺️" />
                        <NavButton name="Leaderboard" targetPage="leaderboard" icon="🏆" />
                        <NavButton name="Versus"     targetPage="individual" icon="🥊" />
                        <NavButton name="Spin"       targetPage="spin"       icon="🎡" />
                        <NavButton name="Feedback"   targetPage="feedback"   icon="💬" />
                    </div>
                </div>
            </header>

            {/* ── Mobile Bottom Navigation ── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 safe-area-bottom" aria-label="Primary navigation">
                <div className="flex items-stretch h-16">
                    {bottomNavItems.map(item => {
                        if (item.page === '__more__') {
                            return (
                                <button
                                    key="more"
                                    onClick={() => setIsNavOpen(!isNavOpen)}
                                    aria-label="More navigation options"
                                    aria-expanded={isNavOpen}
                                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                                        isNavOpen ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                >
                                    <span className="text-xl leading-none">{isNavOpen ? '✕' : '☰'}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">More</span>
                                </button>
                            );
                        }
                        const isActive = page === item.page;
                        return (
                            <button
                                key={item.page}
                                onClick={() => { setPage(item.page); setIsNavOpen(false); }}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                                    isActive
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <span className="text-xl leading-none">{item.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-amber-600 dark:bg-amber-400 rounded-full" />}
                            </button>
                        );
                    })}
                </div>

                {/* More drawer */}
                {isNavOpen && (
                    <div className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-2xl animate-fadeIn">
                        <div className="grid grid-cols-3 gap-1 p-3">
                            {[
                                { icon: '📱', label: 'Taproom',  page: 'taproom' },
                                { icon: '🎯', label: 'Hit List', page: 'toVisit' },
                                { icon: '📈', label: 'Insights', page: 'insights' },
                                { icon: '📅', label: 'Events',   page: 'events' },
                                { icon: '🥊', label: 'Versus',   page: 'individual' },
                                { icon: '🎡', label: 'Spin',     page: 'spin' },
                                { icon: '💬', label: 'Feedback', page: 'feedback' },
                                ...(canManageGroup ? [{ icon: '⚙️', label: 'Admin', page: 'admin' }] : []),
                                ...(isStaff ? [{ icon: '🛡️', label: 'Staff', page: 'superadmin' }] : []),
                            ].map(item => (
                                <button
                                    key={item.page}
                                    onClick={() => { setPage(item.page); setIsNavOpen(false); }}
                                    className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/10 transition"
                                >
                                    <span className="text-2xl">{item.icon}</span>
                                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">{item.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 px-3 pb-3">
                            <button
                                onClick={() => { toggleDarkMode(); setIsNavOpen(false); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-300 transition hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                                {isDarkMode ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                        <circle cx="12" cy="12" r="5" />
                                        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                    </svg>
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                    </svg>
                                )}
                                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                            </button>
                            <button
                                onClick={() => { onSwitchGroup(); setIsNavOpen(false); }}
                                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-300 transition hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                                🔄 Switch
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm font-bold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                                🚪 Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <style dangerouslySetInnerHTML={{__html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
                @media (max-width: 767px) { body { padding-bottom: 4.5rem; } }
            `}} />

            {showProfile && (
                <ProfileModal
                    user={user}
                    userProfile={userProfile}
                    db={db}
                    groupId={groupId}
                    onClose={() => setShowProfile(false)}
                    scores={scores}
                    pubs={pubs}
                />
            )}
        </>
    );
}

// ── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ user, userProfile, db, groupId, onClose, scores = {}, pubs = [] }) {
    const sanitizeAvatarUrl = (value) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return '';
        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
        } catch { return ''; }
        return '';
    };

    const [nickname, setNickname] = useState(userProfile?.nickname || '');
    const [avatarUrl, setAvatarUrl] = useState(sanitizeAvatarUrl(userProfile?.avatarUrl || ''));
    const [bio, setBio] = useState(userProfile?.bio || '');
    const [saving, setSaving] = useState(false);
    const [gamification, setGamification] = useState({ badges: [] });
    const [crawlsCreated, setCrawlsCreated] = useState(0);

    useEffect(() => {
        if (!db) return;
        db.collection('global').doc('gamification').get().then(doc => {
            if (doc.exists && doc.data()) setGamification(doc.data());
        });
    }, [db]);

    useEffect(() => {
        if (!db || !groupId || !user) return;
        db.collection('crawls')
            .where('groupId', '==', groupId)
            .where('createdBy', '==', user.uid)
            .get()
            .then(snap => setCrawlsCreated(snap.size));
    }, [db, groupId, user]);

    let pubsRated = new Set(); let perfectTens = 0; let writtenReviews = 0;
    const safeScores = scores || {};
    Object.values(safeScores).forEach(pubScores => {
        Object.values(pubScores || {}).forEach(critScores => {
            const myScore = (Array.isArray(critScores) ? critScores : []).find(s => s.userId === user?.uid);
            if (myScore?.value != null) {
                pubsRated.add(myScore.pubId);
                if (myScore.type === 'scale' && myScore.value === 10) perfectTens++;
                if (myScore.type === 'text' && myScore.value.toString().trim().length > 0) writtenReviews++;
            }
        });
    });
    const safePubs = Array.isArray(pubs) ? pubs : [];
    const pubsAdded = safePubs.filter(p => p.addedBy === user?.uid).length;
    const ratedCount = pubsRated.size;

    const badges = gamification.badges?.length > 0
        ? gamification.badges.map(b => {
            let earned = false;
            if (b.metric === 'rated')   earned = ratedCount >= b.threshold;
            else if (b.metric === 'reviews') earned = writtenReviews >= b.threshold;
            else if (b.metric === 'added')   earned = pubsAdded >= b.threshold;
            else if (b.metric === 'tens')    earned = perfectTens >= b.threshold;
            else if (b.metric === 'crawls')  earned = crawlsCreated >= b.threshold;
            return { ...b, earned };
          })
        : [
            { emoji: '🍻', title: 'First Pint', desc: 'Rated your first pub', earned: ratedCount >= 1 },
            { emoji: '🥇', title: 'Gold Pint',  desc: 'Rated 20+ pubs',       earned: ratedCount >= 20 },
          ];

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user?.uid) return;
        setSaving(true);
        let safeUrl = avatarUrl.trim();
        if (safeUrl && !safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
            alert('Avatar URL must start with http:// or https://');
            setSaving(false);
            return;
        }
        try {
            await db.collection('users').doc(user.uid).update({
                nickname: nickname.trim() || firebase.firestore.FieldValue.delete(),
                avatarUrl: safeUrl || firebase.firestore.FieldValue.delete(),
                bio: bio.trim() || firebase.firestore.FieldValue.delete(),
            });
            setTimeout(() => onClose(), 500);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} aria-label="Close profile" className="absolute top-5 right-5 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition">✕</button>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Edit Profile</h3>
                <form onSubmit={handleSave} className="space-y-4 mb-8 border-b border-gray-100 dark:border-gray-800 pb-8">
                    <div className="flex items-center gap-4 mb-2">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Preview" className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white dark:border-gray-800" onError={e => e.target.style.display = 'none'} loading="lazy" width="56" height="56" />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-white text-xl font-black shadow-sm">
                                {(userProfile?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Account Email</label>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{user?.email}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Display Name</label>
                        <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Avatar URL</label>
                        <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(sanitizeAvatarUrl(e.target.value))} placeholder="https://…" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Bio</label>
                        <input type="text" value={bio} onChange={e => setBio(e.target.value)} maxLength="40" placeholder="e.g. Pale Ale Enthusiast" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors" />
                    </div>
                    <div className="pt-3">
                        <button type="submit" disabled={saving} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save Details'}
                        </button>
                    </div>
                </form>
                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 text-center">Your Stats</h4>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center"><p className="text-xl font-black text-gray-900 dark:text-white">{ratedCount}</p><p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Rated</p></div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center"><p className="text-xl font-black text-gray-900 dark:text-white">{writtenReviews}</p><p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Reviews</p></div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center"><p className="text-xl font-black text-gray-900 dark:text-white">{crawlsCreated}</p><p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Crawls</p></div>
                </div>
                <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 text-center">Trophy Cabinet</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {badges.map((badge, idx) => (
                            <div
                                key={idx}
                                className={`flex flex-col items-center p-3 rounded-2xl text-center transition-all ${badge.earned ? 'bg-amber-50 dark:bg-amber-900/20 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 opacity-50 grayscale'}`}
                                title={badge.desc}
                            >
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
