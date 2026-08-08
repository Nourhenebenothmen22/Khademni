"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsersList, toggleUserActive } from "@/features/users/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserRole } from "@/types/backend";
import { toast } from "sonner";
import { Search, Users, Shield, CheckCircle2, XCircle } from "lucide-react";

export default function UserDirectoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["adminUsersList", page, search, roleFilter],
    queryFn: () => fetchUsersList({ page, limit: 10, search, role: roleFilter }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserActive(id, isActive),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("User account status updated");
        queryClient.invalidateQueries({ queryKey: ["adminUsersList"] });
      }
    },
  });

  const users = data?.data || [];
  const pagination = data?.meta;

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Account Directory</h1>
          <p className="mt-1 text-sm text-slate-600">Inspect registered candidates and administrative accounts.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-indigo-500"
            />
          </div>

          <select
            value={roleFilter || ""}
            onChange={(e) => setRoleFilter(e.target.value ? (e.target.value as UserRole) : undefined)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Roles</option>
            <option value="CANDIDATE">CANDIDATE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Email Verified</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading user directory...</td>
                  </tr>
                )}

                {!isLoading && users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{u.fullName}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                        className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {u.isActive ? "ACTIVE" : "DISABLED"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {u.isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <XCircle className="h-3.5 w-3.5" /> Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
