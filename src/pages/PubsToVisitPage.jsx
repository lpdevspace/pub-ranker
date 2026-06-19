import React, { useState, useRef, useEffect, useMemo } from 'react';
import { firebase } from '../firebase';

// ─── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(date) {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Google Places Autocomplete search ────────────────────────────────────────
function usePlacesSearch() {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading]         = useState(false);
    const debounceRef = useRef(null);

    const search = (query) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim() || !window.google) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const { AutocompleteSuggestion } = await window.google.maps.importLibrary('places');
                const req = {
                    input: query,
                    types: ['bar', 'pub', 'restaurant', 'establishment'],
                    language: 'en-GB',
                };
                const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
                setSuggestions(results || []);
            } catch (err) {
                // Fallback: text search
                try {
                    const { Place } = await window.google.maps.importLibrary('places');
                    const { places } = await Place.searchByText({
                        textQuery: query + ' pub',
                        fields: ['id', 'displayName', 'formattedAddress', 'location', 'photos', 'googleMapsURI'],
                        maxResultCount: 5,
                    });
                    setSuggestions((places || []).map(p => ({ _resolved: p })));
                } catch (e2) {
                    console.error('Places search error', e2);
                    setSuggestions([]);
                }
            } finally {
                setLoading(false);
            }
        }, 350);
    };

    const resolve = async (suggestion) => {
        // Already resolved (fallback path)
        if (suggestion._resolved) return suggestion._resolved;
        try {
            const { Place } = await window.google.maps.importLibrary('places');
            const place = new Place({ id: suggestion.placePrediction.placeId });
            await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'photos', 'googleMapsURI'] });
            return place;
        } catch (e) {
            console.error('Place resolve error', e);
            return null;
        }
    };

    return { suggestions, loading, search, resolve, clearSuggestions: () => setSuggestions([]) };
}

