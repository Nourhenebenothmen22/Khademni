"use client";

import React, { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchOrganizationById } from "@/features/organizations/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ArrowLeft, Building2 } from "lucide-react";

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["adminOrgDetail", id],
    queryFn: () => fetchOrganizationById(id),
  });

  const org = data?.data;

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6 max-w-2xl">
        <Link href="/admin/organizations" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Organizations Directory
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organization Tenant Profile</h1>
          <p className="mt-1 text-sm font-mono text-slate-500">ID: {id}</p>
        </div>

        {isLoading && (
          <div className="h-48 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
        )}

        {org && (
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
                <p className="font-semibold text-slate-900">{org.domain || "Unbound (General)"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Isolation Status</p>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                  ENFORCED
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Created Date</p>
                <p className="text-xs text-slate-900">{new Date(org.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
