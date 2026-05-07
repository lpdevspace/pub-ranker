import React, { useState } from 'react';
import { firebase } from '../firebase';

export default function FeedbackPage({ db, user }) {
    const [type, setType] = useState('bug');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSubmitting(true);
        try {
            await db.collection('feedback').add({
                type,
                message: message.trim(),
                userId: user.uid,
                userEmail: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setSubmitted(true);
        } catch (err) {
            alert('Failed to send feedback: ' + err.message);
        }
        setSubmitting(false);
    };

    if (submitted) {
        return (
            <div className="max-w-lg mx-auto text-center py-16 animate-fadeIn">
                <div className="text-6xl mb-4">🍻</div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Cheers!</h2>
                <p className="text-gray-500 dark:text-gray-400">Your feedback has been sent. We really appreciate it.</p>
                <button onClick={() => { setSubmitted(false); setMessage(''); }} className="mt-6 bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded-xl transition">Send More Feedback</button>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto animate-fadeIn">
            <div className="mb-6">
                <h2 className="text-3xl font-black text-gray-800 dark:text-white">💬 Feedback</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Got a bug, an idea, or just want to say something? We're listening.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 space-y-5">
                {/* Type Selector */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Type of Feedback</label>
                    <div className="flex gap-2">
                        {['bug', 'feature', 'other'].map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition border ${
                                    type === t
                                        ? 'bg-amber-600 border-amber-600 text-white'
                                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400'
                                }`}
                            >
                                {t === 'bug' ? '🐛 Bug' : t === 'feature' ? '✨ Feature' : '💬 Other'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Your Message</label>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={type === 'bug' ? 'Describe what happened and how to reproduce it...' : type === 'feature' ? 'Describe your idea...' : 'Tell us anything...'}
                        rows={5}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Sending...' : 'Send Feedback 🚀'}
                </button>
            </form>
        </div>
    );
}
