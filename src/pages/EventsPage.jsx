import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    Plus,
    Trash2,
    CheckCircle2,
    X,
    ChevronDown,
    Building2,
    Beer
} from 'lucide-react';
import { firebase } from '../firebase';
import { useToastContext } from '../context/ToastContext';
import { SAMPLE_EVENTS } from '../data/sampleTavernData';

/* ── helpers ─────────────────────────────────────────────── */
function daysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function CountdownBadge({ dateStr }) {
    const days = daysUntil(dateStr);
    if (days === 0) {
        return (
            <span className="bg-red-500 text-white rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider animate-pulse">
                Today
            </span>
        );
    }
    if (days === 1) {
        return (
            <span className="bg-amber-500 text-stone-900 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                Tomorrow
            </span>
        );
    }
    if (days <= 7) {
        return (
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {days} days away
            </span>
        );
    }
    return (
        <span className="bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {days} days away
        </span>
    );
}

function AvatarStack({ attendees, getAvatar, getUserName, limit = 5 }) {
    const shown = attendees.slice(0, limit);
    const overflow = attendees.length - limit;
    return (
        <div className="flex items-center">
            {shown.map((uid, i) => {
                const avatar = getAvatar(uid);
                const name = getUserName(uid);
                return (
                    <div
                        key={uid}
                        title={name}
                        className="w-7 h-7 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-offset)] overflow-hidden shrink-0"
                        style={{ marginLeft: i === 0 ? 0 : '-0.5rem', zIndex: shown.length - i }}
                    >
                        {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-[var(--color-brand)] bg-amber-500/10">
                                {name[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                );
            })}
            {overflow > 0 && (
                <div
                    className="w-7 h-7 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-offset)] flex items-center justify-center text-[var(--color-text)] text-[10px] font-bold shrink-0"
                    style={{ marginLeft: '-0.5rem' }}
                >
                    +{overflow}
                </div>
            )}
        </div>
    );
}

export default function EventsPage({
    db,
    groupId,
    pubs = [],
    user,
    canManageGroup,
    allUsers = {}
}) {
    const { showToast } = useToastContext();
    const [events, setEvents] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPastEvents, setShowPastEvents] = useState(false);
    const [expandedAttendees, setExpandedAttendees] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [pubId, setPubId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('19:00');
    const [description, setDescription] = useState('');

    const [venueEvents, setVenueEvents] = useState([]);

    useEffect(() => {
        if (!groupId) return;
        if (groupId === 'demo-group') {
            setEvents(SAMPLE_EVENTS);
            return;
        }
        if (!db) return;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const unsubscribeGroup = db.collection('events')
            .where('groupId', '==', groupId)
            .orderBy('date', 'asc')
            .onSnapshot(snap => {
                setEvents(
                    snap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(e => e.date >= cutoff)
                );
            });

        // Fetch venue-hosted events for pubs in this group
        const pubIds = pubs.map(p => p.id);
        const unsubscribes = [];

        if (pubIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < pubIds.length; i += 10) {
                chunks.push(pubIds.slice(i, i + 10));
            }

            chunks.forEach(chunk => {
                const unsub = db.collection('events')
                    .where('groupId', '==', 'venue')
                    .where('pubId', 'in', chunk)
                    .onSnapshot(snap => {
                        const chunkEvents = snap.docs
                            .map(doc => ({ id: doc.id, ...doc.data() }))
                            .filter(e => e.date >= cutoff);

                        setVenueEvents(prev => {
                            const otherChunks = prev.filter(e => !chunk.includes(e.pubId));
                            return [...otherChunks, ...chunkEvents].sort((a, b) => a.date.localeCompare(b.date));
                        });
                    });
                unsubscribes.push(unsub);
            });
        }

        return () => {
            unsubscribeGroup();
            unsubscribes.forEach(u => u());
        };
    }, [db, groupId, pubs]);

    const allEvents = useMemo(() => {
        return [...events, ...venueEvents].sort((a, b) => a.date.localeCompare(b.date));
    }, [events, venueEvents]);

    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = useMemo(() => allEvents.filter(e => e.date >= today), [allEvents, today]);
    const pastEvents = useMemo(() => allEvents.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date)), [allEvents, today]);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!title.trim() || !pubId || !date) {
            showToast('Please fill all required event fields', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await db.collection('events').add({
                groupId,
                title: title.trim(),
                pubId,
                date,
                time: time || '19:00',
                description: description.trim(),
                createdBy: user?.uid || 'anonymous',
                attendees: user?.uid ? [user.uid] : [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Tavern gathering created!', 'success');
            setShowAddModal(false);
            setTitle('');
            setPubId('');
            setDate('');
            setTime('19:00');
            setDescription('');
        } catch (err) {
            console.error('Error creating event:', err);
            showToast('Failed to create event', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await db.collection('events').doc(eventId).delete();
            showToast('Event removed', 'info');
        } catch (err) {
            console.error('Error deleting event:', err);
            showToast('Failed to delete event', 'error');
        }
    };

    const handleToggleAttendance = async (eventId, currentlyAttending) => {
        if (!user?.uid) return;
        const ref = db.collection('events').doc(eventId);
        try {
            await ref.update({
                attendees: currentlyAttending
                    ? firebase.firestore.FieldValue.arrayRemove(user.uid)
                    : firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
            showToast(currentlyAttending ? 'RSVP withdrawn' : 'RSVP confirmed — see you there!', 'success');
        } catch (err) {
            console.error('Error toggling attendance:', err);
        }
    };

    const getUserName = (uid) => allUsers[uid]?.displayName || allUsers[uid]?.nickname || 'Member';
    const getAvatar = (uid) => allUsers[uid]?.avatarUrl || null;
    const todayMin = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6 animate-fadeIn pb-24 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[var(--color-divider)] pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">📅</span>
                        <h1 className="font-display text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight">
                            Pub Meets & Events
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                        {upcomingEvents.length === 0
                            ? 'No gatherings on the schedule.'
                            : `${upcomingEvents.length} upcoming rendezvous across your venues.`}
                    </p>
                </div>

                {canManageGroup && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-fun-primary !py-2.5 !px-5 text-xs font-extrabold flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Plan Meet</span>
                    </button>
                )}
            </div>

            {/* Upcoming Events List */}
            {upcomingEvents.length === 0 ? (
                <div className="card-tavern p-12 text-center border border-[var(--color-border)]">
                    <div className="text-4xl mb-3">🍺</div>
                    <h3 className="font-display text-2xl text-[var(--color-text)]">
                        No upcoming pub meets
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mt-1 mb-5">
                        {canManageGroup
                            ? 'Gather your crew for a pint session. Create the first meet!'
                            : 'Check back soon — an admin will schedule the next crawl or tavern meetup.'}
                    </p>
                    {canManageGroup && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-brand text-xs px-4 py-2 inline-flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Schedule Event</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {upcomingEvents.map(event => {
                        const pub = pubs.find(p => p.id === event.pubId);
                        const isAttending = event.attendees?.includes(user?.uid);
                        const attendeeCount = event.attendees?.length || 0;
                        const days = daysUntil(event.date);
                        const isToday = days === 0;
                        const attendeeNames = (event.attendees || []).map(uid => getUserName(uid));

                        return (
                            <div
                                key={event.id}
                                className={`card-tavern p-5 sm:p-6 border transition flex flex-col sm:flex-row gap-5 ${
                                    isToday
                                        ? 'border-amber-500 bg-amber-500/5'
                                        : 'border-[var(--color-border)]'
                                }`}
                            >
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-display text-2xl text-[var(--color-text)]">
                                            {event.title}
                                        </h3>
                                        {event.isVenueEvent && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                <span>Official Venue Event</span>
                                            </span>
                                        )}
                                        <CountdownBadge dateStr={event.date} />
                                    </div>

                                    {/* Meta pills */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
                                        <span className="flex items-center gap-1 font-semibold text-[var(--color-text)]">
                                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                            <span>{pub?.name || 'Local Tavern'}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <span>{formatDate(event.date)}</span>
                                        </span>
                                        {event.time && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                <span>{event.time}</span>
                                            </span>
                                        )}
                                    </div>

                                    {event.description && (
                                        <p className="text-xs text-[var(--color-text)] leading-relaxed p-3 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-divider)]">
                                            {event.description}
                                        </p>
                                    )}

                                    {/* Attendees Stack */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <AvatarStack
                                            attendees={event.attendees || []}
                                            getAvatar={getAvatar}
                                            getUserName={getUserName}
                                        />
                                        <button
                                            onClick={() => setExpandedAttendees(expandedAttendees === event.id ? null : event.id)}
                                            className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1"
                                        >
                                            <span>{attendeeCount === 0 ? 'Be first to RSVP' : `${attendeeCount} attending`}</span>
                                            {attendeeCount > 0 && (
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedAttendees === event.id ? 'rotate-180' : ''}`} />
                                            )}
                                        </button>
                                    </div>

                                    {expandedAttendees === event.id && attendeeCount > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                            {attendeeNames.map((name, i) => (
                                                <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface-offset)] text-[var(--color-text)] border border-[var(--color-border)]">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right Side Actions: RSVP & Admin Delete */}
                                <div className="sm:border-l sm:border-[var(--color-divider)] sm:pl-5 flex sm:flex-col justify-between sm:justify-center items-end sm:items-stretch gap-3 shrink-0">
                                    <button
                                        onClick={() => handleToggleAttendance(event.id, isAttending)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                            isAttending
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                                : 'btn-brand shadow-sm'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>{isAttending ? 'Going ✓' : 'RSVP Going'}</span>
                                    </button>

                                    {canManageGroup && !event.isVenueEvent && (
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-2 text-[var(--color-text-faint)] hover:text-red-500 rounded-lg transition self-end sm:self-center"
                                            title="Delete event"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Past Events Collapsible */}
            {pastEvents.length > 0 && (
                <div className="card-tavern p-5 border border-[var(--color-border)]">
                    <button
                        onClick={() => setShowPastEvents(v => !v)}
                        className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                        <span>Archive: Past Gatherings ({pastEvents.length})</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showPastEvents ? 'rotate-180' : ''}`} />
                    </button>

                    {showPastEvents && (
                        <div className="divide-y divide-[var(--color-divider)] mt-4 pt-2">
                            {pastEvents.map(event => {
                                const pub = pubs.find(p => p.id === event.pubId);
                                return (
                                    <div key={event.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                                        <div className="truncate">
                                            <p className="font-semibold text-[var(--color-text)] truncate">{event.title}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                                                {pub?.name || 'Local Pub'} · {formatDate(event.date)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[10px] font-bold text-[var(--color-text-faint)]">
                                                {event.attendees?.length || 0} Attended
                                            </span>
                                            {canManageGroup && !event.isVenueEvent && (
                                                <button
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="p-1 text-[var(--color-text-faint)] hover:text-red-500"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Add Event Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
                    <div className="card-tavern bg-[var(--color-surface)] p-6 sm:p-7 rounded-2xl w-full max-w-md border border-[var(--color-border)] shadow-2xl relative space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3">
                            <h3 className="font-display text-2xl text-[var(--color-text)]">
                                Plan a Pub Meet
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddEvent} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                    Meet Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Friday Ale Trail & Quiz"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-brand)]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                    Target Pub *
                                </label>
                                <select
                                    required
                                    value={pubId}
                                    onChange={e => setPubId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-brand)] cursor-pointer"
                                >
                                    <option value="">Select a tavern…</option>
                                    {pubs.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        min={todayMin}
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-brand)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-brand)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Meeting by the fire, table booked under 'Pub Ranker'…"
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-brand)] resize-none"
                                />
                            </div>

                            <div className="flex gap-2.5 pt-3 border-t border-[var(--color-divider)]">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-tavern flex-1 text-xs py-2.5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="btn-brand flex-[2] text-xs py-2.5 font-bold disabled:opacity-50"
                                >
                                    {isSaving ? 'Creating…' : 'Schedule Meet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
