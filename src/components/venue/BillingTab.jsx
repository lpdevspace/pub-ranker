import { startCheckout } from '../../utils/checkout';
import { PUB_PLANS } from '../../utils/pubPlans';

/**
 * BillingTab — shows current pub subscription and lets the owner upgrade,
 * downgrade, or visit the Stripe Customer Portal.
 */
export default function BillingTab({ user, userProfile, plan, onUpgrade, onManage }) {
    const isPlus = plan?.key === 'pubPlus';
    const isPro  = plan?.key === 'pubPro';
    const isFree = !isPlus && !isPro;

    return (
        <div className="space-y-6 animate-fadeIn" data-testid="billing-tab">
            <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Subscription &amp; Billing</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Manage your Pub Ranker plan</p>
            </div>

            {/* Current plan banner */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750/30 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Current plan</p>
                    <p className="text-xl font-black text-gray-850 dark:text-white">
                        {plan.label}
                        {plan.priceLabel && <span className="text-sm font-normal text-gray-400 ml-2">{plan.priceLabel}</span>}
                    </p>
                    {userProfile?.premiumActivatedAt && (
                        <p className="text-[10px] text-gray-400 mt-1">
                            Active since {new Date(userProfile.premiumActivatedAt?.seconds * 1000 || userProfile.premiumActivatedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
                {!isFree && (
                    <button
                        onClick={onManage}
                        data-testid="billing-manage-btn"
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-650 rounded-xl text-xs font-bold dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750 transition cursor-pointer"
                    >
                        Manage in Stripe →
                    </button>
                )}
            </div>

            {/* Plan ladder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PlanCard
                    plan={PUB_PLANS.pubPro}
                    current={isPro}
                    features={[
                        'Full review feed across all groups',
                        'Criteria breakdown & trends',
                        'Respond publicly to reviews',
                        '“Verified pub” badge on listing',
                        'Basic local ranking band',
                    ]}
                    onSelect={() => onUpgrade('pubProMonthly')}
                />
                <PlanCard
                    plan={PUB_PLANS.pubPlus}
                    current={isPlus}
                    highlight
                    features={[
                        'Everything in Pub Pro',
                        'Full competitor leaderboard',
                        'Multi-venue dashboard',
                        '2 featured-listing credits / month',
                        'CSV export of reviews & scores',
                        'Priority support',
                    ]}
                    onSelect={() => onUpgrade('pubPlusMonthly')}
                />
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed">
                Subscriptions billed monthly via Stripe. Cancel anytime — features stay
                available until the end of the current billing period. Need an annual or
                multi-venue invoice? Email <a className="underline" href="mailto:hello@pubranker.uk">hello@pubranker.uk</a>.
            </p>
        </div>
    );
}

function PlanCard({ plan, current, highlight, features, onSelect }) {
    return (
        <div
            data-testid={`billing-plan-card-${plan.key}`}
            className={`p-5 rounded-2xl border ${
                highlight ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700'
            } space-y-3`}
        >
            <div className="flex items-baseline justify-between">
                <h5 className="font-black text-base text-gray-850 dark:text-white">{plan.label}</h5>
                <span className="font-bold text-sm text-brand">{plan.priceLabel}</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                {features.map((f, i) => (
                    <li key={i} className="flex gap-2"><span className="text-brand">✓</span>{f}</li>
                ))}
            </ul>
            <button
                onClick={onSelect}
                disabled={current}
                data-testid={`billing-plan-select-${plan.key}`}
                className={`w-full py-2 rounded-xl font-bold text-xs transition ${
                    current
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : highlight
                            ? 'bg-brand text-white hover:opacity-85 cursor-pointer'
                            : 'border border-gray-200 dark:border-gray-650 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer'
                }`}
            >
                {current ? 'Your current plan' : `Upgrade to ${plan.label}`}
            </button>
        </div>
    );
}
