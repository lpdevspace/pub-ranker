import { useToastContext } from '../context/ToastContext';

const ICONS = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
};

const STYLES = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-yellow-500 text-yellow-900',
};

export default function ToastContainer() {
    const { toasts, dismissToast } = useToastContext();

    if (!toasts.length) return null;

    return (
        <div
            aria-live="polite"
            aria-atomic="false"
            className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
        >
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto
                        flex items-center gap-3
                        px-4 py-3 rounded-xl shadow-xl
                        text-sm font-semibold
                        max-w-xs w-full
                        animate-slideUp
                        ${STYLES[toast.type] || STYLES.info}
                    `}
                    role="alert"
                >
                    <span className="text-base flex-shrink-0">{ICONS[toast.type] || ICONS.info}</span>
                    <span className="flex-1">{toast.message}</span>
                    <button
                        onClick={() => dismissToast(toast.id)}
                        className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
                        aria-label="Dismiss notification"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
