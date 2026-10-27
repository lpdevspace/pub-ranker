import React, { useState } from 'react';
import {
    MessageSquare,
    Bug,
    Sparkles,
    Send,
    CheckCircle2,
    Beer
} from 'lucide-react';
import { firebase } from '../firebase';
import { useToastContext } from '../context/ToastContext';

export default function FeedbackPage({ db, user }) {
    const { showToast } = useToastContext();
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
                userId: user?.uid || 'anonymous',
                userEmail: user?.email || 'anonymous',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setSubmitted(true);
            showToast('Feedback delivered to the landlords!', 'success');
        } catch (err) {
            console.error('Feedback submission error:', err);
            showToast('Failed to send feedback', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-md mx-auto text-center py-16 animate-fadeIn space-y-4">
                <div className="text-5xl mb-2">🍻</div>
                <h2 className="font-display text-3xl text-[var(--color-text)]">
                    Cheers for the Dispatch!
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    Your notes have been sent directly to the tavern engineering crew. We review every report.
                </p>
                <div className="pt-4">
                    <button
                        onClick={() => { setSubmitted(false); setMessage(''); }}
                        className="btn-brand text-xs px-5 py-2.5 font-bold shadow-sm"
                    >
                        Send Another Note
                    </button>
                </div>
            </div>
        );
    }

    const feedbackTypes = [
        { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
        { id: 'feature', label: 'Feature Idea', icon: Sparkles, color: 'text-amber-500' },
        { id: 'other', label: 'General Word', icon: MessageSquare, color: 'text-blue-500' }
    ];

    return (
        <div className="max-w-xl mx-auto space-y-6 animate-fadeIn pb-24">
            <div className="border-b border-[var(--color-divider)] pb-4">
                <h1 className="font-display text-3xl sm:text-4xl text-[var(--color-text)]">
                    Feedback & Suggestions
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Spotted a hiccup, craving a new feature, or want to say hello? Let us know.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="card-tavern p-6 sm:p-7 border border-[var(--color-border)] shadow-xl space-y-5"
            >
                {/* Type Selector */}
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                        Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {feedbackTypes.map(t => {
                            const Icon = t.icon;
                            const isSelected = type === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setType(t.id)}
                                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-amber-500/10 border-amber-500 text-[var(--color-text)] font-bold'
                                            : 'bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)]'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${t.color}`} />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Message */}
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                        Your Message
                    </label>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={
                            type === 'bug'
                                ? 'Describe what happened, where you clicked, and what you expected...'
                                : type === 'feature'
                                ? 'Describe the feature you wish Pub Ranker had...'
                                : 'Any thoughts, praise, or tavern lore...'
                        }
                        rows={6}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-brand)] resize-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="btn-brand w-full py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Transmitting…' : 'Submit Feedback'}</span>
                </button>
            </form>
        </div>
    );
}
