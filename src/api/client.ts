import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
    console.error('VITE_API_URL is NOT defined. Using default: http://localhost:8000');
} else {
    console.log('API Base URL:', baseURL);
}

const client = axios.create({
    baseURL: baseURL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the JWT token to headers
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        // Do not add Authorization header for the login endpoint
        if (token && !config.url?.includes('/auth/login')) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            // Optional: Redirect to login if not already there
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
