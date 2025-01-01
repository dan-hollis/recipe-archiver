import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';

function ProtectedRoute({ children }) {
	const { token, loading: authLoading } = useContext(AuthContext);
	const { user, loading: userLoading } = useContext(UserContext);
	const { isDarkMode } = useTheme();
	
    if (authLoading || userLoading) {
        return (
            <div className={`min-h-screen ${isDarkMode ? 'bg-background-dark' : 'bg-background-light'}`}>
                {/* Optional: Add a loading spinner here */}
            </div>
        );
    }

    if (!token || !user) {
        return <Navigate to="/home" replace />;
    }

    return children;
}

export default ProtectedRoute;