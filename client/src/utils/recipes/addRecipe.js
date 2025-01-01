import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function addRecipe(recipeData) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetchWithAuth(`${API_URL}/api/recipes/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(recipeData),
            credentials: 'include'
        });

        if (!response.success) {
            throw new Error(response.message || 'Failed to add recipe');
        }

        return response;
    } catch (error) {
        throw error;
    }
}
