import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';
import { UserContext } from '../../contexts/UserContext';
import LoadingSpinner from '../LoadingSpinner';

export default function OAuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setToken } = useContext(AuthContext);
    const { setUser } = useContext(UserContext);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log('Starting OAuth callback processing');
                const searchParams = new URLSearchParams(location.search);
                
                const accessToken = searchParams.get('access_token');
                const refreshToken = searchParams.get('refresh_token');
                const requireMfa = searchParams.get('require_mfa') === 'true';
                const userId = searchParams.get('user_id');
                const error = searchParams.get('error');

                console.log('Received params:', { accessToken, refreshToken, requireMfa, userId, error });

                if (!accessToken || !refreshToken) {
                    console.error('Missing tokens in callback');
                    toast.error('Authentication failed - missing tokens');
                    navigate('/login');
                    return;
                }

                // Store tokens
                localStorage.setItem('token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);
                
                // Update auth context
                setToken(accessToken);

                // Fetch user data
                if (userId) {
                    try {
                        const response = await fetch(`/api/profile/${userId}`, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            }
                        });
                        const data = await response.json();
                        if (data.success) {
                            setUser(data.user);
                            if (requireMfa) {
                                navigate(`/mfa/${userId}`);
                            } else {
                                navigate('/home', { replace: true });
                            }
                        } else {
                            throw new Error('Failed to fetch user data');
                        }
                    } catch (error) {
                        console.error('Error fetching user data:', error);
                        toast.error('Failed to load user data');
                        navigate('/login');
                    }
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
                toast.error('Authentication failed');
                navigate('/login');
            }
        };

        handleCallback();
    }, [navigate, setToken, setUser, location]);

    return <LoadingSpinner />;
}