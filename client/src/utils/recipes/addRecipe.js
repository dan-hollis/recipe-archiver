import { API_URL } from "../api";
import fetchWithAuth from "../fetchWithAuth";

export default async function addRecipe(recipeData) {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/recipes/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(recipeData),
            credentials: 'include'
        });

        return response;
    } catch (error) {
        console.error('Error adding recipe:', error);
        throw error;
    }
}
