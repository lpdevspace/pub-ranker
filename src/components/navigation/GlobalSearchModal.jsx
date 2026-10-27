import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, MapPin, Star, Navigation, ArrowRight, LayoutDashboard, Calendar } from 'lucide-react';
import { useUI } from '../../context/UIContext';

export default function GlobalSearchModal({ pubs = [], onSelectPub = () => {} }) {
    const { isSearchOpen, closeSearch, setPage } = useUI();
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isSearchOpen) {
            setQuery('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isSearchOpen]);

    const pageSuggestions = [
        { title: 'Group Dashboard', page: 'dashboard', icon: LayoutDashboard },
        { title: 'Pub Directory', page: 'pubs', icon: Search },
        { title: 'Pub Crawl Planner', page: 'crawl', icon: Navigation },
        { title: 'Interactive Map', page: 'map', icon: MapPin },
        { title: 'Calendar & Events', page: 'events', icon: Calendar },
    ];

    const filteredPubs = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return pubs
            .filter((p) => p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q))
            .slice(0, 6);
    }, [query, pubs]);

    const filteredPages = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return pageSuggestions.filter((p) => p.title.toLowerCase().includes(q));
    }, [query]);

    if (!isSearchOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
                className="w-full max-w-xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Header Bar */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-divider)]">
                    <Search className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pubs by name, town, or jump to a page..."
                        className="w-full bg-transparent border-none text-[var(--color-text)] placeholder-[var(--color-text-faint)] text-sm focus:outline-none"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={closeSearch}
                        className="text-xs px-2 py-1 rounded bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] font-mono border border-[var(--color-border)]"
                    >
                        ESC
                    </button>
                </div>

                {/* Results List */}
                <div className="max-h-96 overflow-y-auto p-3">
                    {query.trim().length === 0 ? (
                        <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                            <p className="font-semibold mb-1">Quick Search</p>
                            <p>Type a pub name, city area, or keyword to find venues instantly.</p>
                        </div>
                    ) : (
                        <>
                            {/* Page Matches */}
                            {filteredPages.length > 0 && (
                                <div className="mb-3">
                                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                                        Pages
                                    </p>
                                    {filteredPages.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.page}
                                                onClick={() => {
                                                    setPage(item.page);
                                                    closeSearch();
                                                }}
                                                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-surface-offset)] text-left transition group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-[var(--color-surface-offset)] text-[var(--color-brand)]">
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-[var(--color-text)]">{item.title}</span>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-[var(--color-text-faint)] group-hover:text-[var(--color-text)] transition" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pub Matches */}
                            {filteredPubs.length > 0 ? (
                                <div>
                                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                                        Pubs
                                    </p>
                                    {filteredPubs.map((pub) => (
                                        <button
                                            key={pub.id}
                                            onClick={() => {
                                                onSelectPub(pub);
                                                closeSearch();
                                            }}
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-surface-offset)] text-left transition group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-offset-2)] border border-[var(--color-border)] flex items-center justify-center font-bold text-xs shrink-0">
                                                    🍺
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-xs font-bold text-[var(--color-text)] truncate">{pub.name}</p>
                                                    <p className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 truncate">
                                                        <MapPin className="w-3 h-3 shrink-0 text-red-500" />
                                                        <span>{pub.location || pub.address || 'Local pub'}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    pub.status === 'visited'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                }`}>
                                                    {pub.status === 'visited' ? 'Visited' : 'To Visit'}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                filteredPages.length === 0 && (
                                    <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                                        No matching pubs or pages found for &ldquo;{query}&rdquo;.
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
