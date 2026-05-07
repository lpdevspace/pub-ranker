import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

export default function EventsPage({ db, groupId, pubs, user, canManageGroup, allUsers }) {
    const [events, setEvents] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [pubId, setPubId] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (!db || !groupId) return;
        const unsubscribe = db.collection('events')
            .where('groupId', '==', groupId)
            .orderBy('date', 'asc')
            .onSnapshot(snap => {
                const now = new Date().toISOString();
                const fetchedEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setEvents(fetchedEvents.filter(e => e.date >= now.split('T')[0]));
            });
        return () => unsubscribe();
    }, [db, groupId]);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!title || !pubId || !date) return;
        setIsSaving(true);
        try {
            await db.collection('events').add({
                groupId, title: title.trim(), pubId, date,
                description: description.trim(),
                createdBy: user.uid,
                attendees: [user.uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setShowAddModal(false);
            setTitle(""); setPubId(""); setDate(""); setDescription("");
        } catch (error) {
            alert("Failed to create event: " + error.message);
        }
        setIsSaving(false);
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("Are you sure you want to cancel and delete this event?")) return;
        try { await db.collection('events').doc(eventId).delete(); }
        catch (error) { console.error("Error deleting event:", error); }
    };

    const handleToggleAttendance = async (eventId, currentlyAttending) => {
        const eventRef = db.collection('events').doc(eventId);
        try {
            if (currentlyAttending) {
                await eventRef.update({ attendees: firebase.firestore.FieldValue.arrayRemove(user.uid) });
            } else {
                await eventRef.update({ attendees: firebase.firestore.FieldValue.arrayUnion(user.uid) });
            }
        } catch (error) { console.error("Error toggling attendance", error); }
    };

    const getUserName = (uid) => allUsers[uid]?.displayName || allUsers[uid]?.nickname || "User";
    const getAvatar = (uid) => allUsers[uid]?.avatarUrl || null;

    const inputStyle = {
        width: '100%', padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
        background: 'var(--color-surface)', color: 'var(--color-text)',
        outline: 'none', fontSize: 'var(--text-base)'
    };

    return (
        <div className="space-y-6 animate-fadeIn relative">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>📅 Upcoming Events</h2>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Plan your next pub visit.</p>
                </div>
                {canManageGroup && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{ background: 'var(--color-brand)', color: '#fff', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-lg)', fontWeight: 700, fontSize: 'var(--text-sm)', border: 'none', cursor: 'pointer', transition: 'background var(--transition-interactive)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand-dark)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand)'}
                    >
                        + Add Event
                    </button>
                )}
            </div>

            {/* Event Cards */}
            {events.length === 0 ? (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-3)' }}>📭</span>
                    <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No upcoming events planned. Create one!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {events.map(event => {
                        const pub = pubs.find(p => p.id === event.pubId);
                        const isAttending = event.attendees?.includes(user.uid);
                        return (
                            <div key={event.id} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                {/* Card Header */}
                                <div style={{ background: 'var(--color-brand)', padding: 'var(--space-5)', color: '#fff', position: 'relative' }}>
                                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, fontFamily: 'var(--font-display)' }}>{event.title}</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                                        📍 {pub?.name || 'Unknown Pub'} &nbsp;·&nbsp;
                                        🗓️ {new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                    {canManageGroup && (
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 700 }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                                        >✕ Cancel</button>
                                    )}
                                </div>
                                {/* Card Body */}
                                <div style={{ padding: 'var(--space-4)' }}>
                                    {event.description && (
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>{event.description}</p>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendees ({event.attendees?.length || 0})</span>
                                            <div style={{ display: 'flex', marginLeft: '-0.5rem' }}>
                                                {(event.attendees || []).slice(0, 5).map(uid => {
                                                    const avatar = getAvatar(uid);
                                                    return avatar
                                                        ? <img key={uid} src={avatar} alt={getUserName(uid)} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', border: '2px solid var(--color-surface)', objectFit: 'cover', marginLeft: '-0.5rem' }} />
                                                        : <div key={uid} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', border: '2px solid var(--color-surface)', background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700, marginLeft: '-0.5rem' }}>{getUserName(uid)[0]}</div>;
                                                })}
                                                {(event.attendees?.length || 0) > 5 && <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', border: '2px solid var(--color-surface)', background: 'var(--color-surface-dynamic)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, marginLeft: '-0.5rem' }}>+{event.attendees.length - 5}</div>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleToggleAttendance(event.id, isAttending)}
                                            style={{
                                                padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'background var(--transition-interactive)',
                                                background: isAttending ? 'var(--color-success-highlight)' : 'var(--color-brand-highlight)',
                                                color: isAttending ? 'var(--color-success)' : 'var(--color-brand)'
                                            }}
                                        >
                                            {isAttending ? '✅ Attending' : '+ Join'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Event Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }} onClick={() => setShowAddModal(false)}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '28rem' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'var(--color-brand)', color: '#fff', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}>
                            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, fontFamily: 'var(--font-display)' }}>📅 Plan an Event</h3>
                        </div>
                        <form onSubmit={handleAddEvent} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Event Title *</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Night Crawl" style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Pub *</label>
                                <select value={pubId} onChange={e => setPubId(e.target.value)} style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'} required>
                                    <option value="">Select a pub...</option>
                                    {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Date *</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Description (optional)</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any notes or details..." rows={3}
                                    style={{ ...inputStyle, resize: 'none' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    style={{ flex: 1, padding: 'var(--space-2) 0', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text-muted)', fontWeight: 700, cursor: 'pointer', transition: 'background var(--transition-interactive)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving}
                                    style={{ flex: 1, padding: 'var(--space-2) 0', borderRadius: 'var(--radius-lg)', background: 'var(--color-brand)', color: '#fff', fontWeight: 900, border: 'none', cursor: 'pointer', opacity: isSaving ? 0.5 : 1, transition: 'background var(--transition-interactive)' }}
                                    onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'var(--color-brand-dark)'; }}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand)'}>
                                    {isSaving ? 'Saving...' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
