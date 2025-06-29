import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';
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

    // Check if user is already authenticated on mount
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get('/api/auth/me');
      setUser(response.user);
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
      
      const response = await apiService.post('/api/auth/login', { username, password });
      console.log('[AuthContext] /api/auth/login response:', response);
      
      const { token, refreshToken, user } = response;
      console.log('[AuthContext] Parsed token:', token);
      console.log('[AuthContext] Parsed refreshToken:', refreshToken);
      console.log('[AuthContext] Parsed user:', user);
      
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
      console.error('[AuthContext] Login error:', error);
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
      
      const response = await apiService.post('/api/auth/refresh', { refreshToken: refreshTokenValue });
      
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
