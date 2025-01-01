import { useEffect, useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import '../../index.css';
import { api } from '../../utils/api';

export default function Signup() {
    const { isDarkMode, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        confirm_password: '',
        recaptcha: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { executeRecaptcha } = useGoogleReCaptcha();

    useEffect(() => {
        console.log('ReCAPTCHA available:', !!executeRecaptcha);
    }, [executeRecaptcha]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        try {
            const token = await executeRecaptcha('signup');

            const response = await api.signup({
                ...formData,
                recaptcha: token
            });
            
            if (response.success) {
                navigate('/login', { state: { accountCreated: true } });
            }
        } catch (err) {
            setError(err.error || 'Failed to create account');
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark`}>
            <div className="max-w-md w-full space-y-8 p-8 bg-card-bg-light dark:bg-card-bg-dark rounded-lg shadow">
                <div>
                    <h2 className="text-center text-3xl font-bold text-text-light dark:text-text-dark">
                        Create an account
                    </h2>
                </div>

                {error && (
                    <div className="text-red-500 text-center">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    name: e.target.value
                                })}
                                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    email: e.target.value
                                })}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    username: e.target.value
                                })}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    password: e.target.value
                                })}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                value={formData.confirm_password}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    confirm_password: e.target.value
                                })}
                                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm Password"
                            />
                        </div>
                    </div>

                    <div className="text-sm text-card-text-light dark:text-card-text-dark">
                        <h3 className="font-medium mb-2">Password must contain:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>12 characters or more</li>
                            <li>1 digit or more</li>
                            <li>1 symbol or more</li>
                            <li>1 uppercase letter or more</li>
                            <li>1 lowercase letter or more</li>
                        </ul>
                    </div>

                    <div className="flex flex-col space-y-4">
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Sign up
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/home')}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            Continue as Guest
                        </button>

                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
                        </button>
                    </div>

                    <div className="text-center text-sm text-card-text-light dark:text-card-text-dark">
                        Already have an account?{' '}
                        <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            Login here
                        </a>
                    </div>

                    <div className="text-center text-xs text-card-text-light dark:text-card-text-dark">
                        This site is protected by reCAPTCHA and the Google{' '}
                        <a href="https://policies.google.com/privacy" className="text-blue-600 hover:text-blue-500">
                            Privacy Policy
                        </a>{' '}
                        and{' '}
                        <a href="https://policies.google.com/terms" className="text-blue-600 hover:text-blue-500">
                            Terms of Service
                        </a>{' '}
                        apply.
                    </div>
                </form>
            </div>
        </div>
    );
}