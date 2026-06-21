import { Link, useLocation } from 'react-router-dom';
import PintGlassLogo from './PintGlassLogo';

const NAV_LINKS = [
    { to: '/pricing',  label: 'Pricing' },
    { to: '/for-pubs', label: 'For Pubs' },
    { to: '/explore',  label: 'Explore' },
];

export default function PublicNav({ onLoginClick }) {
    const { pathname } = useLocation();

    return (
        <header
            data-testid="public-nav"
            style={{
                borderBottom: '1px solid var(--color-divider)',
                position: 'sticky', top: 0, zIndex: 40,
                backgroundColor: 'color-mix(in srgb, var(--color-bg) 90%, transparent)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
            }}
        >
            <div style={{
                maxWidth: 1152, margin: '0 auto',
                padding: '0 var(--space-6)', height: 60,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Link to="/" data-testid="public-nav-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <PintGlassLogo size={32} />
                </Link>

                <nav style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    {NAV_LINKS.map(link => {
                        const isActive = pathname === link.to;
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                data-testid={`public-nav-link-${link.to.replace('/', '')}`}
                                className="public-nav-secondary"
                                style={{
                                    fontSize: 'var(--text-sm)', fontWeight: 600,
                                    color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)',
                                    fontFamily: 'var(--font-body)',
                                    padding: 'var(--space-2) var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    textDecoration: 'none',
                                    transition: 'color 180ms, background-color 180ms',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                    <button
                        data-testid="public-nav-signin"
                        onClick={onLoginClick}
                        className="btn-brand"
                        style={{ marginLeft: 'var(--space-2)' }}
                    >
                        Sign In
                    </button>
                </nav>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 640px) {
                    .public-nav-secondary { display: none !important; }
                }
            ` }} />
        </header>
    );
}
