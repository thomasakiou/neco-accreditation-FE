import axios from 'axios';

const envBaseURL = import.meta.env.VITE_API_URL;

// On Netlify, we want to use the proxy /api to avoid CORS issues.
// If VITE_API_URL is set to '/api' or is missing on a remote host, we use '/api'.
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const baseURL = envBaseURL || (isLocalhost ? 'http://localhost:8000' : '/api');

console.log('API Base URL configuration:', {
    envValue: envBaseURL,
    resolvedURL: baseURL,
    isLocalhost
});

const client = axios.create({
    baseURL: baseURL,
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
