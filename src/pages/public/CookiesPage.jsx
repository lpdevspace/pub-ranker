import LegalPage from './LegalPage';

export default function CookiesPage({ onLoginClick }) {
    return (
        <LegalPage
            onLoginClick={onLoginClick}
            path="/cookies"
            title="Cookie Policy"
            lastUpdated="June 2026"
            intro="We use the smallest number of cookies that still lets the service work properly."
            sections={[
                {
                    heading: 'Essential cookies',
                    body: 'Used for signing in and remembering your session. Without these, the site won\'t work — they\'re always on.',
                },
                {
                    heading: 'Preference cookies',
                    body: 'Remember things like your dark/light mode and active group. Stored locally in your browser only.',
                },
                {
                    heading: 'Analytics (optional)',
                    body: 'Anonymous usage data via Firebase Analytics. You can opt out by toggling the setting in your profile or by sending a Do-Not-Track header.',
                },
                {
                    heading: 'Advertising (optional, free tier only)',
                    body: 'If you\'re on the free tier and we run AdSense ads, Google may set advertising cookies. Premium users never see these. You can manage ad personalisation at adssettings.google.com.',
                },
                {
                    heading: 'Managing cookies',
                    body: 'You can clear cookies any time from your browser settings. Note that clearing essential cookies will sign you out.',
                },
            ]}
        />
    );
}
