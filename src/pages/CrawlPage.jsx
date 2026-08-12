import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { firebase } from '../firebase';

export default function CrawlPage({ pubs, onViewDetail, db, groupId, user }) {
    const [crawlPubs, setCrawlPubs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const availablePubs = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return pubs.filter(p => !crawlPubs.find(cp => cp.id === p.id) && p.name?.toLowerCase().includes(q));
    }, [pubs, crawlPubs, searchQuery]);

    const handleAddPub = (pub) => {
        setCrawlPubs([...crawlPubs, pub]);
    };

    const handleRemovePub = (id) => {
        setCrawlPubs(crawlPubs.filter(p => p.id !== id));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(crawlPubs);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setCrawlPubs(items);
        setCrawlPubs(items);
    };

    const handleSaveItinerary = async () => {
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        if (crawlPubs.length === 0) return;
        setIsSaving(true);
        try {
            const batch = db.batch();
            
            // Log the crawl
            const crawlRef = db.collection('crawls').doc();
            batch.set(crawlRef, {
                groupId,
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                pubIds: crawlPubs.map(p => p.id),
                pubNames: crawlPubs.map(p => p.name)
            });

            // Log activity
            const activityRef = db.collection('groups').doc(groupId).collection('activities').doc();
            batch.set(activityRef, {
                type: 'crawl',
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'User',
                userAvatar: user.photoURL || null,
                pubCount: crawlPubs.length,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            setIsEditing(false);
        } catch (e) {
            console.error("Error saving crawl:", e);
            alert("Failed to save itinerary.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="font-display text-4xl font-black text-text mb-2">🍻 Pub Crawl Builder</h2>
                    <p className="font-body text-sm font-semibold text-text-muted">
                        Select pubs, reorder your route, and share the itinerary!
                    </p>
                </div>
                <div className="flex gap-2">
                    {crawlPubs.length > 0 && (
                        <button
                            onClick={handleSaveItinerary}
                            disabled={isSaving}
                            className="px-4 py-2 bg-brand text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : (isEditing ? 'Save Itinerary' : 'Edit Itinerary')}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left side: Build area */}
                <div className="space-y-4">
                    <h3 className="font-display text-xl font-bold">Your Itinerary</h3>
                    {crawlPubs.length === 0 ? (
                        <div className="card-premium p-8 text-center text-muted">
                            Add some pubs from the list to start building!
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="crawl-list">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                        {crawlPubs.map((pub, index) => (
                                            <Draggable key={pub.id} draggableId={pub.id} index={index} isDragDisabled={!isEditing}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="card-premium p-4 flex flex-col gap-2 relative bg-surface-offset border border-border"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center font-bold text-brand flex-shrink-0">
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewDetail(pub)}>
                                                                <h4 className="font-bold text-text truncate hover:text-brand transition-colors">{pub.name}</h4>
                                                                <p className="text-xs text-text-muted truncate">{pub.location}</p>
                                                            </div>
                                                            {isEditing && (
                                                                <button
                                                                    onClick={() => handleRemovePub(pub.id)}
                                                                    className="p-2 text-error/70 hover:text-error hover:bg-error/10 rounded-full"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                        {index < crawlPubs.length - 1 && (
                                                            <div className="absolute -bottom-5 left-8 w-0.5 h-6 bg-border -z-10" />
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </div>

                {/* Right side: Search & Add */}
                {isEditing && (
                    <div className="space-y-4">
                        <h3 className="font-display text-xl font-bold">Available Pubs</h3>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search pubs..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 pl-10 rounded-xl bg-surface border border-border text-text font-semibold focus:ring-2 focus:ring-brand outline-none"
                            />
                            <span className="absolute left-3 top-3 text-muted">🔍</span>
                        </div>
                        <div className="card-premium p-2 max-h-[500px] overflow-y-auto space-y-2">
                            {availablePubs.length === 0 ? (
                                <p className="text-center p-4 text-muted">No pubs found.</p>
                            ) : (
                                availablePubs.map(pub => (
                                    <div key={pub.id} className="p-3 rounded-lg hover:bg-surface-offset flex items-center justify-between border border-transparent hover:border-border transition-colors">
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewDetail(pub)}>
                                            {pub.imageUrl ? (
                                                <img src={pub.imageUrl} alt={pub.name} className="w-10 h-10 rounded-md object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-md bg-surface-offset flex items-center justify-center text-xl">🍺</div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-sm text-text hover:text-brand transition-colors">{pub.name}</h4>
                                                <p className="text-xs text-text-muted">{pub.location}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddPub(pub)}
                                            className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-dark shadow-sm cursor-pointer"
                                        >
                                            +
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Itinerary Summary View */}
                {!isEditing && crawlPubs.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-display text-xl font-bold">Crawl Summary</h3>
                        <div className="card-premium p-6 space-y-4">
                            <p className="text-sm font-semibold text-text">
                                You have {crawlPubs.length} stops planned!
                            </p>
                            <div className="p-4 bg-brand/10 text-brand rounded-xl font-bold text-sm">
                                🌟 Pro-tip: Share a screenshot of your itinerary with the group so everyone knows the plan.
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm">Stops:</h4>
                                <ul className="list-disc pl-5 text-sm font-medium text-text-muted space-y-1">
                                    {crawlPubs.map(pub => (
                                        <li key={pub.id}>{pub.name}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
