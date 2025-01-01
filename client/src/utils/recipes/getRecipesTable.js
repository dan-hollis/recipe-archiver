import { API_URL } from '../api';

export default async function getRecipesTable(page, limit, search, sort) {
    try {
        const params = new URLSearchParams();
        
        params.append('page', page);
        params.append('limit', limit);
        
        if (search) {
            params.append('search', search);
        }
        
        if (sort && sort.length) {
            const sortString = sort.map(s => 
                `${s.desc ? '-' : ''}${s.id}`
            ).join(',');
            params.append('sort', sortString);
        }

        const response = await fetch(`${API_URL}/api/recipes/table?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.status !== 'success') {
            throw new Error(data.message || 'Failed to fetch recipes table data');
        }

        return {
            data: data.data || [],
            total: data.total || 0
        };

    } catch (error) {
        throw new Error('Failed to fetch recipes table data');
    }
}
