import { API_URL } from "../api";

export default async function logout() {
    try {
        const response = await fetch(`${API_URL}/api/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');

        const data = await response.json();

        if (!data.success) {
            throw new Error('Logout failed');
        }

        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear storage even if the API call fails
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        throw error;
    }
}
