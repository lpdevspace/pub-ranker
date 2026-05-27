// useToast — thin wrapper around ToastContext so components import from one place.
// Usage: const { showToast } = useToast();
import { useToastContext } from '../context/ToastContext';

export function useToast() {
    return useToastContext();
}
