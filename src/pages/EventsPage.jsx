import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../firebase';

/* ── helpers ─────────────────────────────────────────────── */
function daysUntil(dateStr) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00'); target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function CountdownBadge({ dateStr }) {
    const days = daysUntil(dateStr);
    if (days === 0) return (
        <span className="bg-error text-white rounded-full px-2.5 py-0.5 text-xs font-extrabold tracking-wider">TODAY</span>
    );
    if (days === 1) return (
        <span className="bg-warning text-white rounded-full px-2.5 py-0.5 text-xs font-extrabold">TOMORROW</span>
    );
    if (days <= 7) return (
        <span className="bg-brand text-white rounded-full px-2.5 py-0.5 text-xs font-extrabold">{days}d away</span>
    );
    return (
        <span className="bg-surface-offset text-muted rounded-full px-2.5 py-0.5 text-xs font-bold">{days}d away</span>
    );
}

function AvatarStack({ attendees, getAvatar, getUserName, limit = 6 }) {
    const shown = attendees.slice(0, limit);
    const overflow = attendees.length - limit;
    return (
        <div className="flex items-center">
            {shown.map((uid, i) => {
                const avatar = getAvatar(uid);
                const name = getUserName(uid);
                return avatar
                    ? <img key={uid} src={avatar} alt={name} title={name}
                        className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                        style={{ marginLeft: i === 0 ? 0 : '-0.6rem', zIndex: shown.length - i }} />
                    : <div key={uid} title={name}
                        className="w-8 h-8 rounded-full border-2 border-surface bg-brand flex items-center justify-center text-white text-xs font-extrabold"
                        style={{ marginLeft: i === 0 ? 0 : '-0.6rem', zIndex: shown.length - i }}>
                        {name[0].toUpperCase()}
                    </div>;
            })}
            {overflow > 0 && (
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-dynamic flex items-center justify-center text-muted text-xs font-bold"
                     style={{ marginLeft: '-0.6rem' }}>
                    +{overflow}
                </div>
            )}
        </div>
    );
}

const inputStyle = "w-full px-3 py-2 rounded-lg border border-border bg-surface text-base outline-none text-sm transition-colors focus:border-brand";

