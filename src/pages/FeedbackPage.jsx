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
                type, message: message.trim(),
                userId: user.uid, userEmail: user.email,
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
            <div style={{ maxWidth: 'var(--content-narrow)', margin: '0 auto', textAlign: 'center', padding: 'var(--space-16) var(--space-4)' }} className="animate-fadeIn">
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🍻</div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-display)' }}>Cheers!</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>Your feedback has been sent. We really appreciate it.</p>
                <button
                    onClick={() => { setSubmitted(false); setMessage(''); }}
                    style={{ marginTop: 'var(--space-6)', background: 'var(--color-brand)', color: '#fff', fontWeight: 700, padding: 'var(--space-2) var(--space-6)', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', transition: 'background var(--transition-interactive)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand-dark)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand)'}
                >
                    Send More Feedback
                </button>
            </div>
        );
    }

    const feedbackTypes = ['bug', 'feature', 'other'];

    return (
        <div style={{ maxWidth: 'var(--content-narrow)', margin: '0 auto' }} className="animate-fadeIn">
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>💬 Feedback</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Got a bug, an idea, or just want to say something? We're listening.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {/* Type Selector */}
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>Type of Feedback</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {feedbackTypes.map(t => (
                            <button
                                key={t} type="button" onClick={() => setType(t)}
                                style={{
                                    flex: 1, padding: 'var(--space-2) 0', borderRadius: 'var(--radius-lg)',
                                    fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'capitalize',
                                    border: '1px solid', cursor: 'pointer', transition: 'all var(--transition-interactive)',
                                    background: type === t ? 'var(--color-brand)' : 'var(--color-surface-offset)',
                                    borderColor: type === t ? 'var(--color-brand)' : 'var(--color-border)',
                                    color: type === t ? '#fff' : 'var(--color-text-muted)'
                                }}
                                onMouseEnter={e => { if (type !== t) e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                                onMouseLeave={e => { if (type !== t) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                            >
                                {t === 'bug' ? '🐛 Bug' : t === 'feature' ? '✨ Feature' : '💬 Other'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message */}
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Your Message</label>
                    <textarea
                        value={message} onChange={e => setMessage(e.target.value)}
                        placeholder={type === 'bug' ? 'Describe what happened and how to reproduce it...' : type === 'feature' ? 'Describe your idea...' : 'Tell us anything...'}
                        rows={5}
                        style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', resize: 'none', fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                        required
                    />
                </div>

                <button
                    type="submit" disabled={submitting || !message.trim()}
                    style={{ width: '100%', background: 'var(--color-brand)', color: '#fff', fontWeight: 900, padding: 'var(--space-3) 0', borderRadius: 'var(--radius-lg)', border: 'none', cursor: submitting || !message.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !message.trim() ? 0.5 : 1, fontSize: 'var(--text-base)', transition: 'background var(--transition-interactive)' }}
                    onMouseEnter={e => { if (!submitting && message.trim()) e.currentTarget.style.background = 'var(--color-brand-dark)'; }}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand)'}
                >
                    {submitting ? 'Sending...' : 'Send Feedback 🚀'}
                </button>
            </form>
        </div>
    );
}
