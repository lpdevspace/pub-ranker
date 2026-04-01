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
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white transition-colors">Upcoming Events</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">See what the group is planning and RSVP.</p>
                </div>
                {canManageGroup && (
                    <button onClick={() => setShowAddModal(true)} className="bg-brand text-white font-bold px-6 py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition transform hover:scale-105">
                        📅 Schedule Event
                    </button>
                )}
            </div>

            {events.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-6xl mb-4 block">🎫</span>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Upcoming Events</h3>
                    <p className="text-gray-500 dark:text-gray-400">The social calendar is currently empty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => {
                        const pub = pubs.find(p => p.id === event.pubId) || { name: 'Unknown Pub', location: 'Unknown' };
                        const attendees = event.attendees || [];
                        const isAttending = attendees.includes(user.uid);
                        const eventDate = new Date(event.date);

                        return (
                            <div key={event.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col group transition-all hover:shadow-md">
                                <div className="bg-gradient-to-br from-blue-600 to-brand p-5 text-white relative">
                                    {canManageGroup && (
                                        <button onClick={() => handleDeleteEvent(event.id)} className="absolute top-3 right-3 text-white/50 hover:text-white transition" title="Cancel Event">✕</button>
                                    )}
                                    <div className="bg-white/20 inline-block px-3 py-1 rounded-lg backdrop-blur-sm mb-3">
                                        <p className="text-xs font-black uppercase tracking-wider">
                                            {eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <h3 className="text-2xl font-black leading-tight mb-1">{event.title}</h3>
                                    <p className="text-blue-100 font-medium flex items-center gap-1">📍 {pub.name}</p>
                                </div>
                                
                                <div className="p-5 flex-1 flex flex-col">
                                    {event.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 italic">
                                            "{event.description}"
                                        </p>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{attendees.length} Attending</span>
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {attendees.slice(0, 5).map(uid => (
                                                    getAvatar(uid) ? 
                                                    <img key={uid} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800 object-cover" src={getAvatar(uid)} alt="" title={getUserName(uid)} /> :
                                                    <div key={uid} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800 bg-brand flex items-center justify-center text-white text-[10px] font-bold" title={getUserName(uid)}>{getUserName(uid).charAt(0).toUpperCase()}</div>
                                                ))}
                                                {attendees.length > 5 && (
                                                    <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px] font-bold">+{attendees.length - 5}</div>
                                                )}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleToggleAttendance(event.id, isAttending)}
                                            className={`w-full py-2.5 rounded-xl font-black text-sm transition-all shadow-sm ${isAttending ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600'}`}
                                        >
                                            {isAttending ? '✅ Attending' : '🎟️ RSVP "I\'m Going"'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ADD EVENT MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 relative">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition">✕</button>
                        
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Schedule Event</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Create a meetup at one of your pubs.</p>
                        
                        <form onSubmit={handleAddEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Event Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Pub Quiz" className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none" required />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Select Pub</label>
                                <select value={pubId} onChange={e => setPubId(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none" required>
                                    <option value="">-- Choose a Pub --</option>
                                    {pubs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date & Time</label>
                                <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none" required />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Details (Optional)</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Meet by the pool tables at 8pm..." className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand outline-none h-20 resize-none" />
                            </div>
                            
                            <div className="pt-2">
                                <button type="submit" disabled={isSaving || !title || !pubId || !date} className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:opacity-80 transition shadow-md disabled:opacity-50">
                                    {isSaving ? 'Scheduling...' : 'Post Event to Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}