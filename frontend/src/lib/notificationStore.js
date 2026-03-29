import { writable } from 'svelte/store';

export const notifications = writable([]);

export function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now();
    notifications.update(n => [...n, { id, message, type }]);
    
    setTimeout(() => {
        notifications.update(n => n.filter(t => t.id !== id));
    }, duration);
}
