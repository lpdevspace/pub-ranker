import { useEffect, useRef } from 'react';

/**
 * AdSlot — Google AdSense placeholder.
 *
 * Behaviour:
 *  - If a publisher ID is configured via VITE_ADSENSE_CLIENT_ID, renders a real
 *    AdSense unit (and triggers `(adsbygoogle = window.adsbygoogle || []).push({})`).
 *  - Otherwise renders a discreet "Ad placeholder" box so layout is preserved
 *    in dev/test environments.
 *  - Hidden for premium users (pass `userProfile` prop).
 */
export default function AdSlot({
    slot = '0000000000',
    format = 'auto',
    layout = '',
    userProfile = null,
    style = {},
    label = 'Sponsored',
}) {
    const adRef = useRef(null);
    const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || '';
    const hasRealAds = Boolean(clientId);

    const isPremium = userProfile?.premium === true || userProfile?.isSuperAdmin === true;

    useEffect(() => {
        if (!hasRealAds || isPremium) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('[AdSlot] adsbygoogle push failed', e);
        }
    }, [hasRealAds, isPremium]);

    if (isPremium) return null;

    if (!hasRealAds) {
        return (
            <div
                data-testid={`ad-slot-placeholder-${slot}`}
                aria-hidden="true"
                style={{
                    margin: 'var(--space-4) 0',
                    padding: 'var(--space-4) var(--space-6)',
                    border: '1px dashed var(--color-divider)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-surface-2)',
                    color: 'var(--color-text-faint)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    minHeight: 90,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...style,
                }}
            >
                {label} · Ad placeholder ({slot})
            </div>
        );
    }

    return (
        <div data-testid={`ad-slot-${slot}`} style={{ margin: 'var(--space-4) 0', textAlign: 'center', ...style }}>
            <p style={{ fontSize: 10, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {label}
            </p>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={clientId}
                data-ad-slot={slot}
                data-ad-format={format}
                data-ad-layout={layout || undefined}
                data-full-width-responsive="true"
            />
        </div>
    );
}
