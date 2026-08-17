"use client";

import React, { use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUserById, toggleUserActive } from "@/features/users/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { ArrowLeft, User as UserIcon, Shield, Calendar, CheckCircle2 } from "lucide-react";

export default function UserDetailPage({ params }: { params?: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || (params ? use(params).id : "");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["adminUserDetail", id],
    queryFn: () => fetchUserById(id),
  });

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => toggleUserActive(id, isActive),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("User active status updated!");
        queryClient.invalidateQueries({ queryKey: ["adminUserDetail", id] });
      }
    },
  });

  const user = data?.data;

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6 max-w-2xl">
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Users Directory
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Account Detail</h1>
          <p className="mt-1 text-sm font-mono text-slate-500">ID: {id}</p>
        </div>

        {isLoading && (
          <div className="h-64 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
        )}

        {user && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg">
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{user.fullName}</h2>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
              </div>

              <span className="rounded bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {user.role}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Account Active</p>
                <button
                  onClick={() => toggleMutation.mutate(!user.isActive)}
                  className={`mt-1 px-3 py-1 rounded text-xs font-bold ${
                    user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {user.isActive ? "ACTIVE (Click to disable)" : "DISABLED (Click to enable)"}
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-500">MFA Status</p>
                <p className="font-semibold text-slate-900 mt-1">{user.mfaEnabled ? "Enabled" : "Disabled"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Organization ID</p>
                <p className="font-mono text-xs text-slate-900 mt-1">{user.organizationId || "Global (No Tenant)"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Joined Date</p>
                <p className="text-xs text-slate-900 mt-1">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
