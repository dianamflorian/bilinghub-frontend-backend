// ============================================================
// AUTH CONTEXT — JWT token management
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../types';
import { setAuthToken, clearAuthToken, getAuthToken } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- Mock demo user (remove when real auth is wired) ----
const DEMO_USER: AuthUser = {
  id: 'usr_demo_001',
  email: 'demo@billinghub.io',
  name: 'Diana Florian',
  is_admin: false,
};
const DEMO_ADMIN: AuthUser = {
  id: 'usr_admin_001',
  email: 'admin@billinghub.io',
  name: 'Admin User',
  is_admin: true,
};
// ----------------------------------------------------------

function parseJwtPayload(token: string): AuthUser | null {
  try {
    const base64 = token.split('.')[1];
    const decoded = JSON.parse(atob(base64));
    return {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      name: decoded.name || decoded.email,
      is_admin: decoded.is_admin || decoded.role === 'admin',
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // For demo: start with DEMO_USER logged in
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getAuthToken();
    if (token) {
      const parsed = parseJwtPayload(token);
      if (parsed) return parsed;
    }
    // Demo mode: auto-login
    return DEMO_USER;
  });
  const [token, setToken] = useState<string | null>(getAuthToken);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  // Expose a way to switch to admin view for demo
  useEffect(() => {
    (window as unknown as Record<string, unknown>)._switchToAdmin = () => setUser(DEMO_ADMIN);
    (window as unknown as Record<string, unknown>)._switchToUser = () => setUser(DEMO_USER);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.is_admin ?? false,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
