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
        <span style={{ background: 'var(--color-error)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 800, letterSpacing: '0.04em' }}>TODAY</span>
    );
    if (days === 1) return (
        <span style={{ background: 'var(--color-warning)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 800 }}>TOMORROW</span>
    );
    if (days <= 7) return (
        <span style={{ background: 'var(--color-brand)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 800 }}>{days}d away</span>
    );
    return (
        <span style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 700 }}>{days}d away</span>
    );
}

function AvatarStack({ attendees, getAvatar, getUserName, limit = 6 }) {
    const shown = attendees.slice(0, limit);
    const overflow = attendees.length - limit;
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {shown.map((uid, i) => {
                const avatar = getAvatar(uid);
                const name = getUserName(uid);
                return avatar
                    ? <img key={uid} src={avatar} alt={name} title={name}
                        style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '2px solid var(--color-surface)', objectFit: 'cover', marginLeft: i === 0 ? 0 : '-0.6rem', zIndex: shown.length - i }} />
                    : <div key={uid} title={name}
                        style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '2px solid var(--color-surface)', background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 800, marginLeft: i === 0 ? 0 : '-0.6rem', zIndex: shown.length - i }}>
                        {name[0].toUpperCase()}
                    </div>;
            })}
            {overflow > 0 && (
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '2px solid var(--color-surface)', background: 'var(--color-surface-dynamic)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, marginLeft: '-0.6rem' }}>
                    +{overflow}
                </div>
            )}
        </div>
    );
}

