import { useState, useCallback } from 'react';

/**
 * useToast — lightweight toast notification hook
 * Usage: const { toasts, showToast } = useToast();
 * showToast("Message", "success" | "error" | "info" | "warning");
 */
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, dismissToast };
}
