import React, { useState, useEffect, useRef, useMemo } from 'react';
import { firebase } from '../firebase';
import { getUserDisplayName } from '../utils/users';

// ── Dark mode toggle ──────────────────────────────────────────────────────────
function DarkModeToggle({ isDarkMode, onToggle, size = 20 }) {
    return (
        <button
            onClick={onToggle}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ width: 36, height: 36 }}
            className="flex items-center justify-center rounded-full text-text-muted hover:bg-brand-subtle dark:hover:bg-brand-highlight hover:text-brand dark:hover:text-brand dark:text-text-muted transition-all duration-200"
        >
            {isDarkMode ? (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
            ) : (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            )}
        </button>
    );
}

// ── Pint mark logo ────────────────────────────────────────────────────────────
function PintMark({ size = 28 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 40" fill="none" aria-hidden="true">
            <path d="M6 4 L4 36 Q4 38 6 38 L26 38 Q28 38 28 36 L26 4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
            <path d="M7 4 Q10 1 13 4 Q16 7 19 4 Q22 1 25 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M8 14 L7.5 36 Q7.5 37 8.5 37 L23.5 37 Q24.5 37 24.5 36 L24 14 Z" fill="currentColor" opacity="0.15" />
        </svg>
    );
}

// ── Nav icons (colour-neutral — inherits from sidebar-item active/default) ────
function NavIcon({ type, size = 16 }) {
    const cls = `flex-shrink-0`;
    switch (type) {
        case 'dashboard':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
            );
        case 'taproom':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            );
        case 'pubs':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1.5" x2="6" y2="4.5" />
                    <line x1="10" y1="1.5" x2="10" y2="4.5" />
                    <line x1="14" y1="1.5" x2="14" y2="4.5" />
                </svg>
            );
        case 'toVisit':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                </svg>
            );
        case 'insights':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                </svg>
            );
        case 'events':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            );
        case 'map':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" y1="3" x2="9" y2="18" />
                    <line x1="15" y1="6" x2="15" y2="21" />
                </svg>
            );
        case 'leaderboard':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M12 2a4 4 0 0 1 4 4v4.5A4.5 4.5 0 0 1 11.5 15h-3A4.5 4.5 0 0 1 4 10.5V6a4 4 0 0 1 4-4z" />
                </svg>
            );
        case 'individual':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
                    <path d="m13 19 6-6" />
                    <path d="m16 22 5-5" />
                    <path d="M19 5v3.5L14.5 13" />
                    <path d="M14 2h3v3" />
                </svg>
            );
        case 'achievements':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
            );
        case 'spin':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
            );
        case 'feedback':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M10 8h4" />
                    <path d="M12 6v4" />
                </svg>
            );
        case 'admin':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
                </svg>
            );
        case 'superadmin':
            return (
                <svg className={cls} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            );
        default:
            return <span aria-hidden="true">🍺</span>;
    }
}