/* ── main component ──────────────────────────────────────── */
export default function EventsPage({ db, groupId, pubs, user, canManageGroup, allUsers }) {
    const [events, setEvents] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPastEvents, setShowPastEvents] = useState(false);
    const [expandedAttendees, setExpandedAttendees] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // form state
    const [title, setTitle] = useState('');
    const [pubId, setPubId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('19:00');
    const [description, setDescription] = useState('');

    /* ── live listener: fetch upcoming + recent past ─────── */
    useEffect(() => {
        if (!db || !groupId) return;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const unsubscribe = db.collection('events')
            .where('groupId', '==', groupId)
            .orderBy('date', 'asc')
            .onSnapshot(snap => {
                setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(e => e.date >= cutoff));
            });
        return () => unsubscribe();
    }, [db, groupId]);

    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = useMemo(() => events.filter(e => e.date >= today), [events, today]);
    const pastEvents = useMemo(() => events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date)), [events, today]);

    /* ── handlers ────────────────────────────────────────── */
    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!title || !pubId || !date) return;
        setIsSaving(true);
        try {
            await db.collection('events').add({
                groupId, title: title.trim(), pubId, date,
                time: time || '19:00',
                description: description.trim(),
                createdBy: user.uid,
                attendees: [user.uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setShowAddModal(false);
            setTitle(''); setPubId(''); setDate(''); setTime('19:00'); setDescription('');
        } catch (err) {
            alert('Failed to create event: ' + err.message);
        }
        setIsSaving(false);
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to cancel and delete this event?')) return;
        try { await db.collection('events').doc(eventId).delete(); }
        catch (err) { console.error('Error deleting event:', err); }
    };

    const handleToggleAttendance = async (eventId, currentlyAttending) => {
        const ref = db.collection('events').doc(eventId);
        try {
            await ref.update({
                attendees: currentlyAttending
                    ? firebase.firestore.FieldValue.arrayRemove(user.uid)
                    : firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
        } catch (err) { console.error('Error toggling attendance', err); }
    };

    const getUserName = (uid) => allUsers[uid]?.displayName || allUsers[uid]?.nickname || 'User';
    const getAvatar = (uid) => allUsers[uid]?.avatarUrl || null;

    const todayMin = new Date().toISOString().split('T')[0];

    /* ── render ──────────────────────────────────────────── */
    return (
        <div className="space-y-6 animate-fadeIn">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-xl font-black text-base font-display">
                        Upcoming Events
                    </h2>
                    <p className="text-sm text-muted mt-1">
                        {upcomingEvents.length === 0
                            ? 'No events planned yet.'
                            : `${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''} coming up`}
                    </p>
                </div>
                {canManageGroup && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap shrink-0"
                    >
                        + Add Event
                    </button>
                )}
            </div>

            {/* ── Upcoming Events ── */}
            {upcomingEvents.length === 0 ? (
                <div className="card-glass p-12 text-center">
                    <div className="text-5xl mb-3">🍺</div>
                    <p className="text-base font-bold mb-1">No upcoming events</p>
                    <p className="text-muted text-sm">
                        {canManageGroup ? 'Create one to get the group together.' : 'Check back soon — an admin will add one.'}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {upcomingEvents.map(event => {
                        const pub = pubs.find(p => p.id === event.pubId);
                        const isAttending = event.attendees?.includes(user.uid);
                        const attendeeCount = event.attendees?.length || 0;
                        const days = daysUntil(event.date);
                        const isToday = days === 0;
                        const attendeeNames = (event.attendees || []).map(uid => getUserName(uid));

                        return (
                            <div key={event.id} className={`card-glass overflow-hidden transition-transform hover:-translate-y-px ${isToday ? 'ring-2 ring-error' : ''}`}>
                                {/* Card accent bar */}
                                <div className={`h-1 ${isToday ? 'bg-error' : days <= 7 ? 'bg-brand' : 'bg-surface-dynamic'}`} />

                                {/* Card body */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <h3 className="text-lg font-black font-display text-base truncate">{event.title}</h3>
                                                <CountdownBadge dateStr={event.date} />
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-sm text-muted">
                                                <span>📍 {pub?.name || 'Unknown Pub'}</span>
                                                <span>🗓️ {formatDate(event.date)}</span>
                                                {event.time && <span>🕖 {event.time}</span>}
                                            </div>
                                            {event.description && (
                                                <p className="mt-3 text-sm text-muted leading-relaxed">{event.description}</p>
                                            )}
                                        </div>
                                        {canManageGroup && (
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="shrink-0 px-3 py-1 rounded-md border border-border bg-transparent text-muted text-xs font-bold hover:bg-error/10 hover:text-error hover:border-error transition-colors"
                                            >Cancel event</button>
                                        )}
                                    </div>

                                    {/* Attendee row */}
                                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <AvatarStack attendees={event.attendees || []} getAvatar={getAvatar} getUserName={getUserName} />
                                            <button
                                                onClick={() => setExpandedAttendees(expandedAttendees === event.id ? null : event.id)}
                                                className="text-xs text-muted hover:text-base font-semibold transition-colors"
                                            >
                                                {attendeeCount === 0 ? 'No one yet' : `${attendeeCount} going`} {attendeeCount > 0 ? (expandedAttendees === event.id ? '▲' : '▼') : ''}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleToggleAttendance(event.id, isAttending)}
                                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${isAttending ? 'bg-success/20 text-success' : 'bg-brand text-white hover:bg-brand-dark'}`}
                                        >
                                            {isAttending ? '✓ Going' : 'Join'}
                                        </button>
                                    </div>

                                    {/* Expanded attendee name list */}
                                    {expandedAttendees === event.id && attendeeCount > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {attendeeNames.map((name, i) => (
                                                <span key={i} className="bg-surface-offset text-muted rounded-full px-3 py-1 text-xs font-semibold">{name}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Past Events (collapsible) ── */}
            {pastEvents.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowPastEvents(v => !v)}
                        className="flex items-center gap-2 text-muted text-sm font-bold mb-3 hover:text-base transition-colors"
                    >
                        <span className={`inline-block transition-transform duration-200 ${showPastEvents ? 'rotate-90' : ''}`}>▶</span>
                        Past events ({pastEvents.length})
                    </button>
                    {showPastEvents && (
                        <div className="flex flex-col gap-3">
                            {pastEvents.map(event => {
                                const pub = pubs.find(p => p.id === event.pubId);
                                return (
                                    <div key={event.id} className="card-glass p-4 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-base truncate">{event.title}</p>
                                            <p className="text-xs text-muted mt-0.5">{pub?.name || 'Unknown Pub'} · {formatDate(event.date)}</p>
                                        </div>
                                        <span className="text-xs text-faint shrink-0">{event.attendees?.length || 0} attended</span>
                                        {canManageGroup && (
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="shrink-0 px-2.5 py-0.5 rounded-md border border-border text-faint text-xs hover:text-error hover:border-error transition-colors"
                                            >Delete</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Add Event Modal ── */}
            {showAddModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        className="bg-surface rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-border/50"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-black font-display text-base">Plan an Event</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-base text-2xl leading-none transition-colors">&times;</button>
                        </div>

                        {/* Modal form */}
                        <form onSubmit={handleAddEvent} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Event Title *</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Night Crawl" className={inputStyle} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Pub *</label>
                                <select value={pubId} onChange={e => setPubId(e.target.value)} className={inputStyle} required>
                                    <option value="">Select a pub…</option>
                                    {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Date *</label>
                                    <input type="date" value={date} min={todayMin} onChange={e => setDate(e.target.value)} className={inputStyle} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Time</label>
                                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Description <span className="font-normal normal-case">(optional)</span></label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any notes or details…" rows={3}
                                    className={`${inputStyle} resize-none`} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 rounded-lg border border-border text-muted font-bold hover:bg-surface-offset transition-colors text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving}
                                    className={`flex-[2] py-2 rounded-lg bg-brand text-white font-black transition-colors text-sm ${isSaving ? 'opacity-60' : 'hover:bg-brand-dark'}`}>
                                    {isSaving ? 'Saving…' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
