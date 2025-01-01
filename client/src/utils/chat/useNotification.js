import { useCallback } from 'react';

export function useNotification() {
    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }, []);

    const sendNotification = useCallback((title, options = {}) => {
        if (Notification.permission === 'granted') {
            return new Notification(title, options);
        }
        return null;
    }, []);

    return {
        requestNotificationPermission,
        sendNotification
    };
}