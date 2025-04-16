import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;  
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,  
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data); 

      if (error.response.status === 401 || error.response.status === 403) {
        localStorage.removeItem('token');  
        window.location.href = '/login';
      }
    } else if (error.request) {
      console.error('No response received:', error.request);  
    } else {
      console.error('Error:', error.message); 
    }
    return Promise.reject(error);  
  }
);

export default api;