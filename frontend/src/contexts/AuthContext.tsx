import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, type LoginResponse, type AuthUser } from '../api/auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<LoginResponse>;
  complete2fa: (token: string, code: string) => Promise<void>;
  completeEmailOtp: (token: string, code: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authApi.me();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: {
    email: string;
    password: string;
  }): Promise<LoginResponse> => {
    const response = await authApi.login(credentials);
    if ('requires2fa' in response && response.requires2fa) {
      return response;
    }
    const authResponse = response as { access_token: string; user: AuthUser };
    localStorage.setItem('token', authResponse.access_token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
    setUser(authResponse.user);
    return response;
  };

  const complete2fa = async (token: string, code: string) => {
    const response = await authApi.verify2fa({ token, code });
    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  };

  const completeEmailOtp = async (token: string, code: string) => {
    const response = await authApi.verifyEmailOtp({ token, code });
    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const userData = await authApi.me();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      logout();
    }
  };

  const logout = () => {
    authApi.logout().catch(console.error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    complete2fa,
    completeEmailOtp,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
