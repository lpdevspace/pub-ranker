/**
 * PremiumLock — small overlay shown over a feature card when the user's plan
 * doesn't unlock it. Clicking the CTA opens the pub subscription checkout.
 *
 * Used everywhere we need to gate Pub Pro / Pub Plus features.
 */
export default function PremiumLock({
    requiredPlan,            // 'pubPro' | 'pubPlus'
    title,
    body,
    onUpgrade,
    icon = '🔒',
}) {
    const tierLabel = requiredPlan === 'pubPlus' ? 'Pub Plus' : 'Pub Pro';
    const priceLabel = requiredPlan === 'pubPlus' ? '£49/mo' : '£19/mo';

    return (
        <div
            data-testid={`premium-lock-${requiredPlan}`}
            className="absolute inset-0 z-30 flex items-center justify-center p-6 text-center"
            style={{
                backgroundColor: 'color-mix(in srgb, var(--color-bg) 65%, transparent)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
            }}
        >
            <div className="max-w-sm space-y-4 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="text-3xl select-none">{icon}</div>
                <h4 className="font-black text-lg text-gray-850 dark:text-white leading-tight">
                    {title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {body}
                </p>
                <div className="flex flex-col gap-2 items-stretch">
                    <button
                        onClick={() => onUpgrade(requiredPlan)}
                        data-testid={`premium-lock-cta-${requiredPlan}`}
                        className="px-6 py-2.5 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 shadow-md transition cursor-pointer"
                    >
                        Unlock {tierLabel} — {priceLabel}
                    </button>
                    <span className="text-[10px] text-gray-500 font-medium">
                        14-day free trial · Cancel anytime
                    </span>
                </div>
            </div>
        </div>
    );
}
