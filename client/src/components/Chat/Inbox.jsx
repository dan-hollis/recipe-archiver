import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { socket } from '../../utils/socket';

export default function Inbox() {
    const [users, setUsers] = useState({});
    
    useEffect(() => {
        socket.emit('refresh_sidebar');

        socket.on('update_sidebar', (data) => {
            setUsers(data.data);
        });

        // Refresh every minute
        const interval = setInterval(() => {
            socket.emit('refresh_sidebar');
        }, 60000);

        return () => {
            socket.off('update_sidebar');
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="max-w-3xl mx-auto bg-card-bg-light dark:bg-card-bg-dark rounded-lg shadow">
            <ul className="divide-y divide-gray-200">
                {Object.entries(users).map(([username, userData]) => (
                    <li key={userData.user_id} className="hover:bg-gray-50">
                        <Link 
                            to={`/messages/${userData.user_id}`}
                            className="p-4 flex items-center space-x-4"
                        >
                            <img 
                                src={`/static/img/${userData.avatar}`}
                                alt={username}
                                className="h-12 w-12 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                    {username}
                                </p>
                                {userData.message_preview && (
                                    <p className="text-sm text-gray-500 truncate">
                                        {userData.message_preview}
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                {userData.latest_timestamp && (
                                    <p className="text-xs text-gray-500">
                                        {userData.latest_timestamp}
                                    </p>
                                )}
                                {userData.notif_count > 0 && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        {userData.notif_count}
                                    </span>
                                )}
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}