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
        <span className="bg-error text-white rounded-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">Today</span>
    );
    if (days === 1) return (
        <span className="bg-warning text-white rounded-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">Tomorrow</span>
    );
    if (days <= 7) return (
        <span className="bg-brand text-white rounded-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">{days}d away</span>
    );
    return (
        <span className="bg-surface-offset border border-divider text-muted rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{days}d away</span>
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
                        className="w-8 h-8 rounded-full border-2 border-surface object-cover shrink-0"
                        style={{ marginLeft: i === 0 ? 0 : '-0.75rem', zIndex: shown.length - i }} />
                    : <div key={uid} title={name}
                        className="w-8 h-8 rounded-full border-2 border-surface bg-brand flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ marginLeft: i === 0 ? 0 : '-0.75rem', zIndex: shown.length - i }}>
                        {name[0].toUpperCase()}
                    </div>;
            })}
            {overflow > 0 && (
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-offset flex items-center justify-center text-text text-xs font-black shrink-0"
                     style={{ marginLeft: '-0.75rem' }}>
                    +{overflow}
                </div>
            )}
        </div>
    );
}

const inputStyle = "w-full px-4 py-2.5 rounded-lg border border-border bg-surface-offset text-text text-sm outline-none transition-colors focus:border-brand";

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

    return (
        <div className="space-y-8 animate-fadeIn pb-24">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="relative z-10">
                    <h2 className="font-display text-3xl md:text-4xl font-bold mb-1 text-text">Events</h2>
                    <p className="font-body text-sm font-semibold text-muted">
                        {upcomingEvents.length === 0
                            ? 'No events planned yet.'
                            : `${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''} coming up`}
                    </p>
                </div>
                {canManageGroup && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="relative z-10 bg-surface text-brand hover:bg-gray-50 px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:-translate-y-1 border-none cursor-pointer"
                    >
                        + Add Event
                    </button>
                )}
            </div>

            {upcomingEvents.length === 0 ? (
                <div className="card-premium bg-surface-offset p-12 text-center">
                    <div className="text-5xl mb-4">🍺</div>
                    <p className="font-display text-2xl font-bold mb-1">No upcoming events</p>
                    <p className="text-muted text-sm font-body font-semibold">
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
                            <div key={event.id} className={`card-premium card-premium-hover flex flex-col sm:flex-row ${isToday ? 'ring-2 ring-error border-error' : ''}`}>
                                <div className={`w-full sm:w-1.5 h-1.5 sm:h-auto shrink-0 ${isToday ? 'bg-error' : days <= 7 ? 'bg-brand' : 'bg-divider'}`} />
                                
                                <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                                <h3 className="text-xl font-black text-text">{event.title}</h3>
                                                <CountdownBadge dateStr={event.date} />
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-bold text-muted uppercase tracking-wide">
                                                <span className="flex items-center gap-1.5">📍 <span className="text-text">{pub?.name || 'Unknown Pub'}</span></span>
                                                <span className="flex items-center gap-1.5">🗓️ <span className="text-text">{formatDate(event.date)}</span></span>
                                                {event.time && <span className="flex items-center gap-1.5">🕖 <span className="text-text">{event.time}</span></span>}
                                            </div>
                                            {event.description && (
                                                <p className="mt-3 text-sm text-text leading-relaxed bg-surface-offset p-3 rounded-lg border border-divider">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>
                                        {canManageGroup && (
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="shrink-0 text-text-faint hover:text-error bg-transparent border-none cursor-pointer transition-colors"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-divider flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex items-center gap-4">
                                            <AvatarStack attendees={event.attendees || []} getAvatar={getAvatar} getUserName={getUserName} />
                                            <button
                                                onClick={() => setExpandedAttendees(expandedAttendees === event.id ? null : event.id)}
                                                className="text-xs font-bold text-muted hover:text-text bg-transparent border-none cursor-pointer transition-colors flex items-center gap-1"
                                            >
                                                {attendeeCount === 0 ? 'No one yet' : `${attendeeCount} going`} {attendeeCount > 0 ? (expandedAttendees === event.id ? '▲' : '▼') : ''}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleToggleAttendance(event.id, isAttending)}
                                            className={`btn-premium shadow-sm ${isAttending ? 'bg-success/20 text-success border-success/20 hover:bg-success/30' : ''}`}
                                        >
                                            {isAttending ? '✓ Going' : 'Join Event'}
                                        </button>
                                    </div>

                                    {expandedAttendees === event.id && attendeeCount > 0 && (
                                        <div className="mt-4 pt-4 border-t border-divider border-dashed flex flex-wrap gap-2">
                                            {attendeeNames.map((name, i) => (
                                                <span key={i} className="bg-surface-offset border border-divider text-text rounded-full px-3 py-1 text-xs font-bold">{name}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {pastEvents.length > 0 && (
                <div className="card-premium p-6 md:p-8">
                    <button
                        onClick={() => setShowPastEvents(v => !v)}
                        className="flex items-center gap-3 text-muted text-sm font-bold bg-transparent border-none cursor-pointer hover:text-text transition-colors w-full text-left"
                    >
                        <span className={`inline-block transition-transform duration-200 ${showPastEvents ? 'rotate-90' : ''}`}>▶</span>
                        Past Events ({pastEvents.length})
                    </button>
                    {showPastEvents && (
                        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-divider">
                            {pastEvents.map(event => {
                                const pub = pubs.find(p => p.id === event.pubId);
                                return (
                                    <div key={event.id} className="flex items-center gap-4 bg-surface-offset p-3 rounded-lg border border-divider">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-text truncate mb-0.5">{event.title}</p>
                                            <p className="text-[10px] text-muted font-bold uppercase tracking-wider">{pub?.name || 'Unknown Pub'} · {formatDate(event.date)}</p>
                                        </div>
                                        <span className="text-xs font-black text-text-faint shrink-0 tabular-nums">{event.attendees?.length || 0} <span className="font-bold">ATTENDED</span></span>
                                        {canManageGroup && (
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="shrink-0 p-2 text-text-faint hover:text-error bg-transparent border-none cursor-pointer transition-colors"
                                            >🗑️</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowAddModal(false)}>
                    <div className="card-premium w-full max-w-md p-0 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-divider flex items-center justify-between bg-surface/90 backdrop-blur z-10 sticky top-0">
                            <h3 className="text-lg font-black text-text">Plan an Event</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-text text-xl font-bold bg-transparent border-none cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleAddEvent} className="p-6 flex flex-col gap-5">
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Event Title *</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Night Crawl" className={inputStyle} required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Pub *</label>
                                <select value={pubId} onChange={e => setPubId(e.target.value)} className={inputStyle} required>
                                    <option value="">Select a pub…</option>
                                    {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Date *</label>
                                    <input type="date" value={date} min={todayMin} onChange={e => setDate(e.target.value)} className={inputStyle} required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Time</label>
                                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Description <span className="font-normal normal-case">(optional)</span></label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any notes or details…" rows={3}
                                    className={`${inputStyle} resize-none`} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-border bg-transparent text-muted font-bold hover:bg-surface-offset transition-colors text-sm cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving}
                                    className={`flex-[2] btn-premium text-sm ${isSaving ? 'opacity-60 cursor-wait' : ''}`}>
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
