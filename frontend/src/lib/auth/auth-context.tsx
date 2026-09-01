"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, UserRole } from "@/types/backend";
import { fetchMyProfile } from "@/features/users/api";
import { fetchCsrfToken, getAccessToken, setAccessToken, setActiveOrganizationId } from "@/lib/api/client";
import { logoutUser } from "@/features/auth/api";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  organizationId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthUser: (user: User | null, token?: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  organizationId: null,
  isAuthenticated: false,
  isLoading: true,
  setAuthUser: () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthUser = useCallback((newUser: User | null, token?: string) => {
    if (token) setAccessToken(token);
    setActiveOrganizationId(newUser?.organizationId || null);
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      if (!getAccessToken()) {
        await fetchCsrfToken();
      }
      const res = await fetchMyProfile();
      if (res.success && res.data) {
        setActiveOrganizationId(res.data.organizationId || null);
        setUser(res.data);
      } else {
        setActiveOrganizationId(null);
        setUser(null);
      }
    } catch {
      setActiveOrganizationId(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const initializeAuth = async () => {
      try {
        if (!getAccessToken()) {
          await fetchCsrfToken();
        }
        const res = await fetchMyProfile();
        if (isSubscribed) {
          if (res.success && res.data) {
            setActiveOrganizationId(res.data.organizationId || null);
            setUser(res.data);
          } else {
            setActiveOrganizationId(null);
            setUser(null);
          }
        }
      } catch {
        if (isSubscribed) {
          setActiveOrganizationId(null);
          setUser(null);
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore logout errors
    }
    setActiveOrganizationId(null);
    setUser(null);
    setAccessToken(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        organizationId: user?.organizationId || null,
        isAuthenticated: !!user,
        isLoading,
        setAuthUser,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
