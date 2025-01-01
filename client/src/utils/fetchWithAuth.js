import refreshAccessToken from "./auth/refreshAccessToken";

export default async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
        
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        let response = await fetch(url, { ...options, headers });
        
        // Log the full response for debugging
        const responseData = await response.json();
        
        // Handle 401 error
        if (response.status === 401) {
            try {
                const newToken = await refreshAccessToken();
                                
                if (newToken) {
                    headers['Authorization'] = `Bearer ${newToken}`;
                    // Retry the request with new token
                    response = await fetch(url, { ...options, headers });
                    const retryData = await response.json();
                                        
                    if (!response.ok) {
                        throw new Error(retryData.message || 'Request failed after token refresh');
                    }
                    return retryData;
                } else {
                    throw new Error('Token refresh failed - no new token received');
                }
            } catch (error) {
                throw new Error(`Authentication failed: ${error.message}`);
            }
        }

        if (!response.ok) {
            throw new Error(responseData.message || `Request failed with status ${response.status}`);
        }

        return responseData;
    } catch (error) {
        // Only clear tokens if it's specifically an auth error
        if (error.message.includes('auth') || error.message.includes('401')) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
        }
        throw error;
    }
}