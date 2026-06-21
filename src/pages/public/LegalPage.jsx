import PublicPageLayout from '../../components/PublicPageLayout';
import SEO from '../../components/SEO';

/**
 * Reusable layout for plain-text legal-style pages.
 */
export default function LegalPage({
    title, lastUpdated, intro, sections, onLoginClick, path,
}) {
    return (
        <PublicPageLayout onLoginClick={onLoginClick}>
            <SEO title={title} description={`${title} — Pub Ranker`} path={path} />

            <article style={{
                maxWidth: 760, margin: '0 auto',
                padding: 'clamp(3rem, 6vw, 5rem) var(--space-6)',
            }}>
                <header style={{ marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--color-divider)', paddingBottom: 'var(--space-6)' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 900,
                        lineHeight: 1.1,
                        marginBottom: 'var(--space-2)',
                    }}>{title}</h1>
                    {lastUpdated && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            Last updated: {lastUpdated}
                        </p>
                    )}
                </header>

                {intro && (
                    <p style={{
                        fontSize: 'var(--text-lg)',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.7,
                        marginBottom: 'var(--space-8)',
                    }}>{intro}</p>
                )}

                {sections.map((s, i) => (
                    <section key={i} style={{ marginBottom: 'var(--space-8)' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'var(--text-xl)',
                            fontWeight: 700,
                            lineHeight: 1.2,
                            marginBottom: 'var(--space-3)',
                        }}>{s.heading}</h2>
                        {typeof s.body === 'string'
                            ? <p style={{ lineHeight: 1.7, color: 'var(--color-text)' }}>{s.body}</p>
                            : s.body}
                    </section>
                ))}

                <p style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-faint)',
                    marginTop: 'var(--space-10)',
                    paddingTop: 'var(--space-6)',
                    borderTop: '1px solid var(--color-divider)',
                }}>
                    Questions? Email us at <a href="mailto:hello@pubranker.uk" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 600 }}>hello@pubranker.uk</a>.
                </p>
            </article>
        </PublicPageLayout>
    );
}
