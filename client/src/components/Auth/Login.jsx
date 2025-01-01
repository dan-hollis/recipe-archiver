import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useContext, useEffect, useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { UserContext } from '../../contexts/UserContext';
import { api } from '../../utils/api';
import LoadingSpinner from '../LoadingSpinner';
import OAuthButton from './OAuthButton';

export default function Login() {
	const location = useLocation();
	const [credentials, setCredentials] = useState({
		username: '',
		password: '',
		remember_me: false
	});
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const navigate = useNavigate();
	const { executeRecaptcha } = useGoogleReCaptcha();
	const { isDarkMode, toggleTheme } = useTheme();
	const { user, loading } = useContext(UserContext);
	const { setToken } = useContext(AuthContext);

	const [isMounted, setIsMounted] = useState(true);
	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		return () => setIsMounted(false);
	}, []);

	useEffect(() => {
		if (location.state?.accountCreated) {
			setSuccessMessage('Account created successfully');
		}
	}, [location.state]);

	useEffect(() => {
		if (!loading && user && location.pathname === '/login') {
			navigate('/home');
		}
	}, [loading, user, navigate, location]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!isMounted) return;
		setError('');

		try {
			const token = await Promise.race([
				executeRecaptcha('login'),
				new Promise((_, reject) => 
					setTimeout(() => reject(new Error('reCAPTCHA timed out')), 10000)
				)
			]);

			const response = await api.login({
				...credentials,
				recaptcha: token
			});

			if (response.success && isMounted) {
				if (response.require_mfa) {
					navigate(`/mfa/${response.user_id}`);
				} else {
					localStorage.setItem('token', response.access_token);
					localStorage.setItem('refresh_token', response.refresh_token);
					
					setToken(response.access_token);
					
					navigate('/home', { replace: true });
				}
			} else if (isMounted) {
				setError(response.error || 'An error occurred during login');
			}
		} catch (err) {
			if (isMounted) {
				console.error('Login error:', err);
				setError(err.message || 'An error occurred during login');
			}
		}
	};

	if (loading) {
		return <LoadingSpinner />;
	}

	return (
		<div className={`min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark`}>
			<div className="max-w-md w-full space-y-8 p-8 bg-card-bg-light dark:bg-card-bg-dark rounded-lg shadow">
				<div>
					<h2 className="text-center text-3xl font-bold text-text-light dark:text-text-dark">
						Sign in to your account
					</h2>
					<p className="mt-2 text-center text-sm text-card-text-light dark:text-card-text-dark">
						Or{' '}
						<a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
							create a new account
						</a>
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					{successMessage && (
						<div className="text-green-500 text-center">
							{successMessage}
						</div>
					)}
					{error && (
						<div className="text-red-500 text-center">
							{error}
						</div>
					)}
					<div className="rounded-md shadow-sm -space-y-px">
						<div>
							<input
								type="text"
								required
								value={credentials.username}
								onChange={(e) => setCredentials({
									...credentials,
									username: e.target.value
								})}
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder="Username or Email"
							/>
						</div>
						<div className="relative">
							<input
								type={showPassword ? "text" : "password"}
								required
								value={credentials.password}
								onChange={(e) => setCredentials({
									...credentials,
									password: e.target.value
								})}
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="Password"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute inset-y-0 right-0 px-3 flex items-center z-10"
							>
								{showPassword ? (
									<EyeSlashIcon className="h-5 w-5 text-gray-400" />
								) : (
									<EyeIcon className="h-5 w-5 text-gray-400" />
								)}
							</button>
						</div>
						<div className="flex items-center justify-between mt-4">
							<div className="flex items-center">
								<input
									id="remember_me"
									name="remember_me"
									type="checkbox"
									checked={credentials.remember_me}
									onChange={(e) => setCredentials({
										...credentials,
										remember_me: e.target.checked
									})}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
									Remember me
								</label>
							</div>
						</div>
					</div>

					<div className="flex flex-col space-y-4">
						<button
							type="submit"
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Sign in
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

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-300" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-card-bg-light dark:bg-card-bg-dark text-card-text-light dark:text-card-text-dark">Or continue with</span>
							</div>
						</div>

						<OAuthButton provider="Discord" />
					</div>

					<div className="text-center text-xs text-card-text-light dark:text-card-text-dark mt-4">
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