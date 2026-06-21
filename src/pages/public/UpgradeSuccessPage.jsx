import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PublicPageLayout from '../../components/PublicPageLayout';
import SEO from '../../components/SEO';

export default function UpgradeSuccessPage({ onLoginClick }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('session_id') || '';

    // Auto-redirect to dashboard after 5s for signed-in users; safe noop for guests.
    useEffect(() => {
        const id = setTimeout(() => navigate('/dashboard'), 5000);
        return () => clearTimeout(id);
    }, [navigate]);

    return (
        <PublicPageLayout onLoginClick={onLoginClick}>
            <SEO title="Upgrade successful" description="Thanks for upgrading to PubRanker+." path="/upgrade/success" />
            <section style={{
                minHeight: 'calc(100dvh - 200px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'var(--space-12) var(--space-6)',
                textAlign: 'center',
            }}>
                <div style={{ maxWidth: 480 }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🍻</div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 900, lineHeight: 1.1,
                        marginBottom: 'var(--space-4)',
                    }}>
                        Cheers — you&apos;re in.
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: 'var(--space-6)' }}>
                        Your upgrade is being activated. You&apos;ll see your new perks within a
                        minute (sometimes faster than your phone refreshes).
                    </p>
                    {sessionId && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                            Reference: {sessionId.slice(0, 14)}…
                        </p>
                    )}
                    <button
                        data-testid="upgrade-success-cta"
                        onClick={() => navigate('/dashboard')}
                        className="btn-brand"
                        style={{ marginTop: 'var(--space-6)' }}
                    >
                        Go to dashboard
                    </button>
                </div>
            </section>
        </PublicPageLayout>
    );
}
