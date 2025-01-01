import { API_URL } from "../api";

export default async function signup(formData) {
    const response = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
    });

    const data = await response.json();
    
    if (!response.status) {
        throw data;
    }
    
    return data;
}