// ── Main Header export ────────────────────────────────────────────────────────
export default function Header({ user, page, setPage, canManageGroup, groupName, onSwitchGroup, auth, db, userProfile, isDarkMode, toggleDarkMode, scores = {}, pubs = [], criteria = [], groupId }) {
    const [showProfile, setShowProfile] = useState(false);
    const [isNavOpen, setIsNavOpen]   = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);

    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;
    const displayName = userProfile?.nickname || userProfile?.displayName || user?.email || 'User';
    const avatarUrl   = userProfile?.avatarUrl || '';

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

    // Sidebar nav items split into sections
    const primaryNavItems = [
        { name: 'Dashboard',   page: 'dashboard' },
        { name: 'Taproom',     page: 'taproom' },
        { name: 'Directory',   page: 'pubs' },
        { name: 'Hit List',    page: 'toVisit' },
        { name: 'Map',         page: 'map' },
    ];
    const socialNavItems = [
        { name: 'Leaderboard', page: 'leaderboard' },
        { name: 'Versus',      page: 'individual' },
        { name: 'Achievements',page: 'achievements' },
    ];
    const extraNavItems = [
        { name: 'Insights',    page: 'insights' },
        { name: 'Events',      page: 'events' },
        { name: 'Spin',        page: 'spin' },
        { name: 'Feedback',    page: 'feedback' },
    ];

    // Bottom nav items for mobile
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
                    className="fixed inset-0 z-[300] backdrop-blur-sm flex items-start justify-center pt-24 px-4"
                    style={{ backgroundColor: 'var(--color-overlay)' }}
                    onClick={() => setShowSearch(false)}
                >
                    <div
                        className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            className="flex items-center gap-3 px-4 py-3"
                            style={{ borderBottom: '1px solid var(--color-divider)' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0" style={{ color: 'var(--color-text-faint)' }} aria-hidden="true">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search pubs by name or location…"
                                className="flex-1 bg-transparent text-base focus:outline-none"
                                style={{ color: 'var(--color-text)' }}
                            />
                            <button
                                onClick={() => setShowSearch(false)}
                                className="font-bold text-sm transition"
                                style={{ color: 'var(--color-text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                            >ESC</button>
                        </div>
                        {searchQuery.length >= 2 && (
                            <div className="max-h-80 overflow-y-auto">
                                {searchResults.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-faint)' }}>No pubs found for &ldquo;{searchQuery}&rdquo;</div>
                                ) : (
                                    searchResults.map(pub => (
                                        <button
                                            key={pub.id}
                                            onClick={() => { setPage(pub.isVisited ? 'pubs' : 'toVisit'); setShowSearch(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-subtle dark:hover:bg-brand-highlight transition text-left last:border-0"
                                            style={{ borderBottom: '1px solid var(--color-divider)' }}
                                        >
                                            {pub.photoURL ? (
                                                <img src={pub.photoURL} alt={pub.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" loading="lazy" width="40" height="40" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: 'var(--color-brand-subtle)' }}>🍺</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>{pub.name}</p>
                                                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{pub.location || 'No location'}</p>
                                            </div>
                                            <span
                                                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                style={pub.isVisited
                                                    ? { backgroundColor: 'var(--color-success-highlight)', color: 'var(--color-success)' }
                                                    : { backgroundColor: 'var(--color-brand-subtle)', color: 'var(--color-brand)' }
                                                }
                                            >
                                                {pub.isVisited ? 'Visited' : 'To Visit'}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        {searchQuery.length < 2 && (
                            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-faint)' }}>Type at least 2 characters to search</div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                DESKTOP SIDEBAR  (hidden on mobile)
            ══════════════════════════════════════════════════ */}
            <nav className="sidebar-nav hidden md:flex" aria-label="Primary navigation">

                {/* Brand / logo */}
                <div className="sidebar-brand">
                    <span className="text-brand flex-shrink-0"><PintMark size={26} /></span>
                    <div className="flex flex-col justify-center min-w-0">
                        <span className="text-base font-black tracking-tight leading-tight truncate" style={{ color: 'var(--color-text)' }}>
                            Pub Ranker
                        </span>
                        {groupName && (
                            <span className="text-xs text-brand font-bold uppercase tracking-widest truncate leading-tight">
                                {groupName}
                            </span>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-3">
                    <button
                        onClick={() => setShowSearch(true)}
                        aria-label="Search pubs"
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-brand-subtle dark:hover:bg-brand-highlight hover:text-brand transition"
                        style={{ backgroundColor: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <span>Search pubs…</span>
                    </button>
                </div>

                {/* Primary section */}
                <span className="sidebar-section-label">Main</span>
                {primaryNavItems.map(item => (
                    <button
                        key={item.page}
                        onClick={() => setPage(item.page)}
                        className={`sidebar-item${page === item.page ? ' active' : ''}`}
                        aria-current={page === item.page ? 'page' : undefined}
                    >
                        <span className="sidebar-icon"><NavIcon type={item.page} /></span>
                        <span>{item.name}</span>
                    </button>
                ))}

                {/* Social section */}
                <span className="sidebar-section-label">Social</span>
                {socialNavItems.map(item => (
                    <button
                        key={item.page}
                        onClick={() => setPage(item.page)}
                        className={`sidebar-item${page === item.page ? ' active' : ''}`}
                        aria-current={page === item.page ? 'page' : undefined}
                    >
                        <span className="sidebar-icon"><NavIcon type={item.page} /></span>
                        <span>{item.name}</span>
                    </button>
                ))}

                {/* Discover section */}
                <span className="sidebar-section-label">Discover</span>
                {extraNavItems.map(item => (
                    <button
                        key={item.page}
                        onClick={() => setPage(item.page)}
                        className={`sidebar-item${page === item.page ? ' active' : ''}`}
                        aria-current={page === item.page ? 'page' : undefined}
                    >
                        <span className="sidebar-icon"><NavIcon type={item.page} /></span>
                        <span>{item.name}</span>
                    </button>
                ))}

                {/* Admin / Staff (conditional) */}
                {(canManageGroup || isStaff) && (
                    <>
                        <span className="sidebar-section-label">Admin</span>
                        {canManageGroup && (
                            <button
                                onClick={() => setPage('admin')}
                                className={`sidebar-item${page === 'admin' ? ' active' : ''}`}
                                aria-current={page === 'admin' ? 'page' : undefined}
                            >
                                <span className="sidebar-icon"><NavIcon type="admin" /></span>
                                <span>Group Admin</span>
                            </button>
                        )}
                        {isStaff && (
                            <button
                                onClick={() => setPage('superadmin')}
                                className={`sidebar-item${page === 'superadmin' ? ' active' : ''}`}
                                aria-current={page === 'superadmin' ? 'page' : undefined}
                            >
                                <span className="sidebar-icon"><NavIcon type="superadmin" /></span>
                                <span>Staff Panel</span>
                            </button>
                        )}
                    </>
                )}

                {/* Spacer */}
                <div className="flex-1" aria-hidden="true" />

                {/* Sidebar footer — user info + actions */}
                <div
                    style={{
                        borderTop: '1px solid var(--color-divider)',
                        padding: 'var(--space-3) var(--space-3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        flexShrink: 0,
                    }}
                >
                    {/* Avatar + name row */}
                    <button
                        onClick={() => setShowProfile(true)}
                        className="flex items-center gap-2 w-full rounded-xl px-2 py-2 hover:bg-brand-subtle dark:hover:bg-brand-highlight transition text-left"
                        aria-label="Open profile"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm flex-shrink-0" loading="lazy" width="32" height="32" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate leading-tight" style={{ color: 'var(--color-text)' }}>{displayName.split(' ')[0]}</p>
                            <p className="text-xs truncate leading-tight" style={{ color: 'var(--color-text-faint)' }}>{user?.email}</p>
                        </div>
                    </button>

                    {/* Action row */}
                    <div className="flex items-center gap-1">
                        <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} size={16} />

                        <button
                            onClick={onSwitchGroup}
                            title="Switch Group"
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                            style={{ color: 'var(--color-text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-offset)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                <path d="M17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <path d="M7 23 3 19l4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                            Switch
                        </button>

                        <button
                            onClick={handleSignOut}
                            aria-label="Sign out"
                            title="Sign out"
                            className="flex items-center justify-center w-8 h-8 rounded-lg transition"
                            style={{ color: 'var(--color-error)' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-error-highlight)'; e.currentTarget.style.color = 'var(--color-error-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-error)'; }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>

            {/* ══════════════════════════════════════════════════
                DESKTOP TOP BAR  (offset by sidebar width)
            ══════════════════════════════════════════════════ */}
            <div className="top-bar with-sidebar hidden md:flex">
                {/* Page title area — could be populated by children later */}
                <div />

                {/* Right-side actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage('business')}
                        className="px-3 py-1.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-full text-xs font-black uppercase tracking-wider transition shadow-sm"
                    >
                        For Venues
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                MOBILE TOP BAR  (full-width, no sidebar)
            ══════════════════════════════════════════════════ */}
            <header className="top-bar md:hidden" aria-label="Site header">
                {/* Logo */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-brand flex-shrink-0"><PintMark size={24} /></span>
                    <div className="flex flex-col justify-center min-w-0">
                        <span className="text-base font-black tracking-tight leading-tight truncate" style={{ color: 'var(--color-text)' }}>Pub Ranker</span>
                        {groupName && (
                            <span className="text-xs text-brand font-bold uppercase tracking-widest truncate leading-tight">{groupName}</span>
                        )}
                    </div>
                </div>

                {/* Mobile controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => setShowSearch(true)}
                        aria-label="Search pubs"
                        className="flex items-center justify-center w-9 h-9 rounded-full transition"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-offset)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>
                    <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} size={18} />
                    <button
                        onClick={() => setShowProfile(true)}
                        aria-label="Open profile"
                        className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shadow-sm"
                    >
                        {avatarUrl
                            ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" width="32" height="32" />
                            : <div className="w-full h-full bg-brand flex items-center justify-center text-white font-bold text-xs">{displayName.charAt(0).toUpperCase()}</div>
                        }
                    </button>
                </div>
            </header>

            {/* ══════════════════════════════════════════════════
                MOBILE BOTTOM NAV
            ══════════════════════════════════════════════════ */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-xl safe-area-bottom"
                style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-surface) 95%, transparent)',
                    borderTop: '1px solid var(--color-divider)',
                }}
                aria-label="Primary navigation"
            >
                <div className="flex items-stretch h-16">
                    {bottomNavItems.map(item => {
                        if (item.page === '__more__') {
                            return (
                                <button
                                    key="more"
                                    onClick={() => setIsNavOpen(!isNavOpen)}
                                    aria-label="More navigation options"
                                    aria-expanded={isNavOpen}
                                    className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
                                    style={{ color: isNavOpen ? 'var(--color-brand)' : 'var(--color-text-faint)' }}
                                >
                                    <span className="text-xl leading-none">{isNavOpen ? '✕' : '☰'}</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">More</span>
                                </button>
                            );
                        }
                        const isActive = page === item.page;
                        return (
                            <button
                                key={item.page}
                                onClick={() => { setPage(item.page); setIsNavOpen(false); }}
                                aria-current={isActive ? 'page' : undefined}
                                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
                                style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-text-faint)' }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-faint)'; }}
                            >
                                <span className="text-xl leading-none">{item.icon}</span>
                                <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-brand rounded-full" />}
                            </button>
                        );
                    })}
                </div>

                {isNavOpen && (
                    <div
                        className="absolute bottom-16 left-0 right-0 shadow-2xl animate-fadeIn"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            borderTop: '1px solid var(--color-divider)',
                        }}
                    >
                        <div className="grid grid-cols-3 gap-1 p-3">
                            {[
                                { icon: '📱', label: 'Taproom',      page: 'taproom' },
                                { icon: '🎯', label: 'Hit List',     page: 'toVisit' },
                                { icon: '📈', label: 'Insights',     page: 'insights' },
                                { icon: '📅', label: 'Events',       page: 'events' },
                                { icon: '🥊', label: 'Versus',       page: 'individual' },
                                { icon: '🎖️', label: 'Achievements', page: 'achievements' },
                                { icon: '🎡', label: 'Spin',         page: 'spin' },
                                { icon: '💬', label: 'Feedback',     page: 'feedback' },
                                ...(canManageGroup ? [{ icon: '⚙️', label: 'Admin', page: 'admin' }] : []),
                                ...(isStaff ? [{ icon: '🛡️', label: 'Staff', page: 'superadmin' }] : []),
                            ].map(item => (
                                <button
                                    key={item.page}
                                    onClick={() => { setPage(item.page); setIsNavOpen(false); }}
                                    className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-brand-subtle dark:hover:bg-brand-highlight transition"
                                >
                                    <span className="text-2xl">{item.icon}</span>
                                    <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 px-3 pb-3">
                            <button
                                onClick={() => { toggleDarkMode(); setIsNavOpen(false); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition"
                                style={{ backgroundColor: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-brand-subtle)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-offset)'}
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
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                                style={{ backgroundColor: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-dynamic)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-offset)'}
                            >
                                🔄 Switch
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                                style={{ backgroundColor: 'var(--color-error-highlight)', color: 'var(--color-error)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'color-mix(in oklch, var(--color-error) 15%, transparent)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-error-highlight)'}
                            >
                                🚪 Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* body padding for mobile bottom nav */}
            <style dangerouslySetInnerHTML={{__html: `
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

// ── Profile Modal ─────────────────────────────────────────────────────────────
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
            if (b.metric === 'rated')    earned = ratedCount >= b.threshold;
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
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
            style={{ backgroundColor: 'var(--color-overlay)' }}
        >
            <div
                className="p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full relative max-h-[90vh] overflow-y-auto"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <button
                    onClick={onClose}
                    aria-label="Close profile"
                    className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition"
                    style={{ backgroundColor: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >✕</button>
                <h3 className="text-xl font-black mb-6" style={{ color: 'var(--color-text)' }}>Edit Profile</h3>
                <form
                    onSubmit={handleSave}
                    className="space-y-4 mb-8 pb-8"
                    style={{ borderBottom: '1px solid var(--color-divider)' }}
                >
                    <div className="flex items-center gap-4 mb-2">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Preview" className="w-14 h-14 rounded-full object-cover shadow-sm" style={{ border: '2px solid var(--color-border)' }} onError={e => e.target.style.display = 'none'} loading="lazy" width="56" height="56" />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white text-xl font-black shadow-sm">
                                {(userProfile?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-faint)' }}>Account Email</label>
                            <p className="text-sm font-semibold truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--color-text-muted)' }}>Display Name</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
                            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--color-text-muted)' }}>Avatar URL</label>
                        <input
                            type="text"
                            value={avatarUrl}
                            onChange={e => setAvatarUrl(sanitizeAvatarUrl(e.target.value))}
                            placeholder="https://…"
                            className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
                            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--color-text-muted)' }}>Bio</label>
                        <input
                            type="text"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            maxLength="40"
                            placeholder="e.g. Pale Ale Enthusiast"
                            className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
                            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                        />
                    </div>
                    <div className="pt-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-3 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save Details'}
                        </button>
                    </div>
                </form>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-center" style={{ color: 'var(--color-text-faint)' }}>Your Stats</h4>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {[{ label: 'Rated', value: ratedCount }, { label: 'Reviews', value: writtenReviews }, { label: 'Crawls', value: crawlsCreated }].map(stat => (
                        <div key={stat.label} className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-surface-offset)' }}>
                            <p className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{stat.value}</p>
                            <p className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                        </div>
                    ))}
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-center" style={{ color: 'var(--color-text-faint)' }}>Trophy Cabinet</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {badges.map((badge, idx) => (
                            <div
                                key={idx}
                                className={`flex flex-col items-center p-3 rounded-2xl text-center transition-all ${!badge.earned ? 'opacity-50 grayscale' : ''}`}
                                style={badge.earned
                                    ? { backgroundColor: 'var(--color-brand-subtle)', boxShadow: 'var(--shadow-sm)' }
                                    : { backgroundColor: 'var(--color-surface-offset)' }
                                }
                                title={badge.desc}
                            >
                                <span className="text-2xl mb-1">{badge.emoji}</span>
                                <span
                                    className="text-xs font-bold uppercase tracking-wider leading-tight"
                                    style={{ color: badge.earned ? 'var(--color-brand)' : 'var(--color-text-faint)' }}
                                >{badge.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
