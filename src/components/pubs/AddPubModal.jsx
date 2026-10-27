import React, { useState } from 'react';
import { X, Plus, MapPin, Loader2, Sparkles } from 'lucide-react';
import { geocodePub } from '../../utils/geocode';
import { firebase } from '../../firebase';
import { useToastContext } from '../../context/ToastContext';

export default function AddPubModal({ isOpen, onClose, groupRef, db, groupId, user }) {
    const { showToast } = useToastContext();
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [pintPrice, setPintPrice] = useState('');
    const [amenities, setAmenities] = useState({
        isDogFriendly: false,
        hasSportsTv: false,
        hasBeerGarden: false,
        wheelchairAccessible: false,
        servesFood: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    if (!isOpen) return null;

    const toggleAmenity = (key) => {
        setAmenities(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            showToast('Please enter a pub name', 'error');
            return;
        }
        if (!groupRef) {
            showToast('No active group reference found', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Geocode coords via Nominatim
            setIsGeocoding(true);
            const coords = await geocodePub(name.trim(), location.trim());
            setIsGeocoding(false);

            const now = firebase.firestore.FieldValue.serverTimestamp();
            const newPubDoc = {
                name: name.trim(),
                location: location.trim() || 'Local Area',
                address: location.trim() || 'Local Area',
                lat: coords?.lat || null,
                lng: coords?.lng || null,
                photoURL: '',
                status: 'to_visit', // starts in hit list until rated
                ratingCount: 0,
                amenities,
                addedBy: user?.uid || 'anonymous',
                createdAt: now,
                updatedAt: now,
            };

            if (pintPrice && !isNaN(parseFloat(pintPrice))) {
                newPubDoc.pintPrice = parseFloat(pintPrice);
            }

            const docRef = await groupRef.collection('pubs').add(newPubDoc);

            // Update group count
            if (db && groupId) {
                try {
                    await db.collection('groups').doc(groupId).update({
                        pubCount: firebase.firestore.FieldValue.increment(1)
                    });
                } catch (err) {
                    console.warn('Could not update group pubCount:', err);
                }
            }

            showToast(`🍺 ${name.trim()} added to your hit list!`, 'success');
            onClose();
        } catch (e) {
            console.error('Failed to add pub:', e);
            showToast('Failed to add pub: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
            setIsGeocoding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="card-tavern bg-[var(--color-surface)] w-full max-w-lg overflow-hidden shadow-2xl border border-[var(--color-border)] animate-scaleIn">
                <div className="p-5 border-b border-[var(--color-divider)] flex items-center justify-between">
                    <div>
                        <h3 className="font-display text-2xl font-normal text-[var(--color-text)]">
                            Add a New Pub
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Add a venue to your group hit list for members to visit & rate.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                            Pub Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. The Red Lion"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                            Location or Neighborhood
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Madeley, Telford or Soho, London"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                            Estimated Pint Price (Guinness Index)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[var(--color-text-muted)]">£</span>
                            <input
                                type="number"
                                step="0.05"
                                min="2.00"
                                max="15.00"
                                value={pintPrice}
                                onChange={(e) => setPintPrice(e.target.value)}
                                placeholder="4.50"
                                className="w-full pl-8 pr-4 py-2.5 rounded-xl text-xs bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">
                            Amenities
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                                { key: 'isDogFriendly', label: '🐶 Dog Friendly' },
                                { key: 'hasSportsTv', label: '📺 Live Sports' },
                                { key: 'hasBeerGarden', label: '🌳 Beer Garden' },
                                { key: 'wheelchairAccessible', label: '♿ Accessible' },
                                { key: 'servesFood', label: '🍔 Serves Food' },
                            ].map(item => (
                                <label
                                    key={item.key}
                                    className="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] cursor-pointer select-none hover:border-[var(--color-divider)]"
                                >
                                    <input
                                        type="checkbox"
                                        checked={amenities[item.key]}
                                        onChange={() => toggleAmenity(item.key)}
                                        className="rounded text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                                    />
                                    <span className="font-medium text-[var(--color-text)]">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--color-divider)] flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-ghost text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn-brand text-xs disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{isGeocoding ? 'Locating...' : 'Adding...'}</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Add to Hit List</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
