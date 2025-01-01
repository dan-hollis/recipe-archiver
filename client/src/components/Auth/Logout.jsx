import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

export default function Logout() {
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                await api.logout();
                navigate('/login');
            } catch (error) {
                setError('Failed to log out. Please try again.');
            }
        };

        performLogout();
    }, [navigate]);

    return (
        <div>
            {error && (
                <div className="text-red-500 text-center mt-4">
                    {error}
                </div>
            )}
        </div>
    );
}