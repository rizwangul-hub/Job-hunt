import axios from 'axios';

// Dynamically use VITE_API_URL in production (e.g., on Vercel) or fallback to '/api' for Vite dev proxy
const metaEnv = (import.meta as any).env || {};
const rawBaseUrl: string = metaEnv.VITE_API_URL || '';
const baseURL = rawBaseUrl
  ? rawBaseUrl.endsWith('/api')
    ? rawBaseUrl
    : `${rawBaseUrl.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rizagent_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('rizagent_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
