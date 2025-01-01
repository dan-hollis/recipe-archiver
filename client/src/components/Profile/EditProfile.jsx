import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { api } from '../../utils/api';
import OAuthButton from '../Auth/OAuthButton';

export default function EditProfile() {
    const navigate = useNavigate();
    const { user, setUser } = useContext(UserContext);
    const [formData, setFormData] = useState({
        username: '',
        quote: '',
        bio: '',
        spoonacular_api_key: '',
        date_format: '',
        password: '',
        confirm_password: '',
        hidden_fields: []
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState({});
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [showUnlinkPassword, setShowUnlinkPassword] = useState(false);
    const [unlinkPasswordVisible, setUnlinkPasswordVisible] = useState(false);
    const [unlinkProvider, setUnlinkProvider] = useState(null);
    const [unlinkPassword, setUnlinkPassword] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/home');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                username: user.username || '',
                quote: user.quote || '',
                bio: user.bio || '',
                spoonacular_api_key: user.spoonacular_api_key || '',
                date_format: user.date_format || 'YYYY-MM-DD',
                hidden_fields: user.hidden_fields || []
            }));
        }
    }, [user]);

    useEffect(() => {
        const fetchConnectedAccounts = async () => {
            try {
                const response = await api.getConnectedAccounts();
                console.log('Connected accounts raw response:', JSON.stringify(response, null, 2));
                if (response.success) {
                    console.log('Setting connected accounts:', response.connected_accounts);
                    setConnectedAccounts(response.connected_accounts);
                }
            } catch (err) {
                console.error('Failed to fetch connected accounts:', err);
            }
        };

        fetchConnectedAccounts();
    }, []);

    useEffect(() => {
        if (user) {
            const hasPassword = user.primary_login_method === 'password';
            const oauthCount = Object.keys(connectedAccounts).length;
            
            // Show password section if:
            // 1. User doesn't have password auth AND
            // 2. They're about to unlink their only OAuth connection
            setShowPasswordSection(!hasPassword && oauthCount <= 1);
        }
    }, [user, connectedAccounts]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleHiddenFieldsChange = (field) => {
        setFormData(prev => ({
            ...prev,
            hidden_fields: prev.hidden_fields.includes(field)
                ? prev.hidden_fields.filter(f => f !== field)
                : [...prev.hidden_fields, field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password && formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            window.scrollTo(0, 0);
            return;
        }

        try {
            const response = await api.editProfile(formData);
            if (response.success) {
                setSuccess('Profile updated successfully');
                setUser(response.user);
                window.scrollTo(0, 0);
            } else {
                setError(response.error || 'Failed to update profile');
                window.scrollTo(0, 0);
            }
        } catch (err) {
            setError('An error occurred while updating the profile');
            window.scrollTo(0, 0);
        }
    };

    const handleUnlink = async (provider) => {
        // If password auth is primary method, show password input first
        if (user.primary_login_method === 'password') {
            setUnlinkProvider(provider);
            setShowUnlinkPassword(true);
            return;
        }

        // Rest of the existing unlink logic for OAuth-only users
        const oauthCount = Object.keys(connectedAccounts).length;
        const needsPassword = oauthCount === 1;
        
        if (needsPassword) {
            if (!formData.password) {
                setError('Please set up a password before unlinking your account');
                setShowPasswordSection(true);
                window.scrollTo(0, 0);
                return;
            }
            
            if (formData.password !== formData.confirm_password) {
                setError('Passwords do not match');
                window.scrollTo(0, 0);
                return;
            }
        }

        try {
            const requestData = needsPassword 
                ? { password: formData.password }
                : (user.primary_login_method === 'password' ? { password: formData.password } : {});
            
            const response = await api.unlinkProvider(provider, requestData.password);
            if (response.success) {
                setConnectedAccounts(prev => {
                    const updated = { ...prev };
                    delete updated[provider];
                    return updated;
                });
                setFormData(prev => ({
                    ...prev,
                    password: '',
                    confirm_password: ''
                }));
                if (response.user) {
                    setUser(response.user);
                }
                setShowPasswordSection(false);
                setSuccess('Account unlinked successfully');
                window.scrollTo(0, 0);
            } else {
                setError(response.error || 'Failed to unlink account');
                window.scrollTo(0, 0);
            }
        } catch (err) {
            setError('An error occurred while unlinking the account');
            window.scrollTo(0, 0);
        }
    };

    const handleUnlinkConfirm = async () => {
        try {
            const response = await api.unlinkProvider(unlinkProvider, unlinkPassword);
            if (response.success) {
                setConnectedAccounts(prev => {
                    const updated = { ...prev };
                    delete updated[unlinkProvider];
                    return updated;
                });
                setShowUnlinkPassword(false);
                setUnlinkPassword('');
                setUnlinkProvider(null);
                if (response.user) {
                    setUser(response.user);
                }
                setSuccess('Account unlinked successfully');
                window.scrollTo(0, 0);
            } else {
                setError(response.error || 'Failed to unlink account');
                window.scrollTo(0, 0);
            }
        } catch (err) {
            setError('An error occurred while unlinking the account');
            window.scrollTo(0, 0);
        }
    };

    const renderConnectedAccounts = () => (
        <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Connected Accounts</h3>
            <div className="space-y-4">
                {Object.entries(connectedAccounts).map(([provider, data]) => (
                    <div key={provider} className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                </span>
                                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                    Connected as {data.username}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleUnlink(provider)}
                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                                Unlink
                            </button>
                        </div>
                    </div>
                ))}
                
                {!connectedAccounts?.discord && (
                    <div className="flex gap-4 mt-4">
                        <OAuthButton 
                            provider="Discord"
                            isLink={true}
                        />
                    </div>
                )}
            </div>
            
            {showUnlinkPassword && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Please enter your password to confirm unlinking
                    </p>
                    <div className="relative">
                        <input
                            type={unlinkPasswordVisible ? "text" : "password"}
                            value={unlinkPassword}
                            onChange={(e) => setUnlinkPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10"
                            placeholder="Enter your password"
                        />
                        <button
                            type="button"
                            onClick={() => setUnlinkPasswordVisible(!unlinkPasswordVisible)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center"
                        >
                            {unlinkPasswordVisible ? (
                                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                                <EyeIcon className="h-5 w-5 text-gray-400" />
                            )}
                        </button>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={handleUnlinkConfirm}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                            Confirm Unlink
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowUnlinkPassword(false);
                                setUnlinkPassword('');
                                setUnlinkProvider(null);
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderPasswordSection = () => (
        showPasswordSection && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                    To ensure you don't lose access to your account, please set a password before unlinking your only OAuth connection.
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center"
                            >
                                {showPassword ? (
                                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                                ) : (
                                    <EyeIcon className="h-5 w-5 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            name="confirm_password"
                            value={formData.confirm_password}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required={showPasswordSection}
                        />
                    </div>
                </div>
            </div>
        )
    );

    console.log('Render state:', {
        showPasswordSection,
        user: user?.primary_login_method,
        oauthCount: Object.keys(connectedAccounts).length,
        connectedAccounts
    });

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Edit Profile</h2>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quote</label>
                        <input
                            type="text"
                            name="quote"
                            value={formData.quote}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spoonacular API Key</label>
                        <div className="relative">
                            <input
                                type={showApiKey ? "text" : "password"}
                                name="spoonacular_api_key"
                                value={formData.spoonacular_api_key}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center"
                            >
                                {showApiKey ? (
                                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                                ) : (
                                    <EyeIcon className="h-5 w-5 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Format</label>
                        <select
                            name="date_format"
                            value={formData.date_format}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hidden Fields</label>
                        <div className="space-y-2">
                            {['quote', 'bio', 'role', 'joined_date'].map(field => (
                                <div key={field} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={field}
                                        checked={formData.hidden_fields.includes(field)}
                                        onChange={() => handleHiddenFieldsChange(field)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={field} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    {renderConnectedAccounts()}
                    {renderPasswordSection()}
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={() => navigate('/profile')}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}