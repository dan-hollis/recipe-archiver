import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { UserContext } from '../../contexts/UserContext';
import { api } from '../../utils/api';
import Layout from '../Layout';

export default function MFASetup() {
    const [qrCode, setQrCode] = useState('');
    const [secretToken, setSecretToken] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { user, loading } = useContext(UserContext);

    useEffect(() => {
        const fetchMFASetup = async () => {
            try {
                const response = await api.getMFASetup();
                if (response.qr_code && response.secret_token) {
                    setQrCode(response.qr_code);
                    setSecretToken(response.secret_token);
                }
            } catch (error) {
                console.error('Failed to fetch MFA setup:', error);
            }
        };

        if (!loading && user) {
            fetchMFASetup();
        }
    }, [loading, user]);

    const copySecret = () => {
        navigator.clipboard.writeText(secretToken)
            .then(() => {
                alert('Successfully copied TOTP secret token!');
            })
            .catch(err => {
                console.error('Failed to copy:', err);
            });
    };

    const handleMfaCodeSubmit = async () => {
        try {
            const response = await api.verifyMFA(mfaCode);
            if (response.success) {
                alert('MFA setup complete!');
                navigate('/profile');
            } else {
                alert('Invalid MFA code. Please try again.');
            }
        } catch (error) {
            console.error('Failed to verify MFA code:', error);
        }
    };

    if (loading || !user) {
        return <Layout><div></div></Layout>;
    }

    return (
        <Layout>
            <div className="flex items-center justify-center">
                <div className="max-w-md w-full space-y-8 p-8 bg-card-bg-light dark:bg-card-bg-dark rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-center">Set Up Two-Factor Authentication</h2>
                    
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            Download{' '}
                            <a 
                                href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-500"
                            >
                                Google Authenticator
                            </a>
                            {' '}on your mobile device.
                        </li>
                        <li>Set up a new authenticator account.</li>
                        <li>Scan the QR code below with your authenticator app.</li>
                    </ul>

                    {qrCode && (
                        <div className="flex justify-center">
                            <img 
                                src={qrCode} 
                                alt="QR Code"
                                className="w-48 h-48"
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <label htmlFor="secret" className="block text-sm font-medium">
                            Secret Token
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                                type="text"
                                id="secret"
                                value={secretToken}
                                readOnly
                                className={`block w-full px-4 py-3 border ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-black border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                            />
                        </div>
                        <button
                            onClick={copySecret}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Copy Secret
                        </button>
                    </div>

                    <div className="space-y-3">
                        <label htmlFor="mfaCode" className="block text-sm font-medium">
                            Enter MFA Code
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                                type="text"
                                id="mfaCode"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                className={`block w-full px-4 py-3 border ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-black border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                            />
                        </div>
                        <button
                            onClick={handleMfaCodeSubmit}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            Verify MFA Code
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}