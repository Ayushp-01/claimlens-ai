'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole, RegisterData } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPatient: boolean;
  isInvestigator: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, overrideRole?: UserRole) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  quickLoginAs: (role: UserRole) => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('claimlens_token') : null;
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('claimlens_user') : null;

        if (storedToken && storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsed);
            setCookie('claimlens_token', storedToken);
            setCookie('claimlens_role', parsed.role);

            // Re-validate against backend canonical user to keep name & email strictly synchronized
            authAPI
              .me()
              .then((freshUser) => {
                if (freshUser && freshUser.id) {
                  setUser(freshUser);
                  localStorage.setItem('claimlens_user', JSON.stringify(freshUser));
                  setCookie('claimlens_role', freshUser.role);
                }
              })
              .catch((err) => {
                if (err?.response?.status === 401) {
                  localStorage.removeItem('claimlens_user');
                  localStorage.removeItem('claimlens_token');
                  deleteCookie('claimlens_token');
                  deleteCookie('claimlens_role');
                  setUser(null);
                  setToken(null);
                }
              });
          } catch {
            localStorage.removeItem('claimlens_user');
            localStorage.removeItem('claimlens_token');
          }
        } else if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/investigator')) {
            try {
              const res = await authAPI.login('investigator@demo.claimlens.ai', 'Demo@Invest1');
              setToken(res.access_token);
              setUser(res.user);
              localStorage.setItem('claimlens_token', res.access_token);
              localStorage.setItem('claimlens_user', JSON.stringify(res.user));
              setCookie('claimlens_token', res.access_token);
              setCookie('claimlens_role', res.user.role);
            } catch (err) {
              console.error('Demo investigator login failed:', err);
            }
          } else if (path.startsWith('/patient')) {
            try {
              const res = await authAPI.login('patient1@demo.claimlens.ai', 'Demo@Patient1');
              setToken(res.access_token);
              setUser(res.user);
              localStorage.setItem('claimlens_token', res.access_token);
              localStorage.setItem('claimlens_user', JSON.stringify(res.user));
              setCookie('claimlens_token', res.access_token);
              setCookie('claimlens_role', res.user.role);
            } catch (err) {
              console.error('Demo patient login failed:', err);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load user session', e);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, overrideRole?: UserRole) => {
    setIsLoading(true);
    try {
      const res = await authAPI.login(email, password);
      let activeUser = res.user;
      if (overrideRole) {
        activeUser = { ...activeUser, role: overrideRole };
      }
      setToken(res.access_token);
      setUser(activeUser);
      localStorage.setItem('claimlens_token', res.access_token);
      localStorage.setItem('claimlens_user', JSON.stringify(activeUser));
      setCookie('claimlens_token', res.access_token);
      setCookie('claimlens_role', activeUser.role);

      if (activeUser.role === 'patient') {
        router.push('/patient/dashboard');
      } else {
        router.push('/investigator/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const registeredUser = await authAPI.register(data);
      try {
        const loginRes = await authAPI.login(data.email, data.password);
        setToken(loginRes.access_token);
        setUser(loginRes.user);
        localStorage.setItem('claimlens_token', loginRes.access_token);
        localStorage.setItem('claimlens_user', JSON.stringify(loginRes.user));
        setCookie('claimlens_token', loginRes.access_token);
        setCookie('claimlens_role', loginRes.user.role);
      } catch {
        setUser(registeredUser);
      }
      router.push('/patient/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('claimlens_token');
      localStorage.removeItem('claimlens_user');
      deleteCookie('claimlens_token');
      deleteCookie('claimlens_role');
    }
    router.push('/login');
  };

  const quickLoginAs = async (role: UserRole) => {
    if (role === 'patient') {
      await login('patient1@demo.claimlens.ai', 'Demo@Patient1', 'patient');
    } else if (role === 'investigator') {
      await login('investigator@demo.claimlens.ai', 'Demo@Invest1', 'investigator');
    } else if (role === 'admin') {
      await login('admin@demo.claimlens.ai', 'Demo@Admin1', 'admin');
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      if (typeof window !== 'undefined') {
        localStorage.setItem('claimlens_user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const role = user?.role || null;
  const isAuthenticated = !!token && !!user;
  const isPatient = role === 'patient';
  const isInvestigator = role === 'investigator' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        isAuthenticated,
        isPatient,
        isInvestigator,
        isAdmin,
        login,
        register,
        logout,
        quickLoginAs,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
