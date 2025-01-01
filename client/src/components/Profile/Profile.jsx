import dayjs from 'dayjs';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { api } from '../../utils/api';
import LoadingSpinner from '../LoadingSpinner';

// Define user fields and their display properties
const USER_FIELDS = {
    quote: {
        label: 'Quote',
        icon: '💭',
        render: value => value
    },
    role: {
        label: 'Role',
        icon: '👤',
        render: value => value?.charAt(0).toUpperCase() + value?.slice(1)
    },
    joined_date: {
        label: 'Joined',
        icon: '📅',
        render: (value, dateFormat) => dayjs(value).format(dateFormat)
    },
    bio: {
        label: 'Bio',
        icon: '📝',
        render: value => value
    }
};

export default function Profile() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const { user, loading: userLoading } = useContext(UserContext);
    const [otherUserData, setOtherUserData] = useState(null);
    const [loadingOtherUser, setLoadingOtherUser] = useState(false);

    const isCurrentUser = useMemo(() => 
        user && (!userId || parseInt(userId) === user.id),
        [userId, user]
    );

    const isAdmin = useMemo(() => 
        user?.role === 'admin',
        [user?.role]
    );

    const displayUser = useMemo(() => 
        isCurrentUser ? user : otherUserData,
        [isCurrentUser, user, otherUserData]
    );

    useEffect(() => {
        let mounted = true;

        const fetchOtherUser = async () => {
            if (!isCurrentUser && userId) {
                setLoadingOtherUser(true);
                try {
                    const response = await api.getUserProfile(userId);
                    if (mounted && response.success) {
                        setOtherUserData(response.user);
                    }
                } catch (error) {
                    if (mounted) {
                        navigate('/404', { replace: true });
                    }
                } finally {
                    if (mounted) {
                        setLoadingOtherUser(false);
                    }
                }
            }
        };

        fetchOtherUser();
        return () => { mounted = false; };
    }, [userId, isCurrentUser, navigate]);

    // If no userId and no logged-in user, redirect to home
    useEffect(() => {
        if (!userId && !user && !userLoading) {
            navigate('/home');
        }
    }, [userId, user, userLoading, navigate]);

    if (userLoading || (!isCurrentUser && loadingOtherUser)) {
        return <LoadingSpinner />;
    }

    if (!displayUser) return null;

    const canViewField = (field) => 
        isCurrentUser || !displayUser.hidden_fields?.includes(field) || isAdmin;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="p-6">
                            <div className="relative">
                                <img
                                    src={`/static/img/${displayUser.profile_picture}`}
                                    alt={displayUser.username}
                                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-primary/20"
                                />
                            </div>
                            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                                {displayUser.username}
                            </h1>
                            {user && (
                                <>
                                    {(isCurrentUser || (user?.role === 'admin')) && (
                                        <button
                                            onClick={() => navigate(isCurrentUser ? '/profile/edit' : `/profile/edit/${displayUser.id}`)}
                                            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                            Edit Profile
                                        </button>
                                    )}
                                    {!isCurrentUser && (
                                        <button
                                            onClick={() => navigate(`/messages/chat/${displayUser.id}`)}
                                            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
                                        >
                                            Message
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {/* Details Cards */}
                <div className="lg:col-span-3 space-y-6">
                    {/* MFA Card - Only for current user when logged in */}
                    {user && isCurrentUser && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className="text-xl">🔐</span>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                                </div>
                                <a
                                    href={displayUser.is_mfa_enabled ? '/mfa/disable' : '/mfa/setup'}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        displayUser.is_mfa_enabled 
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-primary hover:bg-primary/90 text-white'
                                    }`}
                                >
                                    {displayUser.is_mfa_enabled ? 'Disable MFA' : 'Enable MFA'}
                                </a>
                            </div>
                        </div>
                    )}
                    {/* User Details Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                        <div className="space-y-6">
                            {Object.entries(USER_FIELDS).map(([field, config]) => (
                                canViewField(field) && displayUser[field] && (
                                    <div key={field} className="flex items-start space-x-3">
                                        <span className="text-xl">{config.icon}</span>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                {config.label}
                                            </h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">
                                                {config.render(displayUser[field], displayUser.date_format)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}