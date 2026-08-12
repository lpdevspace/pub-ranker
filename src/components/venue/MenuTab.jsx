import React, { useState, useEffect } from 'react';
import { firebase } from '../../firebase';

export default function MenuTab({ db, venueId }) {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', type: 'beer' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!venueId) return;
        const unsubscribe = db.collection('pubs').doc(venueId).collection('menu')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => {
                setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
        return () => unsubscribe();
    }, [db, venueId]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.name.trim()) return;
        setIsSaving(true);
        try {
            await db.collection('pubs').doc(venueId).collection('menu').add({
                ...newItem,
                price: parseFloat(newItem.price) || 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setNewItem({ name: '', description: '', price: '', type: 'beer' });
        } catch (e) {
            console.error("Error adding menu item", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to remove this item?")) return;
        await db.collection('pubs').doc(venueId).collection('menu').doc(id).delete();
    };

    if (loading) return <div className="p-6 text-center animate-pulse">Loading menu...</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Live Tap List / Menu</h4>
                <p className="text-sm text-gray-500">Update what's currently on tap or your food specials. This will be instantly visible to all users!</p>
            </div>

            <form onSubmit={handleAddItem} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-4">
                <h5 className="font-bold text-sm">Add New Item</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" required placeholder="Item Name (e.g. Camden Hells)"
                        value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 w-full"
                    />
                    <div className="flex gap-2">
                        <input 
                            type="number" step="0.01" placeholder="Price (£)"
                            value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})}
                            className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 w-1/2"
                        />
                        <select 
                            value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}
                            className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 w-1/2"
                        >
                            <option value="beer">🍺 Beer/Cider</option>
                            <option value="wine">🍷 Wine</option>
                            <option value="cocktail">🍸 Cocktail</option>
                            <option value="food">🍔 Food</option>
                        </select>
                    </div>
                </div>
                <input 
                    type="text" placeholder="Short description (e.g. Crisp and refreshing lager, 4.6% ABV)"
                    value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}
                    className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 w-full"
                />
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand text-white font-bold rounded-lg shadow-sm w-full md:w-auto">
                    {isSaving ? 'Adding...' : 'Add to Menu'}
                </button>
            </form>

            <div className="space-y-2">
                {menuItems.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 italic border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                        Your menu is empty. Add your first item above!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {menuItems.map(item => (
                            <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl flex justify-between items-start bg-white dark:bg-gray-900 shadow-sm relative group">
                                <div>
                                    <h6 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {item.type === 'beer' ? '🍺' : item.type === 'wine' ? '🍷' : item.type === 'cocktail' ? '🍸' : '🍔'} 
                                        {item.name}
                                    </h6>
                                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                                </div>
                                <div className="text-right flex flex-col items-end justify-between h-full">
                                    <span className="font-bold text-brand">£{parseFloat(item.price).toFixed(2)}</span>
                                    <button 
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 font-bold"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
