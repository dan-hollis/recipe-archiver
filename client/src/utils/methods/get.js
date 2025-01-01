import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function get(endpoint) {
    try {
        const response = await fetchWithAuth(`${API_URL}/api${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        return response;
    } catch (error) {
        throw error;
    }
}
