import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(
    localStorage.getItem('refreshToken')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Set up axios interceptor for authentication
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry && refreshTokenValue) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            await refreshToken();
            
            // After refreshing, update the header with the new token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            
            // Retry the original request
            return axios(originalRequest);
          } catch (refreshError) {
            // If refresh fails, log out the user
            logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Check if user is already authenticated on mount
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{success: boolean, user: User}>('/api/auth/me');
      setUser(response.data.user);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user data', error);
      // If we can't fetch user with existing token, clear auth data
      logout();
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await api.post('/api/auth/login', { username, password });
      
      const { token, refreshToken, user } = response.data;
      
      // Save to local storage
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Update state
      setToken(token);
      setRefreshTokenValue(refreshToken);
      setUser(user);
      
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Reset state
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    setError(null);
  };

  const refreshToken: () => Promise<void> = async () => {
    try {
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post('/api/auth/refresh', { refreshToken: refreshTokenValue });
      
      const { token: newToken, refreshToken: newRefreshToken } = response.data;
      
      // Save new tokens
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Update state
      setToken(newToken);
      setRefreshTokenValue(newRefreshToken);
    } catch (error) {
      console.error('Failed to refresh token', error);
      logout();
      throw error;
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
