"use client";

import React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
  requiredRole?: "ORGANIZATION_ADMIN" | "CANDIDATE";
}

export function DashboardShell({ children, requiredRole }: DashboardShellProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading Khademni ATS Session...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4 font-bold text-2xl">
            403
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Forbidden Access</h1>
          <p className="mt-2 text-slate-600">
            Cross-tenant or role restriction. Your account ({user?.role}) does not have permission to view this resource.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5fa] flex flex-col">
      <Header />
      <div className="flex flex-1 mx-auto w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
