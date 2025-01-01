import jwtDecode from 'jwt-decode';
import React, { createContext, useEffect, useState } from 'react';
import { api } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkToken = async () => {
            try {
                // If token exists but is invalid, try to refresh
                if (token && !isTokenValid(token)) {
                    const newToken = await api.refreshAccessToken();
                    setToken(newToken);
                    localStorage.setItem('token', newToken);
                }
            } catch (error) {
                // Clear invalid tokens
                setToken(null);
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
            } finally {
                setLoading(false);
            }
        };

        checkToken();
    }, [token]);

    // Update localStorage whenever token changes
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    return (
        <AuthContext.Provider value={{ token, setToken, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

function isTokenValid(token) {
    if (!token) return false;
    try {
        const decoded = jwtDecode(token);
        return decoded.exp * 1000 > Date.now();
    } catch (error) {
        return false;
    }
}