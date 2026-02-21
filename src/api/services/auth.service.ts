import client from '../client';
import { components } from '../types';

type Token = components['schemas']['Token'];

const AuthService = {
    login: async (credentials: components['schemas']['Body_login_api_v1_auth_login_post']): Promise<Token> => {
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        if (credentials.grant_type) formData.append('grant_type', credentials.grant_type);
        if (credentials.scope) formData.append('scope', credentials.scope);
        if (credentials.client_id) formData.append('client_id', credentials.client_id);
        if (credentials.client_secret) formData.append('client_secret', credentials.client_secret);

        const response = await client.post<Token>('/api/v1/auth/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('user_role', response.data.role);
        }

        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
    },

    getCurrentUser: async () => {
        const response = await client.get('/api/v1/auth/me');
        return response.data;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    },

    getUserRole: () => {
        return localStorage.getItem('user_role');
    }
};

export default AuthService;
