import PublicNav from './PublicNav';
import PublicFooter from './PublicFooter';

/**
 * PublicPageLayout — shared shell for all public sub-pages
 * (pricing, for-pubs, privacy, terms, etc.).
 *
 * The landing page (`PublicLandingPage`) keeps its own custom header for the
 * hero, so it doesn't use this layout — but it does append the same footer.
 */
export default function PublicPageLayout({ children, onLoginClick }) {
    return (
        <div style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-body)',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <PublicNav onLoginClick={onLoginClick} />
            <main style={{ flex: 1 }}>{children}</main>
            <PublicFooter />
        </div>
    );
}
