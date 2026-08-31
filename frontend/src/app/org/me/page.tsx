"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMyOrganization } from "@/features/organizations/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Building2, ShieldCheck } from "lucide-react";

export default function MyOrganizationPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: () => fetchMyOrganization(),
  });

  const org = data?.data;

  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Current Organization Context</h1>
          <p className="mt-1 text-sm text-slate-600">Active tenant details derived from your authenticated session.</p>
        </div>

        {isLoading && (
          <div className="h-48 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
        )}

        {org ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">{org.name}</h2>
                <p className="text-xs font-mono text-slate-500">Slug: {org.slug}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Domain Binding</p>
                <p className="font-semibold text-slate-900">{org.domain || "Unbound"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tenant Status</p>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        ) : (
          !isLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              Global Account / Candidate (No tenant organization bound).
            </div>
          )
        )}
      </div>
    </DashboardShell>
  );
}