const inputStyle = {
    width: '100%', padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text)',
    outline: 'none', fontSize: 'var(--text-sm)', transition: 'border-color var(--transition-interactive)'
};

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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                        Upcoming Events
                    </h2>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                        {upcomingEvents.length === 0
                            ? 'No events planned yet.'
                            : `${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''} coming up`}
                    </p>
                </div>
                {canManageGroup && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{ background: 'var(--color-brand)', color: '#fff', padding: 'var(--space-2) var(--space-5)', borderRadius: 'var(--radius-lg)', fontWeight: 700, fontSize: 'var(--text-sm)', border: 'none', cursor: 'pointer', transition: 'background var(--transition-interactive)', whiteSpace: 'nowrap', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand-dark)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand)'}
                    >
                        + Add Event
                    </button>
                )}
            </div>

            {/* ── Upcoming Events ── */}
            {upcomingEvents.length === 0 ? (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-12)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🍺</div>
                    <p style={{ color: 'var(--color-text)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>No upcoming events</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        {canManageGroup ? 'Create one to get the group together.' : 'Check back soon — an admin will add one.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {upcomingEvents.map(event => {
                        const pub = pubs.find(p => p.id === event.pubId);
                        const isAttending = event.attendees?.includes(user.uid);
                        const attendeeCount = event.attendees?.length || 0;
                        const days = daysUntil(event.date);
                        const isToday = days === 0;
                        const attendeeNames = (event.attendees || []).map(uid => getUserName(uid));

                        return (
                            <div key={event.id} style={{
                                background: 'var(--color-surface)',
                                borderRadius: 'var(--radius-xl)',
                                boxShadow: isToday ? '0 0 0 2px var(--color-error), var(--shadow-md)' : 'var(--shadow-md)',
                                overflow: 'hidden',
                                border: '1px solid var(--color-border)',
                                transition: 'transform 180ms ease, box-shadow 180ms ease'
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {/* Card accent bar */}
                                <div style={{ height: '4px', background: isToday ? 'var(--color-error)' : days <= 7 ? 'var(--color-brand)' : 'var(--color-surface-dynamic)' }} />

                                {/* Card body */}
                                <div style={{ padding: 'var(--space-5)' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                                                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</h3>
                                                <CountdownBadge dateStr={event.date} />
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                                <span>📍 {pub?.name || 'Unknown Pub'}</span>
                                                <span>🗓️ {formatDate(event.date)}</span>
                                                {event.time && <span>🕖 {event.time}</span>}
                                            </div>
                                            {event.description && (
                                                <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{event.description}</p>
                                            )}
                                        </div>
                                        {canManageGroup && (
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                style={{ flexShrink: 0, padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, cursor: 'pointer', transition: 'all var(--transition-interactive)' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-error-highlight)'; e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.borderColor = 'var(--color-error)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                            >Cancel event</button>
                                        )}
                                    </div>

                                    {/* Attendee row */}
                                    <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                            <AvatarStack attendees={event.attendees || []} getAvatar={getAvatar} getUserName={getUserName} />
                                            <button
                                                onClick={() => setExpandedAttendees(expandedAttendees === event.id ? null : event.id)}
                                                style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                                            >
                                                {attendeeCount === 0 ? 'No one yet' : `${attendeeCount} going`} {attendeeCount > 0 ? (expandedAttendees === event.id ? '▲' : '▼') : ''}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleToggleAttendance(event.id, isAttending)}
                                            style={{
                                                padding: 'var(--space-2) var(--space-5)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all var(--transition-interactive)',
                                                background: isAttending ? 'var(--color-success-highlight)' : 'var(--color-brand)',
                                                color: isAttending ? 'var(--color-success)' : '#fff'
                                            }}
                                            onMouseEnter={e => { if (!isAttending) e.currentTarget.style.background = 'var(--color-brand-dark)'; }}
                                            onMouseLeave={e => { if (!isAttending) e.currentTarget.style.background = 'var(--color-brand)'; }}
                                        >
                                            {isAttending ? '✓ Going' : 'Join'}
                                        </button>
                                    </div>

                                    {/* Expanded attendee name list */}
                                    {expandedAttendees === event.id && attendeeCount > 0 && (
                                        <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                            {attendeeNames.map((name, i) => (
                                                <span key={i} style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-full)', padding: '3px 10px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>{name}</span>
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
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', fontWeight: 700, padding: 0, marginBottom: 'var(--space-3)' }}
                    >
                        <span style={{ transition: 'transform 180ms ease', display: 'inline-block', transform: showPastEvents ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                        Past events ({pastEvents.length})
                    </button>
                    {showPastEvents && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {pastEvents.map(event => {
                                const pub = pubs.find(p => p.id === event.pubId);
                                return (
                                    <div key={event.id} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', opacity: 0.7 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</p>
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>{pub?.name || 'Unknown Pub'} · {formatDate(event.date)}</p>
                                        </div>
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', flexShrink: 0 }}>{event.attendees?.length || 0} attended</span>
                                        {canManageGroup && (
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                style={{ flexShrink: 0, padding: '2px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.borderColor = 'var(--color-error)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-faint)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
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
                    style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '30rem', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>Plan an Event</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
                        </div>

                        {/* Modal form */}
                        <form onSubmit={handleAddEvent} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Event Title *</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Night Crawl" style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Pub *</label>
                                <select value={pubId} onChange={e => setPubId(e.target.value)} style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'} required>
                                    <option value="">Select a pub…</option>
                                    {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Date *</label>
                                    <input type="date" value={date} min={todayMin} onChange={e => setDate(e.target.value)} style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--color-border)'} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Time</label>
                                    <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Description <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any notes or details…" rows={3}
                                    style={{ ...inputStyle, resize: 'none' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    style={{ flex: 1, padding: 'var(--space-2) 0', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text-muted)', fontWeight: 700, cursor: 'pointer', transition: 'background var(--transition-interactive)', fontSize: 'var(--text-sm)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving}
                                    style={{ flex: 2, padding: 'var(--space-2) 0', borderRadius: 'var(--radius-lg)', background: 'var(--color-brand)', color: '#fff', fontWeight: 900, border: 'none', cursor: 'pointer', opacity: isSaving ? 0.6 : 1, transition: 'background var(--transition-interactive)', fontSize: 'var(--text-sm)' }}
                                    onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'var(--color-brand-dark)'; }}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand)'}>
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
