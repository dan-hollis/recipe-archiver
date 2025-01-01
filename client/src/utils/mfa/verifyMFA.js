import { API_URL } from "../api";

export default async function verifyMFA(mfaCode) {
    const response = await fetch(`${API_URL}/api/mfa/verify`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: mfaCode })
    });

    const data = response.json();
    
    if (!response.status) {
        throw data;
    }
    
    return data;
}