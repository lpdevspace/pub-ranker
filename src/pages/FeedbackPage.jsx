import React, { useState } from 'react';
import { firebase } from '../firebase';

export default function FeedbackPage({ db, userProfile }) {
    const [type, setType] = useState('feature'); // 'bug', 'feature', 'other'
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle', 'submitting', 'success'

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setStatus('submitting');
        try {
            await db.collection('feedback').add({
                userId: userProfile.uid,
                userName: userProfile.displayName || "Unknown",
                userEmail: userProfile.email || "Unknown",
                type,
                message: message.trim(),
                resolved: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setStatus('success');
            setMessage('');
        } catch (error) {
            console.error("Error submitting feedback:", error);
            setStatus('idle');
            alert("Failed to submit feedback. Please try again later.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Send Feedback</h2>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-300">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Have an idea for a new feature? Found a bug? The developer reads every message submitted here.
                </p>

                {status === 'success' ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg text-center">
                        <span className="text-4xl block mb-2">🎉</span>
                        <h3 className="text-xl font-bold text-green-800 dark:text-green-400 mb-2">Message Sent!</h3>
                        <p className="text-green-700 dark:text-green-500 mb-4">Thank you for helping improve Pub Ranker.</p>
                        <button onClick={() => setStatus('idle')} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition">Send Another</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">What kind of feedback is this?</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200">
                                    <input type="radio" checked={type === 'feature'} onChange={() => setType('feature')} className="text-blue-600 focus:ring-blue-500" />
                                    💡 Feature Idea
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200">
                                    <input type="radio" checked={type === 'bug'} onChange={() => setType('bug')} className="text-red-600 focus:ring-red-500" />
                                    🐛 Bug Report
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200">
                                    <input type="radio" checked={type === 'other'} onChange={() => setType('other')} className="text-gray-600 focus:ring-gray-500" />
                                    💭 Other
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Your Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe your idea or the bug you found in detail..."
                                className="w-full h-32 p-3 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white resize-none"
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={status === 'submitting'}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {status === 'submitting' ? 'Sending...' : 'Submit Feedback'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}