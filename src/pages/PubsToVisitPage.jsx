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
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'oklch(from var(--color-text) l c h / 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-4)',
        }} onClick={onClose}>
            <div style={{
                background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '520px',
                border: '1px solid var(--color-border)', padding: 'var(--space-6)',
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-text)' }}>
                            🍺 Add to Hit List
                        </h2>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                            Search for a pub and we'll pull in the details from Google.
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Close" style={{ color: 'var(--color-text-muted)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                {!manualMode ? (
                    <>
                        {/* Search input */}
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                            <div style={{ position: 'relative' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                                </svg>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search for a pub…"
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setSelected(null); search(e.target.value); }}
                                    style={{
                                        width: '100%', padding: 'var(--space-3) var(--space-4) var(--space-3) var(--space-10)',
                                        border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                                        background: 'var(--color-bg)', color: 'var(--color-text)',
                                        fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)',
                                        outline: 'none', transition: 'border-color var(--transition-interactive)',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                                />
                                {searchLoading && (
                                    <div style={{ position: 'absolute', right: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)' }}>
                                        <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    </div>
                                )}
                                {selected && !searchLoading && (
                                    <div style={{ position: 'absolute', right: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-success)' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                )}
                            </div>

                            {/* Dropdown suggestions */}
                            {suggestions.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + var(--space-1))', left: 0, right: 0, zIndex: 50,
                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                                }}>
                                    {suggestions.map((s, i) => {
                                        const { main, secondary } = getSuggestionLabel(s);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleSelect(s)}
                                                style={{
                                                    width: '100%', textAlign: 'left', padding: 'var(--space-3) var(--space-4)',
                                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-divider)' : 'none',
                                                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                                                    transition: 'background var(--transition-interactive)',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span style={{ marginTop: '2px', flexShrink: 0 }}>📍</span>
                                                <div>
                                                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>{main}</p>
                                                    {secondary && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>{secondary}</p>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Selected place preview */}
                        {selected && (
                            <div style={{
                                marginTop: 'var(--space-4)', padding: 'var(--space-4)',
                                background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
                            }}>
                                {(() => {
                                    let photoUrl = '';
                                    try { photoUrl = selected.photos?.[0]?.getURI({ maxWidth: 80 }) || ''; } catch (_) {}
                                    return photoUrl
                                        ? <img src={photoUrl} alt={selected.displayName} loading="lazy" width="56" height="56"
                                            style={{ width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
                                        : <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dynamic)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🍺</div>;
                                })()}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.displayName}</p>
                                    {selected.formattedAddress && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {selected.formattedAddress}</p>}
                                </div>
                                <div style={{ color: 'var(--color-success)', flexShrink: 0 }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                            </div>
                        )}

                        <button onClick={() => setManualMode(true)}
                            style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)', padding: 0 }}>
                            Can't find it? Add manually
                        </button>
                    </>
                ) : (
                    // Manual fallback form
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-body)' }}>Pub Name *</label>
                            <input type="text" placeholder="e.g. The Red Lion" value={manualName} onChange={e => setManualName(e.target.value)}
                                style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none' }}
                                onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-body)' }}>Location / Address</label>
                            <input type="text" placeholder="e.g. Telford, Shropshire" value={manualLocation} onChange={e => setManualLocation(e.target.value)}
                                style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none' }}
                                onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                        </div>
                        <button onClick={() => setManualMode(false)}
                            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)', padding: 0, textAlign: 'left' }}>
                            ← Back to search
                        </button>
                    </div>
                )}

                {error && <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>}

                {/* Footer actions */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={saving}
                        style={{ padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Cancel
                    </button>
                    <button onClick={handleAdd} disabled={saving || (!selected && !manualMode) || (manualMode && !manualName.trim())}
                        style={{
                            padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-lg)', border: 'none',
                            background: (saving || (!selected && !manualMode) || (manualMode && !manualName.trim())) ? 'var(--color-surface-dynamic)' : 'var(--color-brand)',
                            color: (saving || (!selected && !manualMode) || (manualMode && !manualName.trim())) ? 'var(--color-text-faint)' : '#fff',
                            fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-body)', cursor: saving ? 'wait' : 'pointer',
                            transition: 'all var(--transition-interactive)',
                        }}>
                        {saving ? 'Adding…' : '🎯 Add to Hit List'}
                    </button>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmColor = 'var(--color-error)', onConfirm, onCancel }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'oklch(from var(--color-text) l c h / 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-4)',
        }} onClick={onCancel}>
            <div style={{
                background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '400px',
                border: '1px solid var(--color-border)', padding: 'var(--space-6)',
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>{title}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel}
                        style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Cancel
                    </button>
                    <button onClick={onConfirm}
                        style={{ padding: 'var(--space-2) var(--space-5)', borderRadius: 'var(--radius-lg)', border: 'none', background: confirmColor, color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
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
    const bg = type === 'success' ? 'var(--color-success)' : type === 'error' ? 'var(--color-error)' : 'var(--color-text)';
    return (
        <div style={{
            position: 'fixed', bottom: 'var(--space-6)', left: '50%', transform: 'translateX(-50%)',
            zIndex: 2000, background: bg, color: '#fff',
            padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-lg)', fontSize: 'var(--text-sm)', fontWeight: 700,
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', pointerEvents: 'none',
            animation: 'toastIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}>
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
            <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                transition: 'all var(--transition-interactive)',
            }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
            >
                {/* Photo */}
                <div style={{ height: '11rem', background: 'var(--color-surface-offset)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                    {pub.photoURL
                        ? <img src={pub.photoURL} alt={pub.name} loading="lazy" width="400" height="176"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.3 }}>🍺</div>
                    }
                    {/* Google Maps link */}
                    {pub.googleLink && (
                        <a href={pub.googleLink} target="_blank" rel="noopener noreferrer"
                            style={{
                                position: 'absolute', top: 'var(--space-2)', right: 'var(--space-2)',
                                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                                borderRadius: 'var(--radius-md)', padding: 'var(--space-1) var(--space-2)',
                                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                                fontSize: 'var(--text-xs)', fontWeight: 700, color: '#fff',
                                textDecoration: 'none', transition: 'background var(--transition-interactive)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Maps
                        </a>
                    )}
                    {/* Admin delete */}
                    {canDelete && (
                        <button onClick={() => setConfirmDelete(true)}
                            aria-label="Remove from hit list"
                            style={{
                                position: 'absolute', top: 'var(--space-2)', left: 'var(--space-2)',
                                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                                borderRadius: 'var(--radius-md)', padding: 'var(--space-1) var(--space-2)',
                                color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                                border: 'none', cursor: 'pointer', transition: 'background var(--transition-interactive)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(161,44,123,0.8)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            Remove
                        </button>
                    )}
                </div>

                {/* Body */}
                <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pub.name}</h3>
                    {pub.location && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📍 {pub.location}
                        </p>
                    )}
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
                        Added by <strong style={{ color: 'var(--color-text-muted)' }}>{addedByName}</strong> · {relativeTime(pub.createdAt)}
                    </p>
                </div>

                {/* Mark as Visited CTA */}
                <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-divider)' }}>
                    <button
                        onClick={() => setConfirmVisit(true)}
                        disabled={visiting}
                        style={{
                            width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                            border: '1.5px solid var(--color-brand)',
                            background: 'transparent', color: 'var(--color-brand)',
                            fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-body)',
                            cursor: visiting ? 'wait' : 'pointer',
                            transition: 'all var(--transition-interactive)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                        }}
                        onMouseEnter={e => { if (!visiting) { e.currentTarget.style.background = 'var(--color-brand)'; e.currentTarget.style.color = '#fff'; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-brand)'; }}
                    >
                        {visiting ? (
                            <><div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Moving…</>
                        ) : (
                            <>✅ We've Been Here — Move to Pub List</>
                        )}
                    </button>
                </div>
            </div>

            {confirmVisit && (
                <ConfirmModal
                    title="Mark as visited?"
                    message={`This will move "${pub.name}" to the Pub List where it can be rated by the group.`}
                    confirmLabel="✅ Yes, we've been!"
                    confirmColor="var(--color-success)"
                    onConfirm={handleVisit}
                    onCancel={() => setConfirmVisit(false)}
                />
            )}
            {confirmDelete && (
                <ConfirmModal
                    title="Remove from Hit List?"
                    message={`"${pub.name}" will be removed from the hit list entirely. This can't be undone.`}
                    confirmLabel="Remove"
                    confirmColor="var(--color-error)"
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        <div style={{ padding: 'var(--space-6)', maxWidth: 'var(--content-wide)', margin: '0 auto' }}>

            {/* ── Page header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>
                        🎯 Hit List
                    </h1>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                        {hitList.length === 0 && !search
                            ? 'No pubs on the list yet — add the first one!'
                            : `${hitList.length} pub${hitList.length !== 1 ? 's' : ''} to visit`}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-lg)',
                        border: 'none', background: 'var(--color-brand)', color: '#fff',
                        fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-body)',
                        cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                        transition: 'all var(--transition-interactive)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-dark, #0c4e54)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add a Pub
                </button>
            </div>

            {/* ── Search + Sort bar ── */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        type="text" placeholder="Search hit list…" value={search} onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: 'var(--space-3) var(--space-4) var(--space-3) 2.25rem',
                            border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                            background: 'var(--color-surface)', color: 'var(--color-text)',
                            fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none',
                            transition: 'border-color var(--transition-interactive)',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                    />
                </div>
                <select value={sort} onChange={e => setSort(e.target.value)}
                    style={{
                        padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--color-border)', background: 'var(--color-surface)',
                        color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)',
                        cursor: 'pointer', outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}>
                    <option value="newest">Newest first</option>
                    <option value="az">A → Z</option>
                </select>
            </div>

            {/* ── Cards grid ── */}
            {hitList.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                    gap: 'var(--space-5)',
                }}>
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
                <div style={{ textAlign: 'center', padding: 'var(--space-20) var(--space-8)' }}>
                    {search ? (
                        <>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)', opacity: 0.4 }}>🔍</div>
                            <p style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>No results for "{search}"</p>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Try a different name or clear the search.</p>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>🎯</div>
                            <p style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>The hit list is empty!</p>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: '32ch', margin: '0 auto var(--space-6)' }}>Start building your group's bucket list of pubs to visit.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                                    padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-lg)',
                                    border: 'none', background: 'var(--color-brand)', color: '#fff',
                                    fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer',
                                }}
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
