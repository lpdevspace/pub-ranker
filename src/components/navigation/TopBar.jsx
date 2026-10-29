import React, { useState, useRef, useEffect } from 'react';
import {
    Search,
    Moon,
    Sun,
    Radio,
    Shield,
    Store,
    LogOut,
    ChevronDown,
    Award,
    Users,
    Beer,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGroup } from '../../context/GroupContext';
import { useUI } from '../../context/UIContext';

export default function TopBar() {
    const { user, userProfile, isStaff, isVenueOwner, signOut } = useAuth();
    const { groupName, switchGroup, canManageGroup } = useGroup();
    const { isDarkMode, toggleDarkMode, openSearch, page, setPage, themeId, setThemeId, AVAILABLE_THEMES = [] } = useUI();

    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const themeMenuRef = useRef(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setIsProfileMenuOpen(false);
            }
            if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
                setIsThemeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = userProfile?.nickname || userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Member';
    const avatarInitial = displayName.charAt(0).toUpperCase();

    return (
        <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--color-border)] shadow-[var(--shadow-sm)] transition-colors duration-200 backdrop-blur-md">
            <div className="app-container h-16 flex items-center justify-between gap-4">
                {/* Brand & Active Group Pill */}
                <div 
                    className="flex items-center gap-3 cursor-pointer select-none group shrink-0" 
                    onClick={() => setPage('dashboard')}
                >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                        <Beer className="w-5 h-5 text-slate-950 font-black fill-current" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-[var(--color-text)]">
                                Pub Ranker
                            </span>
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                V2
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 -mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] transition truncate max-w-[140px] sm:max-w-[180px]">
                                {groupName}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Desktop Navigation Links (Capsule Segmented Controller) */}
                <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-inner">
                    {[
                        { key: 'dashboard',   label: 'Overview' },
                        { key: 'pubs',        label: 'Pubs' },
                        { key: 'leaderboard', label: 'Rankings' },
                        { key: 'crawl',       label: 'Crawl' },
                        { key: 'map',         label: 'Map' },
                        { key: 'activity',    label: 'Taproom' },
                    ].map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setPage(item.key)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                                page === item.key
                                    ? 'bg-[var(--color-brand)] text-[var(--color-text-inverse)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Quick Search Modern Pill */}
                    <button
                        onClick={openSearch}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] hover:border-amber-500/40 transition shadow-sm"
                        title="Search pubs or towns (Ctrl+K)"
                        aria-label="Search"
                    >
                        <Search className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden md:inline text-xs font-medium">Search pubs…</span>
                        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-faint)]">
                            ⌘K
                        </kbd>
                    </button>

                    {/* Theme Selector Dropdown */}
                    <div className="relative" ref={themeMenuRef}>
                        <button
                            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] hover:border-[var(--color-brand)] transition"
                            title="Select App Theme / Prototype"
                            aria-label="Theme Selector"
                        >
                            <span>{AVAILABLE_THEMES.find(t => t.id === themeId)?.emoji || '🎨'}</span>
                            <span className="hidden sm:inline font-bold text-xs">{AVAILABLE_THEMES.find(t => t.id === themeId)?.label || 'Theme'}</span>
                            <ChevronDown className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isThemeMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl z-50 animate-scaleIn">
                                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-divider)]">
                                    Theme Prototypes
                                </div>
                                {AVAILABLE_THEMES.map((theme) => {
                                    const isActive = theme.id === themeId;
                                    return (
                                        <button
                                            key={theme.id}
                                            onClick={() => {
                                                setThemeId(theme.id);
                                                setIsThemeMenuOpen(false);
                                            }}
                                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition ${
                                                isActive
                                                    ? 'bg-[var(--color-surface-2)] font-bold text-[var(--color-brand)]'
                                                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{theme.emoji}</span>
                                                <span>{theme.label}</span>
                                            </div>
                                            <div
                                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                                                style={{ backgroundColor: theme.bg }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Dark/Light Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition"
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        aria-label="Toggle dark mode"
                    >
                        {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                    </button>

                    {/* Live Taproom / Activity Feed */}
                    <button
                        onClick={() => setPage('activity')}
                        className={`p-2 rounded-full border transition ${
                            page === 'activity'
                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] border-[var(--color-border)]'
                        }`}
                        title="Live Activity & Taproom"
                        aria-label="Activity"
                    >
                        <Radio className="w-4 h-4" />
                    </button>

                    {/* Group Admin link (if manager) */}
                    {canManageGroup && (
                        <button
                            onClick={() => setPage('admin')}
                            className={`p-2 rounded-full border transition ${
                                page === 'admin'
                                    ? 'bg-amber-500/20 text-amber-500 font-bold border-amber-500/40'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] border-[var(--color-border)]'
                            }`}
                            title="Group Settings & Admin"
                            aria-label="Group Admin"
                        >
                            <Shield className="w-4 h-4" />
                        </button>
                    )}

                    {/* Venue Switch (for pub landlords / claim owners) */}
                    {isVenueOwner && (
                        <button
                            onClick={() => setPage('venues')}
                            className="hidden sm:inline-flex items-center gap-1.5 btn-fun-primary !py-1 !px-3 text-xs"
                        >
                            <Store className="w-3.5 h-3.5" />
                            <span>Venues</span>
                        </button>
                    )}

                    {/* User Profile & Menu */}
                    <div className="relative ml-1" ref={profileMenuRef}>
                        <button
                            onClick={() => setIsProfileMenuOpen(prev => !prev)}
                            className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-amber-500 transition"
                            aria-label="User menu"
                            aria-expanded={isProfileMenuOpen}
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--color-border)] shrink-0 flex items-center justify-center bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-xs select-none shadow-sm">
                                {userProfile?.avatarUrl ? (
                                    <img
                                        src={userProfile.avatarUrl}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    avatarInitial
                                )}
                            </div>
                            <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)] hidden sm:block" />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl py-2 z-50">
                                <div className="px-4 py-2.5 border-b border-[var(--color-divider)]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <p className="text-xs font-bold text-[var(--color-text)] truncate">{displayName}</p>
                                    </div>
                                    <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{user?.email}</p>
                                </div>

                                <div className="py-1.5">
                                    <button
                                        onClick={() => { setPage('leaderboard'); setIsProfileMenuOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition text-left"
                                    >
                                        <Award className="w-4 h-4 text-amber-500" />
                                        <span>My Badges & Standing</span>
                                    </button>

                                    <button
                                        onClick={() => { switchGroup(null); setIsProfileMenuOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition text-left"
                                    >
                                        <Users className="w-4 h-4 text-blue-500" />
                                        <span>Switch Group</span>
                                    </button>

                                    {isVenueOwner && (
                                        <button
                                            onClick={() => { setPage('venues'); setIsProfileMenuOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition text-left sm:hidden"
                                        >
                                            <Store className="w-4 h-4 text-amber-500" />
                                            <span>Venue Portal (B2B)</span>
                                        </button>
                                    )}

                                    {isStaff && (
                                        <button
                                            onClick={() => { setPage('superadmin'); setIsProfileMenuOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-400 hover:bg-[var(--color-surface-2)] transition text-left"
                                        >
                                            <Shield className="w-4 h-4" />
                                            <span>Platform SuperAdmin</span>
                                        </button>
                                    )}
                                </div>

                                <div className="border-t border-[var(--color-divider)] pt-1">
                                    <button
                                        onClick={() => { signOut(); setIsProfileMenuOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition text-left"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Log Out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
