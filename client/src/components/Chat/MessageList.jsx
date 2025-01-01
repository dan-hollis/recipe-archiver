import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useRef } from 'react';

// Initialize the relative time plugin
dayjs.extend(relativeTime);

export default function MessageList({ messages, searchTerm }) {
    const messagesEndRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user'));

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const filteredMessages = messages.filter(message => 
        message.body.toUpperCase().includes(searchTerm.toUpperCase())
    );

    return (
        <ul className="space-y-4">
            {filteredMessages.map((message, index) => (
                <li 
                    key={index}
                    className={`flex ${message.sender === currentUser.username ? 'justify-end' : 'justify-start'} gap-3`}
                >
                    {message.sender !== currentUser.username && (
                        <img 
                            src={`/static/img/${message.avatar}`}
                            alt="avatar" 
                            className="h-10 w-10 rounded-full"
                        />
                    )}
                    
                    <div className={`flex max-w-xl ${message.sender === currentUser.username ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-lg p-3`}>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium">
                                    {message.sender === currentUser.username ? 'You' : message.sender}
                                </p>
                                <span className="text-xs opacity-50">
                                    {dayjs(message.timestamp).format('HH:mm | MMM D YYYY')}
                                </span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words">
                                {message.body}
                            </p>
                        </div>
                    </div>

                    {message.sender === currentUser.username && (
                        <img 
                            src={`/static/img/${message.avatar}`}
                            alt="avatar" 
                            className="h-10 w-10 rounded-full"
                        />
                    )}
                </li>
            ))}
            <div ref={messagesEndRef} />
        </ul>
    );
}