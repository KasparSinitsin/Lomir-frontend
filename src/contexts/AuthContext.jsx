import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          setUser(response.data.data.user);  // Ensure your response data structure matches this
          setError(null);
        } catch (err) {
          console.error('Failed to load user:', err);
          // If token is invalid, clear it
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
          setError('Authentication failed. Please login again.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post('api/auth/register', userData);
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await api.post('api/auth/login', credentials);  // Make sure the endpoint is correct
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);  // Clear error when logging out
  };

  // Provide the authentication context
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAuthenticated: !!user,
      register,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);