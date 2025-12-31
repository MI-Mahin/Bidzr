'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';

interface AuthContextType {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const response: any = await api.getProfile(accessToken);
        if (response.success && response.data.user) {
          setUser(response.data.user);
        } else {
          logout();
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [accessToken, setUser, setLoading, logout]);

  return (
    <AuthContext.Provider value={{ isLoading: useAuthStore((s) => s.isLoading) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
