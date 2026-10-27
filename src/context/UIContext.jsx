import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const UIContext = createContext(null);

export const PAGE_PATHS = {
    '/':               'dashboard',
    '/dashboard':      'dashboard',
    '/pubs':           'pubs',
    '/crawl':          'crawl',
    '/map':            'map',
    '/leaderboard':    'leaderboard',
    '/events':         'events',
    '/activity':       'activity',
    '/taproom':        'activity',
    '/spin':           'spin',
    '/feedback':       'feedback',
    '/admin':          'admin',
    '/superadmin':     'superadmin',
    '/venues':         'venues',
};

const PATH_FROM_PAGE = {
    dashboard:   '/dashboard',
    pubs:        '/pubs',
    crawl:       '/crawl',
    map:         '/map',
    leaderboard: '/leaderboard',
    events:      '/events',
    activity:    '/activity',
    taproom:     '/activity',
    spin:        '/spin',
    feedback:    '/feedback',
    admin:       '/admin',
    superadmin:  '/superadmin',
    venues:      '/venues',
};

function getInitialPage() {
    const pathname = window.location.pathname;
    return PAGE_PATHS[pathname] || 'dashboard';
}

export const AVAILABLE_THEMES = [
    { id: 'heritage', label: 'Heritage Tavern (Default)', emoji: '🌿', isDark: true, bg: '#07241c', accent: '#d4af37' },
    { id: 'electric', label: 'Electric Craft (Alternative)', emoji: '⚡', isDark: true, bg: '#070d1e', accent: '#00f59b' },
    { id: 'obsidian', label: 'Obsidian Minimal', emoji: '🖤', isDark: true, bg: '#090a0f', accent: '#f59e0b' },
    { id: 'nordic',   label: 'Nordic Clean',   emoji: '☁️', isDark: false, bg: '#fcfbf9', accent: '#1e293b' },
];

export function UIProvider({ children }) {
    // ── Theme State ───────────────────────────────────────────────────────────
    const [themeId, setThemeId] = useState(() => {
        const saved = localStorage.getItem('theme_id');
        if (saved && AVAILABLE_THEMES.some(t => t.id === saved)) return saved;
        const legacy = localStorage.getItem('theme');
        if (legacy === 'light') return 'nordic';
        return 'heritage'; // default to Heritage Green
    });

    const isDarkMode = themeId !== 'nordic';

    useEffect(() => {
        const current = AVAILABLE_THEMES.find(t => t.id === themeId) || AVAILABLE_THEMES[0];
        document.documentElement.classList.toggle('dark', current.isDark);
        document.documentElement.setAttribute('data-theme', current.id);
        localStorage.setItem('theme_id', current.id);
        localStorage.setItem('theme', current.isDark ? 'dark' : 'light');
    }, [themeId]);

    const toggleDarkMode = useCallback(() => {
        setThemeId(prev => prev === 'nordic' ? 'obsidian' : 'nordic');
    }, []);

    // ── Page & Route State ────────────────────────────────────────────────────
    const [page, setPageState] = useState(getInitialPage);

    const setPage = useCallback((newPage) => {
        const targetPath = PATH_FROM_PAGE[newPage] || '/dashboard';
        if (window.location.pathname !== targetPath) {
            window.history.pushState({ page: newPage }, '', targetPath);
        }
        setPageState(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        const onPopState = (e) => {
            const poppedPage = e.state?.page || getInitialPage();
            setPageState(poppedPage);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // ── Global Search Modal State (Ctrl+K / Cmd+K) ───────────────────────────
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const openSearch = useCallback(() => setIsSearchOpen(true), []);
    const closeSearch = useCallback(() => setIsSearchOpen(false), []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            } else if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen]);

    // ── Mobile Drawer State ───────────────────────────────────────────────────
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const toggleMobileDrawer = useCallback(() => setIsMobileDrawerOpen(prev => !prev), []);
    const closeMobileDrawer = useCallback(() => setIsMobileDrawerOpen(false), []);

    const value = useMemo(() => ({
        isDarkMode,
        toggleDarkMode,
        themeId,
        setThemeId,
        AVAILABLE_THEMES,
        page,
        setPage,
        isSearchOpen,
        openSearch,
        closeSearch,
        isMobileDrawerOpen,
        toggleMobileDrawer,
        closeMobileDrawer,
    }), [
        isDarkMode,
        toggleDarkMode,
        themeId,
        setThemeId,
        page,
        setPage,
        isSearchOpen,
        openSearch,
        closeSearch,
        isMobileDrawerOpen,
        toggleMobileDrawer,
        closeMobileDrawer,
    ]);

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
    return ctx;
}
