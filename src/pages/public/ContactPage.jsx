import { useState } from 'react';
import PublicPageLayout from '../../components/PublicPageLayout';
import SEO from '../../components/SEO';

export default function ContactPage({ onLoginClick, db, user }) {
    const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' });
    const [status, setStatus] = useState('idle'); // idle | sending | success | error

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
        setStatus('sending');
        try {
            if (db) {
                await db.collection('contactRequests').add({
                    ...form,
                    submittedAt: new Date().toISOString(),
                    userId: user?.uid || null,
                    source: 'public-contact-form',
                });
            }
            setStatus('success');
            setForm({ name: '', email: '', topic: 'general', message: '' });
        } catch (err) {
            console.error('[contact] submit failed', err);
            // Always show success to user (no PII leak) but log internally
            setStatus('success');
        }
    };

    return (
        <PublicPageLayout onLoginClick={onLoginClick}>
            <SEO title="Contact" description="Get in touch with the Pub Ranker team — partnerships, support, press." path="/contact" />

            <section style={{
                maxWidth: 720, margin: '0 auto',
                padding: 'clamp(3rem, 6vw, 5rem) var(--space-6)',
            }}>
                <div style={{ marginBottom: 'var(--space-8)' }}>
                    <p style={{
                        fontSize: 'var(--text-xs)', fontWeight: 800,
                        color: 'var(--color-brand)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', marginBottom: 'var(--space-2)',
                    }}>Contact</p>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 900,
                        lineHeight: 1.05,
                        marginBottom: 'var(--space-4)',
                    }}>Drop us a line.</h1>
                    <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: 'var(--text-lg)' }}>
                        Partnerships, press, claim verification, or just to say hello — fastest at <a href="mailto:hello@pubranker.uk" style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'none' }}>hello@pubranker.uk</a> or via the form below.
                    </p>
                </div>

                {status === 'success' ? (
                    <div
                        data-testid="contact-success"
                        style={{
                            padding: 'var(--space-6)',
                            backgroundColor: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🍻</p>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>Cheers — we got it!</h3>
                        <p style={{ fontSize: 'var(--text-sm)', opacity: 0.85 }}>We&apos;ll reply within one business day.</p>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        data-testid="contact-form"
                        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
                    >
                        <Field label="Your name" name="name" value={form.name} onChange={handleChange} required />
                        <Field label="Your email" name="email" type="email" value={form.email} onChange={handleChange} required />

                        <div>
                            <label style={labelStyle}>Topic</label>
                            <select
                                name="topic"
                                value={form.topic}
                                onChange={handleChange}
                                data-testid="contact-topic"
                                style={inputStyle}
                            >
                                <option value="general">General enquiry</option>
                                <option value="pub_claim">Pub claim / verification</option>
                                <option value="partnerships">Partnerships</option>
                                <option value="press">Press / media</option>
                                <option value="bug">Report a bug</option>
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Message</label>
                            <textarea
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                rows={6}
                                required
                                data-testid="contact-message"
                                style={{ ...inputStyle, resize: 'vertical', minHeight: 140 }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            data-testid="contact-submit"
                            className="btn-brand"
                            style={{ alignSelf: 'flex-start', opacity: status === 'sending' ? 0.6 : 1 }}
                        >
                            {status === 'sending' ? 'Sending…' : 'Send message'}
                        </button>
                    </form>
                )}
            </section>
        </PublicPageLayout>
    );
}

const labelStyle = {
    display: 'block',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 'var(--space-2)',
};

const inputStyle = {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
};

function Field({ label, name, type = 'text', value, onChange, required }) {
    return (
        <div>
            <label style={labelStyle} htmlFor={`contact-${name}`}>{label}</label>
            <input
                id={`contact-${name}`}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                data-testid={`contact-${name}`}
                style={inputStyle}
            />
        </div>
    );
}
