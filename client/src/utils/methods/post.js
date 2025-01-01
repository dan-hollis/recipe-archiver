import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function post(endpoint, data) {
    try {
        const response = await fetchWithAuth(`${API_URL}/api${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return response;
    } catch (error) {
        console.error(`Error posting to ${endpoint}:`, error);
        throw error;
    }
}