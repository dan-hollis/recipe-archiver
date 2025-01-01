import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function deleteRecipe(id) {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/recipes/${id}`, {
            method: 'DELETE',
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