import axios from 'axios';
import insforge from './insforge';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// Interceptor to add JWT token from InsForge to every request
api.interceptors.request.use(async (config) => {
  try {
    // Ensure we have a session (this will refresh if needed)
    await insforge.auth.getCurrentUser();
    
    // Get the token from the token manager
    const token = insforge.auth.tokenManager?.getAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('Auth interceptor error:', err);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
