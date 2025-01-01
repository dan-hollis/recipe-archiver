import jwtDecode from 'jwt-decode';
import React, { createContext, useEffect, useState } from 'react';
import { api } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const isTokenValid = (token) => {
        if (!token) return false;
        try {
            const { exp } = jwtDecode(token);
            return Date.now() < exp * 1000; // Check if the token is expired
        } catch (error) {
            console.error('Invalid token:', error);
            return false;
        }
    };

    useEffect(() => {
        const checkToken = async () => {
            try {
                if (!isTokenValid(token) && token) {
                    const newToken = await api.refreshAccessToken();
                    setToken(newToken);
                    localStorage.setItem('token', newToken);
                }
            } catch (error) {
                console.error('Failed to refresh token:', error);
                setToken(null);
                localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        };

        checkToken();
    }, [token]);

    return (
        <AuthContext.Provider value={{ token, setToken, loading }}>
            {children}
        </AuthContext.Provider>
    );
};