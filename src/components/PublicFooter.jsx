import { Link } from 'react-router-dom';
import PintGlassLogo from './PintGlassLogo';

const FOOTER_LINKS = {
    Product: [
        { to: '/pricing',  label: 'Pricing' },
        { to: '/explore',  label: 'Explore Groups' },
        { to: '/for-pubs', label: 'For Pubs' },
    ],
    Company: [
        { to: '/about',   label: 'About' },
        { to: '/contact', label: 'Contact' },
        { href: 'https://github.com/lpdevspace/pub-ranker', label: 'GitHub', external: true },
    ],
    Legal: [
        { to: '/privacy', label: 'Privacy' },
        { to: '/terms',   label: 'Terms' },
        { to: '/cookies', label: 'Cookies' },
    ],
};

export default function PublicFooter() {
    return (
        <footer
            data-testid="public-footer"
            style={{
                borderTop: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-muted)',
                padding: 'var(--space-12) var(--space-6) var(--space-8)',
            }}
        >
            <div style={{ maxWidth: 1152, margin: '0 auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(120px, 1fr))',
                    gap: 'var(--space-8)',
                    marginBottom: 'var(--space-10)',
                }}>
                    <div>
                        <PintGlassLogo size={28} />
                        <p style={{
                            marginTop: 'var(--space-4)',
                            fontSize: 'var(--text-sm)',
                            lineHeight: 1.6,
                            maxWidth: '32ch',
                        }}>
                            The British pub leaderboard your group will actually settle.
                            Rate, rank, map &amp; discover with your mates.
                        </p>
                    </div>

                    {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
                        <div key={heading}>
                            <h4 style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 800,
                                color: 'var(--color-text)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                marginBottom: 'var(--space-4)',
                            }}>{heading}</h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {links.map(link => (
                                    <li key={link.label}>
                                        {link.external ? (
                                            <a
                                                href={link.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                                                style={{
                                                    fontSize: 'var(--text-sm)',
                                                    color: 'var(--color-text-muted)',
                                                    textDecoration: 'none',
                                                    transition: 'color 180ms',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-brand)'}
                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                            >
                                                {link.label} ↗
                                            </a>
                                        ) : (
                                            <Link
                                                to={link.to}
                                                data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                                                style={{
                                                    fontSize: 'var(--text-sm)',
                                                    color: 'var(--color-text-muted)',
                                                    textDecoration: 'none',
                                                    transition: 'color 180ms',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-brand)'}
                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                            >
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 'var(--space-4)',
                    paddingTop: 'var(--space-6)',
                    borderTop: '1px solid var(--color-divider)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-faint)',
                }}>
                    <p>© {new Date().getFullYear()} Pub Ranker. Made with 🍺 in England.</p>
                    <p>Drink responsibly · 18+ only</p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 720px) {
                    [data-testid="public-footer"] > div > div:first-child {
                        grid-template-columns: 1fr 1fr !important;
                    }
                    [data-testid="public-footer"] > div > div:first-child > div:first-child {
                        grid-column: 1 / -1;
                    }
                }
            `}} />
        </footer>
    );
}
