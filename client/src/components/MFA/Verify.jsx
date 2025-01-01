import { useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';

export default function MFAVerify() {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { userId } = useParams();
    const { executeRecaptcha } = useGoogleReCaptcha();
    const isDisabling = window.location.pathname === '/mfa/disable';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const token = await executeRecaptcha('mfa_verify');
            
            const endpoint = isDisabling ? '/api/mfa/disable' : `/api/mfa/verify/${userId}`;
            const response = await api.post(endpoint, {
                otp,
                recaptcha: token
            });

            if (response.success) {
                if (isDisabling) {
                    navigate('/profile');
                } else if (response.access_token) {
                    // Login case
                    localStorage.setItem('token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    navigate('/');
                } else {
                    // Setup case
                    navigate('/profile');
                }
            }
        } catch (err) {
            setError(err.error || 'Verification failed. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center">
            <div className="max-w-md w-full space-y-8 p-8 bg-card-bg-light dark:bg-card-bg-dark rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center">
                    {isDisabling ? 'Disable' : 'Verify'} Multi-Factor Authentication
                </h2>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="otp" className="sr-only">
                            MFA Code
                        </label>
                        <input
                            id="otp"
                            name="otp"
                            type="text"
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="Enter MFA Code"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {isDisabling ? 'Disable MFA' : 'Verify'}
                    </button>
                </form>
            </div>
        </div>
    );
}