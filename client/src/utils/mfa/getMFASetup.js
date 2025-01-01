import { API_URL } from "../api";

export default async function getMFASetup() {
    const response = await fetch(`${API_URL}/api/mfa/setup`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
    });
    
    const data = response.json();
    
    if (!response.status) {
        throw data;
    }
    
    return data;
}
