import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function updateUserTheme(theme) {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/profile/theme/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme }),
            credentials: 'include'
        });

        return response;
    } catch (error) {
        console.error('Error updating theme:', error);
        throw error;
    }
}
