import LegalPage from './LegalPage';

export default function PrivacyPage({ onLoginClick }) {
    return (
        <LegalPage
            onLoginClick={onLoginClick}
            path="/privacy"
            title="Privacy Policy"
            lastUpdated="June 2026"
            intro="We're a small UK team. We only collect the data we genuinely need to make Pub Ranker work, and we never sell your personal data."
            sections={[
                {
                    heading: 'Who we are',
                    body: 'Pub Ranker is operated by lpdevspace based in the United Kingdom. For any privacy questions email hello@pubranker.uk.',
                },
                {
                    heading: 'What we collect',
                    body: (
                        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                            <li>Account info — email, display name, profile photo (if you set one).</li>
                            <li>Group activity — pubs you add, scores you give, comments you write.</li>
                            <li>Technical data — IP address, browser, device type, anonymous usage analytics.</li>
                            <li>Payment info — handled exclusively by Stripe; we never see or store full card numbers.</li>
                        </ul>
                    ),
                },
                {
                    heading: 'How we use it',
                    body: 'To run the service, show you to the right group, send you transactional emails (e.g. password reset, group invites), prevent abuse, and improve the product. We never sell personal data to advertisers.',
                },
                {
                    heading: 'Aggregated insights & data licensing',
                    body: 'We may share aggregated, anonymised insights (e.g. "average atmosphere score across Manchester city-centre pubs") with venues or industry partners. Individual users are never identifiable in these aggregates.',
                },
                {
                    heading: 'Third parties we use',
                    body: 'Google (sign-in, Maps), Stripe (payments), Firebase (storage & auth), OpenStreetMap (tiles). Each has its own privacy policy that applies when you use those services.',
                },
                {
                    heading: 'Your rights (UK GDPR)',
                    body: 'You can request a copy of your data, ask us to correct it, or delete your account entirely from your profile page. We will respond within 30 days.',
                },
                {
                    heading: 'Cookies',
                    body: 'We use a small number of essential cookies and (with consent) anonymous analytics. See our /cookies page for the full list.',
                },
            ]}
        />
    );
}