// ─── AddPubModal ──────────────────────────────────────────────────────────────
function AddPubModal({ groupRef, db, user, onClose, onAdded }) {
    const [query, setQuery]         = useState('');
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');
    const [selected, setSelected]   = useState(null); // resolved Place data
    const [manualMode, setManualMode] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualLocation, setManualLocation] = useState('');
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const { suggestions, loading: searchLoading, search, resolve, clearSuggestions } = usePlacesSearch();

    useEffect(() => { inputRef.current?.focus(); }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) clearSuggestions();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [clearSuggestions]);

    const handleSelect = async (suggestion) => {
        clearSuggestions();
        const label = suggestion._resolved
            ? suggestion._resolved.displayName
            : suggestion.placePrediction?.text?.text || '';
        setQuery(label);
        const place = await resolve(suggestion);
        if (place) setSelected(place);
    };

    const handleAdd = async () => {
        setError('');
        if (!selected && !manualMode) { setError('Please select a pub from the list.'); return; }
        if (manualMode && !manualName.trim()) { setError('Please enter a pub name.'); return; }
        setSaving(true);
        try {
            let pubData;
            if (selected) {
                const lat = selected.location?.lat?.()   ?? selected.location?.lat   ?? null;
                const lng = selected.location?.lng?.()   ?? selected.location?.lng   ?? null;
                let photoURL = '';
                try {
                    if (selected.photos && selected.photos.length > 0) {
                        photoURL = selected.photos[0].getURI({ maxWidth: 800 });
                    }
                } catch (_) {}
                pubData = {
                    name:        selected.displayName || query,
                    location:    selected.formattedAddress || '',
                    lat,
                    lng,
                    photoURL,
                    googleLink:  selected.googleMapsURI || '',
                    placeId:     selected.id || '',
                };
            } else {
                pubData = {
                    name:     manualName.trim(),
                    location: manualLocation.trim(),
                    lat:      null,
                    lng:      null,
                    photoURL: '',
                    googleLink: '',
                    placeId:  '',
                };
            }

            const fullData = {
                ...pubData,
                addedBy:   user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status:    'to-visit',
            };

            // Write to global pubs collection too
            const globalRef = await db.collection('pubs').add({ ...fullData, isLocked: false });
            await groupRef.collection('pubs').add({ ...fullData, globalId: globalRef.id });
            await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(1) });

            onAdded(pubData.name);
            onClose();
        } catch (e) {
            console.error('Add pub error', e);
            setError('Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getSuggestionLabel = (s) => {
        if (s._resolved) return { main: s._resolved.displayName, secondary: s._resolved.formattedAddress || '' };
        const pred = s.placePrediction;
        return {
            main:      pred?.structuredFormat?.mainText?.text   || pred?.text?.text || '',
            secondary: pred?.structuredFormat?.secondaryText?.text || '',
        };
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg border border-border/50 p-6" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h2 className="text-lg font-display font-bold text-text">
                            🍺 Add to Hit List
                        </h2>
                        <p className="text-xs text-muted mt-1">
                            Search for a pub and we'll pull in the details from Google.
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="text-muted p-2 rounded-md hover:bg-surface-offset transition-colors leading-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                {!manualMode ? (
                    <>
                        {/* Search input */}
                        <div className="relative" ref={dropdownRef}>
                            <div className="relative">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                                </svg>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search for a pub…"
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setSelected(null); search(e.target.value); }}
                                    className="w-full py-3 pr-4 pl-10 border-2 border-border rounded-lg bg-bg text-text text-sm font-body outline-none transition-colors focus:border-brand"
                                />
                                {searchLoading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-border border-t-brand rounded-full animate-spin" />
                                    </div>
                                )}
                                {selected && !searchLoading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-success">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                )}
                            </div>

                            {/* Dropdown suggestions */}
                            {suggestions.length > 0 && (
                                <div className="absolute top-[calc(100%+0.25rem)] left-0 right-0 z-50 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                                    {suggestions.map((s, i) => {
                                        const { main, secondary } = getSuggestionLabel(s);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleSelect(s)}
                                                className={`w-full text-left px-4 py-3 bg-transparent border-none cursor-pointer flex items-start gap-3 transition-colors hover:bg-surface-offset ${i < suggestions.length - 1 ? 'border-b border-divider' : ''}`}
                                            >
                                                <span className="mt-0.5 shrink-0">📍</span>
                                                <div>
                                                    <p className="text-sm font-bold text-text font-body">{main}</p>
                                                    {secondary && <p className="text-xs text-muted mt-0.5">{secondary}</p>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Selected place preview */}
                        {selected && (
                            <div className="mt-4 p-4 bg-surface-offset rounded-lg border border-border flex gap-3 items-center">
                                {(() => {
                                    let photoUrl = '';
                                    try { photoUrl = selected.photos?.[0]?.getURI({ maxWidth: 80 }) || ''; } catch (_) {}
                                    return photoUrl
                                        ? <img src={photoUrl} alt={selected.displayName} loading="lazy" width="56" height="56"
                                            className="w-14 h-14 rounded-md object-cover shrink-0 border border-border" />
                                        : <div className="w-14 h-14 rounded-md bg-surface-dynamic flex items-center justify-center text-2xl shrink-0">🍺</div>;
                                })()}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-text font-body truncate">{selected.displayName}</p>
                                    {selected.formattedAddress && <p className="text-xs text-muted mt-0.5 truncate">📍 {selected.formattedAddress}</p>}
                                </div>
                                <div className="text-success shrink-0">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                            </div>
                        )}

                        <button onClick={() => setManualMode(true)}
                            className="mt-3 text-xs text-muted bg-transparent border-none cursor-pointer underline font-body p-0 hover:text-text transition-colors">
                            Can't find it? Add manually
                        </button>
                    </>
                ) : (
                    // Manual fallback form
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-wide font-body">Pub Name *</label>
                            <input type="text" placeholder="e.g. The Red Lion" value={manualName} onChange={e => setManualName(e.target.value)}
                                className="w-full py-3 px-4 border-2 border-border rounded-lg bg-bg text-text text-sm font-body outline-none transition-colors focus:border-brand" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-wide font-body">Location / Address</label>
                            <input type="text" placeholder="e.g. Telford, Shropshire" value={manualLocation} onChange={e => setManualLocation(e.target.value)}
                                className="w-full py-3 px-4 border-2 border-border rounded-lg bg-bg text-text text-sm font-body outline-none transition-colors focus:border-brand" />
                        </div>
                        <button onClick={() => setManualMode(false)}
                            className="text-xs text-muted bg-transparent border-none cursor-pointer underline font-body p-0 text-left hover:text-text transition-colors">
                            ← Back to search
                        </button>
                    </div>
                )}

                {error && <p className="mt-3 text-xs text-error font-bold">{error}</p>}

                {/* Footer actions */}
                <div className="flex gap-3 mt-6 justify-end">
                    <button onClick={onClose} disabled={saving}
                        className="px-5 py-3 rounded-lg border border-border bg-transparent text-text text-sm font-bold font-body cursor-pointer hover:bg-surface-offset transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleAdd} disabled={saving || (!selected && !manualMode) || (manualMode && !manualName.trim())}
                        className={`px-6 py-3 rounded-lg border-none text-white text-sm font-bold font-body transition-colors ${(saving || (!selected && !manualMode) || (manualMode && !manualName.trim())) ? 'bg-surface-dynamic text-faint cursor-not-allowed' : 'bg-brand cursor-pointer hover:bg-brand-dark'}`}>
                        {saving ? (
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Adding…
                            </div>
                        ) : '🎯 Add to Hit List'}
                    </button>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, isDestructive, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onCancel}>
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm border border-border/50 p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold font-body text-base mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{message}</p>
                <div className="flex gap-3 mt-5 justify-end">
                    <button onClick={onCancel}
                        className="px-4 py-2 rounded-lg border border-border bg-transparent text-base text-sm font-semibold font-body hover:bg-surface-offset transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm}
                        className={`px-5 py-2 rounded-lg text-white text-sm font-bold font-body transition-colors ${isDestructive ? 'bg-error hover:opacity-80' : 'bg-success hover:opacity-80'}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDismiss }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3500);
        return () => clearTimeout(t);
    }, [onDismiss]);
    const bgClass = type === 'success' ? 'bg-success text-white' : type === 'error' ? 'bg-error text-white' : 'bg-surface-dynamic text-base';
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] px-6 py-3 rounded-full shadow-lg text-sm font-bold font-body whitespace-nowrap pointer-events-none animate-[toastIn_0.25s_cubic-bezier(0.16,1,0.3,1)] ${bgClass}`}>
            {message}
            <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
        </div>
    );
}

