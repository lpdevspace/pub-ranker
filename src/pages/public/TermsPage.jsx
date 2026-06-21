import LegalPage from './LegalPage';

export default function TermsPage({ onLoginClick }) {
    return (
        <LegalPage
            onLoginClick={onLoginClick}
            path="/terms"
            title="Terms of Service"
            lastUpdated="June 2026"
            intro="By using Pub Ranker you agree to these terms. They're written to be readable — if anything is unclear, email hello@pubranker.uk."
            sections={[
                {
                    heading: 'Eligibility',
                    body: 'You must be 18 or over to use Pub Ranker. Drink responsibly — we love pubs, but the law and your liver come first.',
                },
                {
                    heading: 'Your account',
                    body: 'Keep your login secure. You\'re responsible for everything posted under your account. Don\'t impersonate anyone or share an account.',
                },
                {
                    heading: 'Acceptable use',
                    body: (
                        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                            <li>Rate honestly. Coordinated fake-reviewing will get your group removed.</li>
                            <li>No abuse, hate speech, harassment, or illegal content.</li>
                            <li>Don\'t scrape, reverse-engineer or stress-test the service.</li>
                        </ul>
                    ),
                },
                {
                    heading: 'Subscriptions & billing',
                    body: 'Paid plans renew automatically until cancelled. Cancel anytime from your profile — you keep premium features until the end of the current period. Refunds at our discretion within 14 days for genuinely faulty service.',
                },
                {
                    heading: 'Content ownership',
                    body: 'You keep ownership of what you post. You grant us a worldwide, royalty-free licence to display it within the service and (in anonymised, aggregated form) for analytics products sold to venues.',
                },
                {
                    heading: 'Pub claims',
                    body: 'A pub listing claim must be made by an authorised representative of the venue. We may ask for proof and reserve the right to reverse a claim if it was made in bad faith.',
                },
                {
                    heading: 'Liability',
                    body: 'We provide the service "as is". To the extent allowed by law, our liability to you is limited to the amount you have paid us in the last 12 months.',
                },
                {
                    heading: 'Governing law',
                    body: 'These terms are governed by the laws of England and Wales. Any disputes will be resolved in the courts of England and Wales.',
                },
            ]}
        />
    );
}
