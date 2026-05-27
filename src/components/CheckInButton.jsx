import { useState, useMemo } from 'react';
import { useToast } from '../hooks/useToast';

/**
 * CheckInButton
 * Floating action button (bottom-right on desktop, above mobile nav on mobile)
 * Opens a modal to pick a pub + optional note, then writes a check-in.
 */
export default function CheckInButton({ user, pubs = [], groupId, db }) {
    const [open,      setOpen]      = useState(false);
    const [search,    setSearch]    = useState('');
    const [selected,  setSelected]  = useState(null);
    const [note,      setNote]      = useState('');
    const [saving,    setSaving]    = useState(false);
    const { showToast } = useToast();

    const filteredPubs = useMemo(() => {
        const q = search.trim().toLowerCase();
        const visited = pubs.filter(p => p.status === 'visited');
        if (!q) return visited.slice(0, 20);
        return visited.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.location?.toLowerCase().includes(q)
        ).slice(0, 20);
    }, [pubs, search]);

    const handleOpen = () => {
        setOpen(true);
        setSearch('');
        setSelected(null);
        setNote('');
    };

    const handleClose = () => {
        if (saving) return;
        setOpen(false);
    };

    const handleSubmit = async () => {
        if (!selected || saving) return;
        setSaving(true);
        try {
            const { firebase } = await import('../firebase');
            await db
                .collection('groups').doc(groupId)
                .collection('checkIns')
                .add({
                    userId:    user.uid,
                    pubId:     selected.id,
                    note:      note.trim() || null,
                    groupId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            showToast(`Checked in at ${selected.name}! 🍺`, 'success');
            setOpen(false);
        } catch (err) {
            console.error('Check-in error:', err);
            showToast('Failed to check in. Try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* FAB */}
            <button
                onClick={handleOpen}
                aria-label="Check in at a pub"
                className="
                    fixed z-[90]
                    bottom-20 right-4
                    md:bottom-6 md:right-6
                    w-14 h-14 rounded-full
                    bg-amber-600 hover:bg-amber-700 active:scale-95
                    text-white shadow-xl
                    flex items-center justify-center
                    text-2xl
                    transition-all duration-200
                    border-2 border-amber-500
                "
            >
                📍
            </button>

            {/* Modal */}
            {open && (
                <div
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
                    onClick={handleClose}
                >
                    <div
                        className="
                            bg-white dark:bg-gray-900
                            w-full sm:max-w-md
                            rounded-t-3xl sm:rounded-3xl
                            shadow-2xl
                            border border-gray-100 dark:border-gray-800
                            overflow-hidden
                            flex flex-col
                            max-h-[90vh]
                        "
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">📍 Check In</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Where are you drinking right now?</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-5 pt-4 pb-2 flex-shrink-0">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search visited pubs…"
                                    autoFocus
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                                />
                            </div>
                        </div>

                        {/* Pub list */}
                        <div className="flex-1 overflow-y-auto px-3 pb-2">
                            {filteredPubs.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
                                    {search ? `No visited pubs matching "${search}"` : 'No visited pubs yet'}
                                </p>
                            ) : (
                                filteredPubs.map(pub => (
                                    <button
                                        key={pub.id}
                                        onClick={() => setSelected(pub)}
                                        className={`
                                            w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1
                                            transition-all text-left
                                            ${
                                                selected?.id === pub.id
                                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                                            }
                                        `}
                                    >
                                        {pub.photoURL ? (
                                            <img
                                                src={pub.photoURL}
                                                alt={pub.name}
                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                loading="lazy"
                                                width="40" height="40"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-lg flex-shrink-0">
                                                🍺
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{pub.name}</p>
                                            {pub.location && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.location}</p>
                                            )}
                                        </div>
                                        {selected?.id === pub.id && (
                                            <span className="text-amber-600 dark:text-amber-400 text-lg flex-shrink-0">✓</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Note + submit */}
                        <div className="px-5 pb-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-3">
                            <input
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                maxLength={120}
                                placeholder="Add a note… (optional)"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={!selected || saving}
                                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Checking in…' : selected ? `Check in at ${selected.name}` : 'Select a pub first'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
