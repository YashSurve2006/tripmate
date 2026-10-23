import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { CURRENT_USER } from '../services/mockData';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  upiId?: string | null;
  currencyPref?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isBackendOnline: boolean;
  isOfflineOnly: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, upiId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(CURRENT_USER);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isOfflineOnly, setIsOfflineOnly] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        await api.init();
        setIsBackendOnline(api.remoteBackendConfigured);
        setIsOfflineOnly(api.isOfflineOnly);
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.warn('Failed to load user auth context:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  const refreshStatus = async () => {
    const isOnline = await api.checkBackendHealth();
    setIsBackendOnline(isOnline);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, upiId?: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(name, email, password, upiId);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isBackendOnline,
        isOfflineOnly,
        login,
        register,
        logout,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
