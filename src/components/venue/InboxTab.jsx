import React, { useState, useEffect } from 'react';
import { firebase } from '../../firebase';
import { formatDistanceToNow } from 'date-fns';

export default function InboxTab({ db, venueId, user }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState({});

    useEffect(() => {
        if (!venueId) return;
        const unsubscribe = db.collection('messages')
            .where('venueId', '==', venueId)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snap => {
                setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
        return () => unsubscribe();
    }, [db, venueId]);

    const handleReply = async (msgId) => {
        const text = replyText[msgId];
        if (!text?.trim()) return;
        try {
            await db.collection('messages').doc(msgId).update({
                venueReply: text,
                replyTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            setReplyText(prev => ({ ...prev, [msgId]: '' }));
        } catch (e) {
            console.error("Error sending reply", e);
        }
    };

    if (loading) return <div className="p-6 text-center animate-pulse">Loading inbox...</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Venue Inbox</h4>
                <p className="text-sm text-gray-500">Read and reply to private feedback from your customers.</p>
            </div>

            {messages.length === 0 ? (
                <div className="text-center p-8 text-gray-500 italic border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                    Your inbox is empty. No messages yet!
                </div>
            ) : (
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">{msg.userName || 'Anonymous Customer'}</h5>
                                    <p className="text-xs text-gray-500">
                                        {msg.timestamp ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                {msg.text}
                            </p>

                            {msg.venueReply ? (
                                <div className="ml-4 pl-4 border-l-2 border-brand">
                                    <p className="text-xs font-bold text-brand mb-1">Your Reply:</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{msg.venueReply}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        {msg.replyTimestamp ? formatDistanceToNow(msg.replyTimestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex gap-2 mt-4">
                                    <input 
                                        type="text" placeholder="Type a reply..."
                                        value={replyText[msg.id] || ''} 
                                        onChange={e => setReplyText({...replyText, [msg.id]: e.target.value})}
                                        className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                                    />
                                    <button 
                                        onClick={() => handleReply(msg.id)}
                                        className="px-4 py-2 bg-brand text-white font-bold rounded-lg text-sm"
                                    >
                                        Reply
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
