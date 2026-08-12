import React, { useState, useEffect, useMemo } from 'react';
import ImageUploader from '../components/ImageUploader';
import { firebase } from '../firebase';

/* ── helpers ────────────────────────────────────────────────────────────────── */
const safeTime = (date) => {
    if (!date) return Date.now();
    if (typeof date.toMillis === 'function') return date.toMillis();
    return Date.now();
};

function relativeTime(date) {
    if (!date) return '';
    const diff = Math.floor((Date.now() - safeTime(date)) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(safeTime(date)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function avatarColor(name) {
    const AVATAR_COLORS = ['#b45309','#7c3aed','#0369a1','#047857','#dc2626','#c2410c','#4338ca','#0f766e'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getTier(avg, count) {
    if (count === 0) return { label: 'Unrated', color: 'text-text-muted' };
    if (avg >= 8.5)  return { label: 'Legendary', color: 'text-brand' };
    if (avg >= 7.0)  return { label: 'Great', color: 'text-brand' };
    if (avg >= 5.0)  return { label: 'Average', color: 'text-warning' };
    return           { label: 'Avoid', color: 'text-error' };
}

/* ── Sub Components ──────────────────────────────────────────────────────────── */

function ReviewCard({ score, currentUser, groupRef, allUsers, canDelete, onDelete }) {
    const userName = allUsers[score.userId]?.nickname || allUsers[score.userId]?.displayName || score.userName || 'User';
    return (
        <div className="p-3 bg-surface rounded-xl border border-border shadow-sm flex flex-col gap-2 relative group">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-inner"
                        style={{ backgroundColor: avatarColor(userName) }}
                    >
                        {initials(userName)}
                    </div>
                    <span className="text-xs font-bold text-text">{userName}</span>
                </div>
                {canDelete && (
                    <button onClick={() => onDelete(score)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-error font-bold uppercase cursor-pointer hover:underline border-none bg-transparent">Remove</button>
                )}
            </div>
            <p className="text-sm font-semibold text-muted italic pl-8">"{score.value}"</p>
        </div>
    );
}

function CriteriaBar({ name, average, scores, type, allUsers, canDeleteScore, onDeleteScore }) {
    const [expanded, setExpanded] = useState(false);
    if (type !== 'scale') return null;

    return (
        <div className="flex flex-col border-b border-border last:border-0">
            <div 
                className="flex justify-between items-center py-3 px-4 group hover:bg-surface-offset transition-colors cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <span className="font-body font-semibold text-sm text-text">{name}</span>
                    {scores.length > 0 && (
                        <span className="text-[10px] text-text-muted bg-surface-offset border border-border px-1.5 py-0.5 rounded-md font-bold leading-none">{scores.length}</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {scores.length > 0 ? (
                        <span className="font-display font-bold text-lg text-brand tabular-nums">{average.toFixed(1)}</span>
                    ) : (
                        <span className="font-body text-xs text-muted italic">No ratings</span>
                    )}
                    <span className={`text-text-muted transition-transform duration-200 text-xs ${expanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
            </div>
            
            {expanded && scores.length > 0 && (
                <div className="px-4 pb-3 pt-1 space-y-2 bg-surface/50 animate-fadeIn">
                    {scores.map(s => {
                        const userName = allUsers?.[s.userId]?.nickname || allUsers?.[s.userId]?.displayName || s.userName || 'User';
                        const canDelete = canDeleteScore && canDeleteScore(s);
                        return (
                            <div key={s.id} className="flex justify-between items-center bg-surface-offset p-2 rounded-lg border border-border shadow-sm group">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-inner"
                                        style={{ backgroundColor: avatarColor(userName) }}
                                    >
                                        {initials(userName)}
                                    </div>
                                    <span className="text-xs font-bold text-text-muted">{userName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-display font-bold text-sm text-text tabular-nums">{s.value.toFixed(1)}</span>
                                    {canDelete && (
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteScore(s); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-error font-bold uppercase cursor-pointer hover:underline border-none bg-transparent">Remove</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function PubDetailModal({ pub, breakdown, allUsers, currentUser, currentGroup, groupRef, pubsRef, db, onClose, canManageGroup, onSelectPub }) {
    const canDeleteScore = (s) => !!(currentUser && currentGroup && (currentGroup.ownerUid === currentUser.uid || currentGroup.managers?.includes(currentUser.uid)));

    const [venueEvents, setVenueEvents] = React.useState([]);
    const [menuItems, setMenuItems] = React.useState([]);
    const [triviaSession, setTriviaSession] = React.useState(null);
    const [feedbackText, setFeedbackText] = React.useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = React.useState(false);

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (!feedbackText.trim() || !currentUser) return;
        setIsSubmittingFeedback(true);
        try {
            await db.collection('messages').add({
                venueId: pub.id,
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                text: feedbackText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            setFeedbackText('');
            setShowFeedbackForm(false);
            alert("Feedback sent directly to the venue manager!");
        } catch (err) {
            console.error("Error sending feedback:", err);
            alert("Failed to send feedback.");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    React.useEffect(() => {
        if (!db || !pub?.id) return;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const unsub = db.collection('events')
            .where('groupId', '==', 'venue')
            .where('pubId', '==', pub.id)
            .onSnapshot(snap => {
                setVenueEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(e => e.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date)));
            });

        const unsubMenu = pubsRef.doc(pub.id).collection('menu').orderBy('createdAt', 'asc').onSnapshot(snap => {
            setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubTrivia = pubsRef.doc(pub.id).collection('trivia').doc('liveSession').onSnapshot(doc => {
            if (doc.exists && doc.data().isActive) {
                setTriviaSession(doc.data());
            } else {
                setTriviaSession(null);
            }
        });

        return () => {
            unsub();
            unsubMenu();
            unsubTrivia();
        };
    }, [db, pubsRef, pub?.id]);

    const handleDeleteScore = async (score) => {
        if (!groupRef || !score?.id) return;
        if (!window.confirm('Delete this rating?')) return;
        try { await groupRef.collection('scores').doc(score.id).delete(); }
        catch (e) { console.error(e); }
    };

    const handleUpdateBusyStatus = async (status) => {
        if (!pubsRef || !pub?.id) return;
        try {
            await pubsRef.doc(pub.id).update({
                busyStatus: status,
                busyStatusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                busyStatusUpdatedBy: currentUser?.uid || 'anonymous'
            });
            // Update local object optimistically to avoid flash if not synced back immediately
            pub.busyStatus = status;
            pub.busyStatusUpdatedAt = { toMillis: () => Date.now() }; // Mock timestamp for local render
        } catch(e) {
            console.error('Failed to update busy status:', e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
            <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-border flex flex-col relative">
                
                {/* Hero Header */}
                <div className="relative h-48 sm:h-56 shrink-0 w-full group">
                    {pub.photoURL ? (
                        <img src={pub.photoURL} alt={pub.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-offset" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center font-bold border border-white/20 shadow-sm z-10 cursor-pointer">✕</button>

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex justify-between items-end gap-4">
                            <div>
                                <h2 className="text-3xl font-display font-bold text-white leading-tight drop-shadow-md truncate max-w-sm">{pub.name}</h2>
                                <p className="text-white/80 font-body text-sm font-semibold mt-1">📍 {pub.location || 'Unknown'}</p>
                                {pub.amenities && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {pub.amenities.isDogFriendly && <span className="bg-black/50 text-white border border-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-md">🐶 Dog Friendly</span>}
                                        {pub.amenities.hasSportsTv && <span className="bg-black/50 text-white border border-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-md">📺 Live Sports</span>}
                                        {pub.amenities.hasBeerGarden && <span className="bg-black/50 text-white border border-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-md">🌳 Beer Garden</span>}
                                        {pub.amenities.wheelchairAccessible && <span className="bg-black/50 text-white border border-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-md">♿ Accessible</span>}
                                        {pub.amenities.servesFood && <span className="bg-black/50 text-white border border-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-md">🍔 Food</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-center bg-black/40 backdrop-blur-md rounded-xl p-2 px-3 border border-white/20 shadow-lg shrink-0">
                                <span className="text-white font-black text-2xl leading-none">
                                    {pub.ratingCount > 0 ? pub.avgScore.toFixed(1) : '-'}
                                </span>
                                <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${pub.ratingCount > 0 ? pub.color : 'text-white/60'}`}>
                                    {pub.tierLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 bg-surface">
                    
                    <button
                        onClick={() => {
                            onClose();
                            if (onSelectPub) onSelectPub(pub);
                        }}
                        className="w-full bg-brand text-white py-3 rounded-xl font-bold font-body hover:bg-brand-dark transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                        ⭐ Rate this Pub
                    </button>

                    {/* Live Busy Meter */}
                    <div className="bg-surface-offset p-4 rounded-2xl border border-divider">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                                🚦 Live Busy Meter
                            </h3>
                            {pub.busyStatusUpdatedAt && (
                                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                                    Updated {new Date(pub.busyStatusUpdatedAt?.toMillis ? pub.busyStatusUpdatedAt.toMillis() : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleUpdateBusyStatus('quiet')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                    pub.busyStatus === 'quiet' 
                                        ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' 
                                        : 'bg-surface border-border text-muted hover:text-text'
                                }`}
                            >
                                😴 Quiet
                            </button>
                            <button 
                                onClick={() => handleUpdateBusyStatus('lively')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                    pub.busyStatus === 'lively' 
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' 
                                        : 'bg-surface border-border text-muted hover:text-text'
                                }`}
                            >
                                🍻 Lively
                            </button>
                            <button 
                                onClick={() => handleUpdateBusyStatus('packed')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                    pub.busyStatus === 'packed' 
                                        ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' 
                                        : 'bg-surface border-border text-muted hover:text-text'
                                }`}
                            >
                                🔥 Packed
                            </button>
                        </div>
                    </div>

                    {/* Live Pub Trivia */}
                    {triviaSession && (
                        <div className="bg-brand/10 p-5 rounded-2xl border-2 border-brand/30 relative overflow-hidden shadow-sm">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Live</span>
                            </div>
                            <h3 className="font-display text-lg font-black text-brand mb-1 flex items-center gap-2">
                                🧠 Live Pub Trivia
                            </h3>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-3">{triviaSession.currentQuestion}</p>
                            
                            {triviaSession.showAnswer && (
                                <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider block mb-1">Answer:</span>
                                    <span className="text-sm font-bold text-green-900 dark:text-green-100">{triviaSession.currentAnswer}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live Tap List / Menu */}
                    {menuItems.length > 0 && (
                        <div className="bg-surface-offset p-5 rounded-2xl border border-divider">
                            <h3 className="font-display text-sm font-bold text-text flex items-center gap-2 mb-4">
                                🍺 Live Menu
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {menuItems.map(item => (
                                    <div key={item.id} className="p-3 bg-surface rounded-xl border border-border flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm text-text flex items-center gap-1.5">
                                                {item.type === 'beer' ? '🍺' : item.type === 'wine' ? '🍷' : item.type === 'cocktail' ? '🍸' : '🍔'}
                                                {item.name}
                                            </h4>
                                            <p className="text-xs text-muted mt-0.5">{item.description}</p>
                                        </div>
                                        <span className="font-bold text-brand text-sm shrink-0">£{parseFloat(item.price).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message Manager (Feedback) */}
                    <div className="bg-surface-offset p-5 rounded-2xl border border-divider">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="font-display text-sm font-bold text-text flex items-center gap-2">
                                    💬 Message the Manager
                                </h3>
                                <p className="text-xs text-muted mt-1">Send private feedback directly to the venue owner.</p>
                            </div>
                            <button 
                                onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                                className="px-4 py-2 bg-brand-subtle text-brand font-bold rounded-lg text-xs"
                            >
                                {showFeedbackForm ? 'Cancel' : 'Send Message'}
                            </button>
                        </div>
                        
                        {showFeedbackForm && (
                            <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-3 animate-fadeIn">
                                <textarea 
                                    required
                                    value={feedbackText}
                                    onChange={e => setFeedbackText(e.target.value)}
                                    placeholder="Write your feedback here (e.g. The music is a bit too loud, or the service was excellent!)..."
                                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm min-h-[100px] resize-none"
                                />
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingFeedback}
                                    className="w-full py-3 bg-brand text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                                >
                                    {isSubmittingFeedback ? 'Sending...' : 'Send Privately'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Venue Events */}
                    {venueEvents.length > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-surface dark:from-blue-900/20 dark:to-surface border border-blue-200 dark:border-blue-800/50 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                            <h3 className="font-display text-lg font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2 relative z-10">
                                🏢 Official Venue Events
                            </h3>
                            <div className="space-y-3 relative z-10">
                                {venueEvents.map(event => {
                                    const dateObj = new Date(event.date + 'T' + event.time);
                                    return (
                                        <div key={event.id} className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col gap-2">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-text mb-1">{event.title}</h4>
                                                    <div className="flex gap-2 items-center text-xs font-bold text-muted uppercase tracking-wider">
                                                        <span>🗓️ {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                        <span>🕖 {event.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {event.description && (
                                                <p className="text-sm text-text bg-surface-offset p-2.5 rounded-lg border border-divider mt-1">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* AI Insights */}
                    {(pub.vibeSummary || (pub.aiTags && pub.aiTags.length > 0)) && (
                        <div className="bg-gradient-to-br from-brand-subtle to-surface border border-brand/20 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 text-brand pointer-events-none">
                                <span className="text-6xl">✨</span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-brand mb-3 flex items-center gap-2 relative z-10">
                                ✨ AI Insights
                            </h3>
                            
                            {pub.vibeSummary && (
                                <p className="text-sm text-text font-body leading-relaxed mb-4 italic relative z-10">
                                    "{pub.vibeSummary}"
                                </p>
                            )}

                            {pub.aiTags && pub.aiTags.length > 0 && (
                                <div className="flex flex-wrap gap-2 relative z-10">
                                    {pub.aiTags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-surface border border-brand/30 text-[10px] font-bold text-brand rounded-md uppercase tracking-wider shadow-sm">
                                            #{tag.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Score Breakdown */}
                    <div>
                        <h3 className="font-display text-lg font-bold text-text mb-4">Score Breakdown</h3>
                        <div className="card-premium p-0 flex flex-col">
                            {Object.values(breakdown).filter(d => d.type === 'scale').map(data => (
                                <CriteriaBar key={data.name} name={data.name} average={data.average} scores={data.scores} type={data.type} allUsers={allUsers} canDeleteScore={canDeleteScore} onDeleteScore={handleDeleteScore} />
                            ))}
                        </div>
                    </div>

                    {/* Text Reviews / Notes */}
                    {Object.values(breakdown).filter(d => d.type === 'text' && d.scores.length > 0).map(data => (
                        <div key={data.name}>
                            <h3 className="font-display text-lg font-bold text-text mb-4">{data.name}</h3>
                            <div className="space-y-3">
                                {data.scores.map(s => (
                                    <ReviewCard key={s.id} score={s} currentUser={currentUser} groupRef={groupRef} allUsers={allUsers} canDelete={canDeleteScore(s)} onDelete={handleDeleteScore} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Manage Image */}
                    {canManageGroup && (
                        <div>
                            <h3 className="font-display text-lg font-bold text-text mb-4">Manage Photo</h3>
                            <div className="card-premium p-5">
                                <ImageUploader 
                                    groupId={currentGroup?.id} currentPhotoUrl={pub.photoURL}
                                    onPhotoUploaded={async (url) => { try { await pubsRef.doc(pub.id).update({ photoURL: url }); } catch(e){} }}
                                    onPhotoRemoved={async () => { try { await pubsRef.doc(pub.id).update({ photoURL: '' }); } catch(e){} }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Main Component ──────────────────────────────────────────────────────────── */

export default function PubsPage({
    pubs = [], criteria = [], scores = {},
    onSelectPub, onSelectPubForEdit,
    canManageGroup, pubsRef, allUsers = {},
    currentUser = {}, currentGroup = {},
    groupRef, db
}) {
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);
    const [searchTerm,  setSearchTerm]  = useState('');
    const [sortOption,  setSortOption]  = useState('highest');
    const [activeTab,   setActiveTab]   = useState('rated'); // 'rated' or 'unrated'
    const [isSmartSearching, setIsSmartSearching] = useState(false);
    const [smartSearchIds, setSmartSearchIds] = useState(null);
    const [selectedAmenities, setSelectedAmenities] = useState([]);
    
    const [showSecretPubModal, setShowSecretPubModal] = useState(false);
    const [secretPubTarget, setSecretPubTarget] = useState(null);
    
    const [editingPub, setEditingPub] = useState(null);

    const handleDeletePub = async (pubId) => {
        if (!groupRef || !pubId) return;
        if (!window.confirm('Delete this pub? This cannot be undone.')) return;
        try {
            await groupRef.collection('pubs').doc(pubId).delete();
            if (db && currentGroup?.id) await db.collection('groups').doc(currentGroup.id).update({ pubCount: firebase.firestore.FieldValue.increment(-1) });
        } catch (e) { console.error(e); }
    };

    const handleSavePubEdit = async (e) => {
        e.preventDefault();
        if (!editingPub || !groupRef) return;
        try {
            await groupRef.collection('pubs').doc(editingPub.id).update({
                name: editingPub.name,
                location: editingPub.location
            });
            setEditingPub(null);
        } catch (error) {
            console.error('Failed to update pub', error);
            alert('Failed to update pub');
        }
    };

    const handleSmartSearch = async () => {
        if (!searchTerm.trim() || !groupRef) return;
        setIsSmartSearching(true);
        try {
            // Need currentGroup ID which should be equivalent to groupId if we had it, wait, we don't have groupId directly here?
            // Actually `currentGroup.id` is available.
            const searchFn = firebase.app().functions('europe-west2').httpsCallable('aiSmartSearch');
            const result = await searchFn({ groupId: currentGroup.id, query: searchTerm });
            if (result.data && Array.isArray(result.data.pubIds)) {
                setSmartSearchIds(result.data.pubIds);
            } else {
                setSmartSearchIds([]);
            }
        } catch (error) {
            console.error('Smart Search Error:', error);
            alert('Failed to perform smart search. Please try again.');
        } finally {
            setIsSmartSearching(false);
        }
    };

    const handlePickSecretPub = () => {
        // Find unvisited highly-rated? Actually wait, if they are unvisited, they have no rating. 
        // Or if we want highly rated from other groups? No, just pick an unvisited pub at random.
        // Or a random highly rated visited pub? Let's pick a random unvisited one, or random if none.
        const unvisited = enrichedPubs.filter(p => p.ratingCount === 0);
        const pool = unvisited.length > 0 ? unvisited : enrichedPubs;
        if (pool.length === 0) {
            alert('No pubs available!');
            return;
        }
        const randomPub = pool[Math.floor(Math.random() * pool.length)];
        setSecretPubTarget(randomPub);
        setShowSecretPubModal(true);
    };

    const enrichedPubs = useMemo(() => Array.isArray(pubs) ? pubs.map(pub => {
        let totalScore = 0, count = 0;
        if (Array.isArray(criteria)) {
            criteria.filter(c => c.type === 'scale').forEach(c => {
                (scores[pub.id]?.[c.id] || []).forEach(s => {
                    if (s.value != null && !isNaN(s.value)) { totalScore += s.value; count++; }
                });
            });
        }
        const avg = count > 0 ? totalScore / count : 0;
        const { label, color } = getTier(avg, count);
        return { ...pub, avgScore: avg, tierLabel: label, color, ratingCount: count };
    }) : [], [pubs, criteria, scores]);

    const filteredPubs = useMemo(() => enrichedPubs.filter(pub => {
        if (smartSearchIds) {
            if (!smartSearchIds.includes(pub.id)) return false;
        } else {
            if (!(pub.name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
        }
        
        const isRated = pub.ratingCount > 0;
        if (activeTab === 'rated' && !isRated) return false;
        if (activeTab === 'unrated' && isRated) return false;
        
        if (selectedAmenities.length > 0) {
            const pubAmenities = pub.amenities || {};
            for (const amenity of selectedAmenities) {
                if (!pubAmenities[amenity]) return false;
            }
        }
        
        return true;
    }).sort((a, b) => {
        if (smartSearchIds) {
            return smartSearchIds.indexOf(a.id) - smartSearchIds.indexOf(b.id);
        }
        if (sortOption === 'highest')        return (b.avgScore    || 0) - (a.avgScore    || 0);
        if (sortOption === 'lowest')         return (a.avgScore    || 0) - (b.avgScore    || 0);
        if (sortOption === 'alphabetical')   return (a.name || '').localeCompare(b.name || '');
        if (sortOption === 'newest')         return safeTime(b.createdAt) - safeTime(a.createdAt);
        return 0;
    }), [enrichedPubs, searchTerm, sortOption, activeTab, smartSearchIds, selectedAmenities]);

    const breakdown = useMemo(() => {
        if (!selectedPubForDetail) return null;
        const b = {};
        const pubScores = scores[selectedPubForDetail.id] ?? {};
        if (Array.isArray(criteria)) {
            criteria.forEach(crit => {
                const criterionScores = pubScores[crit.id] ?? [];
                const mappedScores = criterionScores.map(s => ({
                    id: s.id, value: s.value, userId: s.userId,
                    type: s.type, createdAt: s.createdAt, userName: s.userName,
                }));
                const usable = criterionScores.filter(s => s.value != null);
                const sum = usable.reduce((acc, s) => s.type === 'scale' ? acc + s.value : acc, 0);
                b[crit.id] = { name: crit.name, type: crit.type, scores: mappedScores, average: usable.length ? sum / usable.length : 0 };
            });
        }
        return b;
    }, [selectedPubForDetail, scores, criteria]);

    return (
        <div className="space-y-8 animate-fadeIn pb-24">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="relative z-10">
                    <h2 className="font-display text-3xl md:text-4xl font-bold mb-1 text-text">Pub Directory</h2>
                    <p className="font-body text-sm font-semibold text-muted">Every pint, properly documented.</p>
                </div>
            </div>

            {/* Amenity Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-muted uppercase tracking-wider mr-2">Filters:</span>
                {[
                    { id: 'isDogFriendly', label: '🐶 Dog Friendly' },
                    { id: 'hasSportsTv', label: '📺 Live Sports' },
                    { id: 'hasBeerGarden', label: '🌳 Beer Garden' },
                    { id: 'wheelchairAccessible', label: '♿ Accessible' },
                    { id: 'servesFood', label: '🍔 Food' }
                ].map(amenity => {
                    const isSelected = selectedAmenities.includes(amenity.id);
                    return (
                        <button
                            key={amenity.id}
                            onClick={() => {
                                setSelectedAmenities(prev => 
                                    prev.includes(amenity.id) 
                                        ? prev.filter(a => a !== amenity.id)
                                        : [...prev, amenity.id]
                                )
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border cursor-pointer ${
                                isSelected 
                                    ? 'bg-brand text-white border-brand' 
                                    : 'bg-surface border-border text-muted hover:text-text hover:border-brand/50'
                            }`}
                        >
                            {amenity.label}
                        </button>
                    )
                })}
            </div>

            <div className="flex gap-6 border-b border-border mb-6">
                <button 
                    onClick={() => setActiveTab('rated')}
                    className={`pb-3 px-2 font-black text-lg transition-all border-b-4 cursor-pointer ${activeTab === 'rated' ? 'border-brand text-text' : 'border-transparent text-text-muted hover:text-text'}`}
                >
                    Directory (Rated)
                </button>
                <button 
                    onClick={() => setActiveTab('unrated')}
                    className={`pb-3 px-2 font-black text-lg transition-all border-b-4 flex items-center gap-2 cursor-pointer ${activeTab === 'unrated' ? 'border-brand text-text' : 'border-transparent text-text-muted hover:text-text'}`}
                >
                    Pubs to Visit
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black leading-none flex items-center justify-center ${activeTab === 'unrated' ? 'bg-brand text-white' : 'bg-surface-offset text-text-muted border border-border'}`}>
                        {enrichedPubs.filter(p => p.ratingCount === 0).length}
                    </span>
                </button>
            </div>

            <div className="card-premium p-4 md:p-5 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] flex gap-2">
                    <input
                        type="text" placeholder="Search pubs or try Smart Search (e.g., 'pubs with a pool table')..." 
                        value={searchTerm} 
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            if (e.target.value === '') setSmartSearchIds(null);
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSmartSearch();
                        }}
                        className="flex-1 px-4 py-2.5 border border-border rounded-xl focus:ring-1 focus:ring-brand bg-surface text-text outline-none"
                    />
                    <button onClick={handleSmartSearch} disabled={isSmartSearching || !searchTerm.trim()} className={`px-4 py-2 rounded-xl font-bold border-none transition-colors ${isSmartSearching || !searchTerm.trim() ? 'bg-surface-offset text-muted cursor-not-allowed' : 'bg-brand-subtle text-brand hover:bg-brand hover:text-white cursor-pointer'} flex items-center gap-2`}>
                        {isSmartSearching ? '✨ Searching...' : '✨ Smart Search'}
                    </button>
                    {smartSearchIds && (
                        <button onClick={() => { setSmartSearchIds(null); setSearchTerm(''); }} className="px-4 py-2 rounded-xl font-bold bg-error/10 text-error hover:bg-error hover:text-white border-none cursor-pointer transition-colors">
                            Clear
                        </button>
                    )}
                    <button onClick={handlePickSecretPub} className="px-4 py-2 rounded-xl font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 border-none cursor-pointer transition-colors shadow-sm whitespace-nowrap">
                        🎲 Secret Pub
                    </button>
                </div>
                {activeTab === 'rated' && (
                    <select
                        value={sortOption} onChange={e => setSortOption(e.target.value)}
                        className="px-4 pr-10 py-2.5 border border-border rounded-xl focus:ring-1 focus:ring-brand bg-surface text-text outline-none cursor-pointer"
                    >
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                        <option value="newest">Newest Added</option>
                        <option value="alphabetical">Alphabetical</option>
                    </select>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPubs.map(pub => (
                    <div key={pub.id} onClick={() => setSelectedPubForDetail(pub)} className="card-premium card-premium-hover flex flex-col cursor-pointer group">
                        <div className="relative h-48 w-full shrink-0 overflow-hidden bg-surface-offset">
                            <img src={pub.photoURL || 'https://placehold.co/600x400/1e293b/ffffff?text=No+Photo'} alt={pub.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                            {pub.busyStatus && pub.busyStatusUpdatedAt && (Date.now() - pub.busyStatusUpdatedAt.toMillis?.()) < 3 * 60 * 60 * 1000 && (
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 shadow-sm">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${pub.busyStatus === 'packed' ? 'bg-red-500' : pub.busyStatus === 'lively' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">{pub.busyStatus}</span>
                                </div>
                            )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-display text-xl font-bold mb-1 truncate">{pub.name}</h3>
                                <p className="font-body text-xs font-semibold text-muted truncate mb-3">📍 {pub.location || 'Unknown'}</p>
                                <div className="flex gap-2 items-center mb-4">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-surface-offset border border-border ${pub.color}`}>{pub.tierLabel}</span>
                                    <span className="font-body text-xs font-semibold text-text-faint">{pub.ratingCount} ratings</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-divider">
                                {activeTab === 'rated' ? (
                                    <div className="bg-brand text-white px-4 py-1.5 rounded-full font-extrabold text-lg shadow-sm leading-none">
                                        {pub.avgScore.toFixed(1)}
                                    </div>
                                ) : (
                                    <div className="text-sm font-bold text-text-muted italic">Unrated</div>
                                )}
                                <div className="flex flex-wrap gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => onSelectPub(pub)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-white text-xs font-bold transition-all shadow-sm border border-brand/20 cursor-pointer">
                                        ⭐ Rate
                                    </button>
                                    {canManageGroup && (
                                        <button onClick={() => setEditingPub(pub)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning hover:text-white text-xs font-bold transition-all shadow-sm border border-warning/20 cursor-pointer">
                                            ✏️ Edit
                                        </button>
                                    )}
                                    {canManageGroup && (
                                        <button onClick={() => handleDeletePub(pub.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white text-xs font-bold transition-all shadow-sm border border-error/20 cursor-pointer">
                                            🗑️ Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {filteredPubs.length === 0 && <div className="text-center py-12 card-premium bg-surface-offset"><p className="font-body font-semibold text-muted">No pubs found.</p></div>}

            {selectedPubForDetail && breakdown && (
                <PubDetailModal
                    pub={selectedPubForDetail} breakdown={breakdown} allUsers={allUsers}
                    currentUser={currentUser} currentGroup={currentGroup} groupRef={groupRef}
                    pubsRef={pubsRef} db={db} canManageGroup={canManageGroup} onClose={() => setSelectedPubForDetail(null)}
                    onSelectPub={onSelectPub}
                />
            )}

            {editingPub && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <form onSubmit={handleSavePubEdit} className="bg-surface p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
                        <h3 className="text-xl font-bold font-display text-text mb-4">Edit Pub</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-1">Pub Name</label>
                                <input type="text" required value={editingPub.name || ''} onChange={e => setEditingPub({...editingPub, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-surface-offset text-text focus:ring-2 focus:ring-brand outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-1">Location</label>
                                <input type="text" value={editingPub.location || ''} onChange={e => setEditingPub({...editingPub, location: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-surface-offset text-text focus:ring-2 focus:ring-brand outline-none" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setEditingPub(null)} className="px-4 py-2 rounded-lg font-bold text-text-muted hover:bg-surface-offset cursor-pointer border-none bg-transparent">Cancel</button>
                            <button type="submit" className="px-4 py-2 rounded-lg font-bold bg-brand text-white shadow-md hover:bg-brand-dark cursor-pointer border-none">Save Changes</button>
                        </div>
                    </form>
                </div>
            )}
            )}

            {showSecretPubModal && secretPubTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-surface p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-center border border-purple-500/30 bg-gradient-to-br from-surface to-purple-900/10">
                        <div className="text-6xl mb-4 animate-bounce">🎲</div>
                        <h3 className="text-3xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">Secret Pub Revealed!</h3>
                        <p className="text-sm font-bold text-muted mb-6">Your next adventure awaits at...</p>
                        
                        <div className="bg-surface-offset p-6 rounded-2xl border border-border shadow-inner mb-6">
                            <h4 className="text-2xl font-black text-text mb-1">{secretPubTarget.name}</h4>
                            <p className="text-sm font-semibold text-text-muted">📍 {secretPubTarget.location || 'Unknown'}</p>
                            {secretPubTarget.ratingCount === 0 && (
                                <span className="inline-block mt-3 px-3 py-1 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                    Uncharted Territory
                                </span>
                            )}
                        </div>
                        
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowSecretPubModal(false)} className="px-6 py-3 rounded-xl font-bold text-text-muted hover:bg-surface-offset cursor-pointer transition-colors border-none bg-transparent">
                                Maybe Later
                            </button>
                            <button onClick={() => {
                                setShowSecretPubModal(false);
                                setSelectedPubForDetail(secretPubTarget);
                            }} className="px-6 py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg cursor-pointer transition-colors flex items-center gap-2 border-none">
                                View Details <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
