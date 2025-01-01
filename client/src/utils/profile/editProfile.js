import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function editProfile(formData) {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/profile/edit`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        return response;
    } catch (error) {
        throw error;
    }
}
