import { useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_NODE_ENV === 'production' 
    ? import.meta.env.VITE_PROD_URL
    : import.meta.env.VITE_DEV_SOCKET_URL;

// Create socket with auth headers
export const createSocket = (token) => {
    return io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: {
            token: token
        },
        extraHeaders: {
            'Authorization': `Bearer ${token}`
        }
    });
};

// Initialize socket as null
export let socket = null;

// Function to initialize socket connection
export const initializeSocket = (token) => {
    socket = createSocket(token);
    return socket;
};

// Create a custom hook for notification handling
export const useSocketNotifications = (setNotificationCount, token) => {
    useEffect(() => {
        // Initialize socket if it doesn't exist
        if (!socket) {
            socket = initializeSocket(token);
        }

        socket.on('push_notification', (data) => {
            setNotificationCount(data.notification_count || 0);
        });

        socket.on('connect', () => {
            socket.emit('update_message_counter');
        });

        return () => {
            socket.off('push_notification');
            socket.off('connect');
        };
    }, [setNotificationCount, token]);
};

// Export common socket events
export const socketEvents = {
    updateMessageCounter: () => socket?.emit('update_message_counter'),
    chatUserConnected: (recipientId) => socket?.emit('chat_user_connected', { 
        data: { recipient: recipientId } 
    }),
    messageInput: (message) => socket?.emit('message_input', { 
        data: { message } 
    }),
    refreshSidebar: () => socket?.emit('refresh_sidebar')
};