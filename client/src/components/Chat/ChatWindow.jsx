import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSound } from 'use-sound';
import { useChat } from '../../utils/chat/useChat';
import { useNotification } from '../../utils/chat/useNotification';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import MessageSearch from './MessageSearch';

export default function ChatWindow() {
    const { userId } = useParams();
    const { messages, sendMessage, handleTyping, isTyping } = useChat(parseInt(userId));
    const [searchTerm, setSearchTerm] = useState('');
    const [playMessageSound] = useSound('/sounds/message.mp3');
    const { requestNotificationPermission, sendNotification } = useNotification();
    
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    const handleNewMessage = useCallback((message) => {
        playMessageSound();
        if (document.hidden) {
            sendNotification('New Message', {
                body: message.body,
                icon: '/icon.png'
            });
        }
    }, []);

    const handleMessageSubmit = (message) => {
        sendMessage(message);
    };

    const handleInputChange = (value) => {
        handleTyping(true);
        // Clear previous timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        // Set new timeout
        setTypingTimeout(setTimeout(() => handleTyping(false), 1000));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.32))]">
            <MessageSearch value={searchTerm} onChange={setSearchTerm} />
            <MessageList 
                messages={messages} 
                searchTerm={searchTerm}
                onMessageDelete={handleNewMessage}
                onMessageEdit={handleNewMessage}
                onReactionAdd={handleNewMessage}
            />
            {isTyping && (
                <div className="text-sm text-gray-500 px-4">
                    User is typing...
                </div>
            )}
            <MessageInput 
                onSubmit={handleMessageSubmit}
                onChange={handleInputChange}
            />
        </div>
    );
}