// ─── PubCard ──────────────────────────────────────────────────────────────────
function PubCard({ pub, canDelete, allUsers, onMarkVisited, onDelete }) {
    const [visiting, setVisiting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmVisit, setConfirmVisit]   = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const addedByName = allUsers?.[pub.addedBy]?.displayName || allUsers?.[pub.addedBy]?.name || 'Someone';

    const handleVisit = async () => {
        setVisiting(true);
        await onMarkVisited(pub);
        setVisiting(false);
        setConfirmVisit(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete(pub);
        setDeleting(false);
        setConfirmDelete(false);
    };

    return (
        <>
            <div className="card-glass overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5 hover:shadow-md">
                {/* Photo */}
                <div className="h-44 bg-surface-offset relative overflow-hidden shrink-0">
                    {pub.photoURL
                        ? <img src={pub.photoURL} alt={pub.name} loading="lazy" width="400" height="176"
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none'; }} />
                        : <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">🍺</div>
                    }
                    {/* Google Maps link */}
                    {pub.googleLink && (
                        <a href={pub.googleLink} target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 bg-black/55 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 text-xs font-bold text-white no-underline transition-colors hover:bg-black/80"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Maps
                        </a>
                    )}
                    {/* Admin delete */}
                    {canDelete && (
                        <button onClick={() => setConfirmDelete(true)}
                            aria-label="Remove from hit list"
                            className="absolute top-2 left-2 bg-black/55 backdrop-blur-sm rounded-md px-2 py-1 text-white text-xs font-bold flex items-center gap-1 border-none cursor-pointer transition-colors hover:bg-error/80"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            Remove
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                    <h3 className="text-base font-bold font-body text-base leading-tight truncate">{pub.name}</h3>
                    {pub.location && (
                        <p className="text-xs text-muted truncate">
                            📍 {pub.location}
                        </p>
                    )}
                    <p className="text-xs text-faint mt-auto pt-2">
                        Added by <strong className="text-muted">{addedByName}</strong> · {relativeTime(pub.createdAt)}
                    </p>
                </div>

                {/* Mark as Visited CTA */}
                <div className="p-3 border-t border-divider">
                    <button
                        onClick={() => setConfirmVisit(true)}
                        disabled={visiting}
                        className="w-full p-3 rounded-lg border-2 border-brand bg-transparent text-brand text-sm font-bold font-body cursor-pointer transition-colors flex items-center justify-center gap-2 hover:bg-brand hover:text-white disabled:opacity-50 disabled:cursor-wait"
                    >
                        {visiting ? (
                            <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Moving…</>
                        ) : (
                            <>✅ We've Been Here</>
                        )}
                    </button>
                </div>
            </div>

            {confirmVisit && (
                <ConfirmModal
                    title="Mark as visited?"
                    message={`This will move "${pub.name}" to the Pub List where it can be rated by the group.`}
                    confirmLabel="✅ Yes, we've been!"
                    isDestructive={false}
                    onConfirm={handleVisit}
                    onCancel={() => setConfirmVisit(false)}
                />
            )}
            {confirmDelete && (
                <ConfirmModal
                    title="Remove from Hit List?"
                    message={`"${pub.name}" will be removed from the hit list entirely. This can't be undone.`}
                    confirmLabel="Remove"
                    isDestructive={true}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function LiveGoogleStatus() { return null; } // kept for import compat

export default function PubsToVisitPage({ pubs = [], groupRef, db, user, allUsers = {}, canManageGroup, featureFlags }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [search, setSearch]             = useState('');
    const [sort, setSort]                 = useState('newest'); // 'newest' | 'az'
    const [toast, setToast]               = useState(null);

    const pubsRef = groupRef?.collection('pubs');

    // Only show to-visit pubs
    const hitList = useMemo(() => {
        return pubs
            .filter(p => p.status === 'to-visit' || p.status === 'toVisit')
            .filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.location || '').toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
                if (sort === 'az') return (a.name || '').localeCompare(b.name || '');
                // newest first
                const aMs = a.createdAt?.toMillis?.() ?? 0;
                const bMs = b.createdAt?.toMillis?.() ?? 0;
                return bMs - aMs;
            });
    }, [pubs, search, sort]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
    };

    const handleMarkVisited = async (pub) => {
        try {
            await pubsRef.doc(pub.id).update({ status: 'visited' });
            showToast(`🍺 ${pub.name} moved to the Pub List!`);
        } catch (e) {
            console.error('Mark visited error', e);
            showToast('Something went wrong.', 'error');
        }
    };

    const handleDelete = async (pub) => {
        try {
            await pubsRef.doc(pub.id).delete();
            await groupRef.update({ pubCount: firebase.firestore.FieldValue.increment(-1) });
            showToast(`🗑️ ${pub.name} removed from Hit List.`);
        } catch (e) {
            console.error('Delete pub error', e);
            showToast('Something went wrong.', 'error');
        }
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                    <h1 className="text-xl font-display font-bold text-text leading-tight">
                        🎯 Hit List
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        {hitList.length === 0 && !search
                            ? 'No pubs on the list yet — add the first one!'
                            : `${hitList.length} pub${hitList.length !== 1 ? 's' : ''} to visit`}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-lg border-none bg-brand text-white text-sm font-bold font-body cursor-pointer shadow-sm transition-all hover:bg-brand-dark hover:shadow-md"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add a Pub
                </button>
            </div>

            {/* ── Search + Sort bar ── */}
            <div className="flex gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        type="text" placeholder="Search hit list…" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full py-3 pr-4 pl-9 border-2 border-border rounded-lg bg-surface text-text text-sm font-body outline-none transition-colors focus:border-brand"
                    />
                </div>
                <select value={sort} onChange={e => setSort(e.target.value)}
                    className="px-4 py-3 rounded-lg border-2 border-border bg-surface text-text text-sm font-body cursor-pointer outline-none transition-colors focus:border-brand appearance-none"
                >
                    <option value="newest">Newest first</option>
                    <option value="az">A → Z</option>
                </select>
            </div>

            {/* ── Cards grid ── */}
            {hitList.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-5">
                    {hitList.map(pub => (
                        <PubCard
                            key={pub.id}
                            pub={pub}
                            canDelete={canManageGroup}
                            allUsers={allUsers}
                            onMarkVisited={handleMarkVisited}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 px-8">
                    {search ? (
                        <>
                            <div className="text-5xl mb-4 opacity-40">🔍</div>
                            <p className="text-base font-bold text-text mb-2">No results for "{search}"</p>
                            <p className="text-sm text-muted">Try a different name or clear the search.</p>
                        </>
                    ) : (
                        <>
                            <div className="text-6xl mb-4">🎯</div>
                            <p className="text-base font-bold text-text mb-2">The hit list is empty!</p>
                            <p className="text-sm text-muted max-w-[32ch] mx-auto mb-6">Start building your group's bucket list of pubs to visit.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-none bg-brand text-white text-sm font-bold font-body cursor-pointer hover:bg-brand-dark transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Add the first pub
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── Modals & Toast ── */}
            {showAddModal && (
                <AddPubModal
                    groupRef={groupRef}
                    db={db}
                    user={user}
                    onClose={() => setShowAddModal(false)}
                    onAdded={(name) => showToast(`🎯 ${name} added to the Hit List!`)}
                />
            )}
            {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
        </div>
    );
}
