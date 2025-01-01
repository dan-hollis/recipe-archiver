import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../utils/api';
import { AuthContext } from './AuthContext';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            try {
                if (!token) {
                    // Don't log or clear user when there's no token
                    // as this is an expected state for guest access
                    setLoading(false);
                    return;
                }

                // Get user ID from JWT payload with error checking
                try {
                    const [header, payload, signature] = token.split('.');
                    const decodedPayload = JSON.parse(atob(payload));
                    
                    if (!decodedPayload.sub) {
                        throw new Error('No user ID found in token');
                    }

                    const data = await api.getUserProfile(decodedPayload.sub);
                    if (data && data.success) {
                        setUser(data.user);
                    } else {
                        setUser(null);
                    }
                } catch (jwtError) {
                    setUser(null);
                }
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [token]); // Re-fetch when token changes

    return (
        <UserContext.Provider value={{ user, setUser, loading }}>
            {children}
        </UserContext.Provider>
    );
};