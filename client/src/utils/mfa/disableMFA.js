import { API_URL } from "../api";

export default async function disableMFA(data) {
    const response = await fetch(`${API_URL}/api/mfa/disable`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    const response_data = response.json();
    
    if (!response_data.status) {
        throw response_data;
    }
    
    return response_data;
}