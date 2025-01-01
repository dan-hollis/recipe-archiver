import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function getConnectedAccounts() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/profile/connected-accounts`, {
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
