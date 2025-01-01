import { API_URL } from "../api";

export default async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await fetch(`${API_URL}/api/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Refresh token request failed');
        }

        if (!data.success) {
            throw new Error(data.message || 'Failed to refresh token');
        }

        localStorage.setItem('token', data.access_token);
        return data.access_token;
    } catch (error) {
        // Clear tokens on refresh failure
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        throw error;
    }
}
