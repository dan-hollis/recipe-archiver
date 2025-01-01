import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function unlinkProvider(provider, password) {
    try {
        const body = password ? { password } : {};
        const response = await fetchWithAuth(`${API_URL}/api/oauth/unlink/${provider}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            credentials: 'include'
        });
        return response;
    } catch (error) {
        throw error;
    }
}
