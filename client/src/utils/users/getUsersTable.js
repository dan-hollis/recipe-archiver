import { API_URL } from '../api';

async function getUsersTable(page, limit, search, sort) {
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

    const response = await fetch(`${API_URL}/api/users/table?${params}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch users table data');
    }

    const data = await response.json();
    return data;
}

export default getUsersTable; 