import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function getUserProfile(userId) {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/profile/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        return response;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}
