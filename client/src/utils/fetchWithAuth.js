import refreshAccessToken from "./auth/refreshAccessToken";

export default async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
    };

    // Only add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            // Token expired, refresh it
            try {
                const newToken = await refreshAccessToken();
                localStorage.setItem('token', newToken);

                // Retry the request with the new token
                headers['Authorization'] = `Bearer ${newToken}`;
                return fetch(url, { ...options, headers });
            } catch (error) {
                console.error('Failed to refresh token:', error);
                // Continue with request without token for guest access
                delete headers['Authorization'];
                return fetch(url, { ...options, headers });
            }
        }

        const data = await response.json();
        return data;
    }

    // Make request without Authorization header for guest access
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    return data;
}