import React from 'react';

export default function ManagePubsTab({ pubs, handleDeleteGroupPub }) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Manage Group Pubs</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">View and remove pubs from your group's Hit List or Visited directory.</p>

                {pubs.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8 italic">No pubs in your group yet.</p>
                ) : (
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="p-3">Pub</th>
                                    <th className="p-3">Location</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[...pubs].sort((a, b) => a.name.localeCompare(b.name)).map(pub => (
                                    <tr key={pub.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="p-3 font-bold text-gray-800 dark:text-white">
                                            <div className="flex items-center gap-3">
                                                {pub.photoURL ? (
                                                    <img src={pub.photoURL} alt={pub.name} className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm">🍺</div>
                                                )}
                                                {pub.name}
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">{pub.location || '—'}</td>
                                        <td className="p-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                pub.status === 'visited'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                                {pub.status === 'visited' ? '✅ Visited' : '📍 To Visit'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => handleDeleteGroupPub(pub.id, pub.name)}
                                                className="px-3 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-bold transition border border-red-100 dark:border-red-800"
                                            >Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
