import { useState } from 'react';

/**
 * ReviewCard — one review row with optional owner-reply UI.
 *
 *  - Pub Pro / Pub Plus owners can post a public response, which is stored on
 *    the score doc as `{ ownerReply: { text, repliedAt, ownerUid } }`.
 *  - Replies are visible to everyone (security rules should enforce that
 *    only the claimed owner can write).
 */
export default function ReviewCard({
    review,
    canReply,
    onReply,
    ownerName = 'The team',
}) {
    const [drafting, setDrafting] = useState(false);
    const [draft, setDraft]       = useState(review.ownerReply?.text || '');
    const [busy, setBusy]         = useState(false);

    const hasReply = Boolean(review.ownerReply?.text);

    const submit = async () => {
        if (!draft.trim() || busy) return;
        setBusy(true);
        try {
            await onReply?.(review, draft.trim());
            setDrafting(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-4 space-y-3 border-b border-gray-150 dark:border-gray-750 last:border-b-0" data-testid={`review-card-${review.id || review.scoreId || 'x'}`}>
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-gray-850 dark:text-white truncate">
                            {review.userName || 'Anonymous'}
                        </span>
                        <span className="text-[9px] text-gray-400 font-medium">{review.date}</span>
                        {review.criterionId && (
                            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                {review.criterionId}
                            </span>
                        )}
                    </div>
                    {review.comment && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                            “{review.comment}”
                        </p>
                    )}
                </div>
                <span className={`flex-shrink-0 font-black text-xs px-2.5 py-0.5 rounded-lg select-none ${
                    review.rating >= 8 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    review.rating >= 5 ? 'bg-brand/15 text-brand' :
                                         'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                    {Number(review.rating).toFixed(1)} / 10
                </span>
            </div>

            {hasReply && !drafting && (
                <div className="ml-4 pl-4 border-l-2 border-brand/40 space-y-1" data-testid="review-card-existing-reply">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand">
                        {ownerName} replied
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {review.ownerReply.text}
                    </p>
                    {canReply && (
                        <button
                            onClick={() => setDrafting(true)}
                            data-testid="review-card-edit-reply"
                            className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
                        >
                            Edit reply
                        </button>
                    )}
                </div>
            )}

            {!hasReply && canReply && !drafting && (
                <button
                    onClick={() => setDrafting(true)}
                    data-testid="review-card-reply-btn"
                    className="text-[10px] font-bold text-brand hover:underline cursor-pointer ml-1"
                >
                    + Reply publicly
                </button>
            )}

            {drafting && (
                <div className="ml-4 space-y-2" data-testid="review-card-reply-form">
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder="Thanks for stopping by — we&apos;ll work on…"
                        rows={3}
                        className="w-full p-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-brand outline-none resize-none"
                        maxLength={500}
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={submit}
                            disabled={busy || !draft.trim()}
                            data-testid="review-card-reply-submit"
                            className="px-3 py-1.5 bg-brand text-white text-[10px] font-bold rounded-lg disabled:opacity-50 hover:opacity-85 cursor-pointer"
                        >
                            {busy ? 'Posting…' : (hasReply ? 'Update' : 'Post reply')}
                        </button>
                        <button
                            onClick={() => { setDraft(review.ownerReply?.text || ''); setDrafting(false); }}
                            className="text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                        >
                            Cancel
                        </button>
                        <span className="ml-auto text-[9px] text-gray-400 tabular-nums">{draft.length} / 500</span>
                    </div>
                </div>
            )}
        </div>
    );
}
