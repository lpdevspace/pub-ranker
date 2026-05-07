import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

export default function EventsPage({ db, groupId, pubs, user, canManageGroup, allUsers }) {
    const [events, setEvents] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // New Event Form State
    const [title, setTitle] = useState("");
    const [pubId, setPubId] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");

    // Fetch Events for this group
    useEffect(() => {
        if (!db || !groupId) return;
        const unsubscribe = db.collection('events')
            .where('groupId', '==', groupId)
            .orderBy('date', 'asc')
            .onSnapshot(snap => {
                const now = new Date().toISOString();
                const fetchedEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Filter out old events (keep ones from today onwards)
                const upcoming = fetchedEvents.filter(e => e.date >= now.split('T')[0]);
                setEvents(upcoming);
            });
        return () => unsubscribe();
    }, [db, groupId]);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!title || !pubId || !date) return;
        setIsSaving(true);
        try {
            await db.collection('events').add({
                groupId,
                title: title.trim(),
                pubId,
                date,
                description: description.trim(),
                createdBy: user.uid,
                attendees: [user.uid], // Creator auto-attends
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
        try {
            await db.collection('events').doc(eventId).delete();
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    const handleToggleAttendance = async (eventId, currentlyAttending) => {
        const eventRef = db.collection('events').doc(eventId);
        try {
            if (currentlyAttending) {
                await eventRef.update({ attendees: firebase.firestore.FieldValue.arrayRemove(user.uid) });
            } else {
                await eventRef.update({ attendees: firebase.firestore.FieldValue.arrayUnion(user.uid) });
            }
        } catch (error) {
            console.error("Error toggling attendance", error);
        }
    };

    const getUserName = (uid) => allUsers[uid]?.displayName || allUsers[uid]?.nickname || "User";
    const getAvatar = (uid) => allUsers[uid]?.avatarUrl || null;

    return (
        <div className="space-y-6 animate-fadeIn relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white">📅 Upcoming Events</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Plan your next pub visit.</p>
                </div>
                {canManageGroup && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition"
                    >
                        + Add Event
                    </button>
                )}
            </div>

            {/* Event Cards */}
            {events.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl text-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-4xl mb-3 block">📭</span>
                    <p className="text-gray-500 font-medium">No upcoming events planned. Create one!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.map(event => {
                        const pub = pubs.find(p => p.id === event.pubId);
                        const isAttending = event.attendees?.includes(user.uid);
                        return (
                            <div key={event.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                                {/* Card Header */}
                                <div className="bg-amber-700 p-5 text-white relative">
                                    <h3 className="text-xl font-black">{event.title}</h3>
                                    <p className="text-amber-100 text-sm mt-1">
                                        📍 {pub?.name || 'Unknown Pub'} &nbsp;·&nbsp;
                                        🗓️ {new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                    {canManageGroup && (
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="absolute top-4 right-4 text-amber-200 hover:text-white text-xs font-bold"
                                        >
                                            ✕ Cancel
                                        </button>
                                    )}
                                </div>
                                {/* Card Body */}
                                <div className="p-4">
                                    {event.description && (
                                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{event.description}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendees ({event.attendees?.length || 0})</span>
                                            <div className="flex -space-x-2">
                                                {(event.attendees || []).slice(0, 5).map(uid => {
                                                    const avatar = getAvatar(uid);
                                                    return avatar
                                                        ? <img key={uid} src={avatar} alt={getUserName(uid)} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 object-cover" />
                                                        : <div key={uid} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-amber-500 flex items-center justify-center text-white text-xs font-bold">{getUserName(uid)[0]}</div>;
                                                })}
                                                {(event.attendees?.length || 0) > 5 && <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-200 text-xs font-bold">+{event.attendees.length - 5}</div>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleToggleAttendance(event.id, isAttending)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                                                isAttending
                                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200'
                                                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                                            }`}
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
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="bg-amber-700 text-white p-4 rounded-t-2xl">
                            <h3 className="text-xl font-black">📅 Plan an Event</h3>
                        </div>
                        <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Event Title *</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Night Crawl" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pub *</label>
                                <select value={pubId} onChange={e => setPubId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" required>
                                    <option value="">Select a pub...</option>
                                    {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any notes or details..." rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50">
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
