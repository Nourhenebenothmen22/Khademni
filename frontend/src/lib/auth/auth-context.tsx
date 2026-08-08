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
        const csrf = await fetchCsrfToken();
        if (!csrf) {
          setIsLoading(false);
          return;
        }
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
    fetchCsrfToken().then(() => {
      refreshUser();
    });
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await logoutUser();
    setActiveOrganizationId(null);
    setUser(null);
    setAccessToken(null);
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
