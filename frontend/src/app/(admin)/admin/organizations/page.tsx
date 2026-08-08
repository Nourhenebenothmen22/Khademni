"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrganizations, createOrganization } from "@/features/organizations/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { Building2, Plus, Search } from "lucide-react";

export default function AdminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminOrgsList", page, search],
    queryFn: () => fetchOrganizations({ page, limit: 10, search }),
  });

  const createMutation = useMutation({
    mutationFn: () => createOrganization({ name, slug, domain: domain || undefined }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Organization created!");
        setShowCreate(false);
        queryClient.invalidateQueries({ queryKey: ["adminOrgsList"] });
      } else {
        toast.error(res.message || "Failed to create organization");
      }
    },
  });

  const orgs = data?.data || [];
  const pagination = data?.meta;

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Organizations Directory</h1>
            <p className="mt-1 text-sm text-slate-600">Multi-tenant school and educational organization isolation management.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Organization
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-md"
          >
            <h2 className="font-bold text-slate-900">New Organization</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Oxford International School"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Slug</label>
              <input
                type="text"
                required
                placeholder="e.g. oxford-school"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Domain (Optional)</label>
              <input
                type="text"
                placeholder="e.g. oxfordschool.edu"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Create Tenant
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3">Domain</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading organizations...</td>
                  </tr>
                )}

                {!isLoading && orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{o.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{o.slug}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{o.domain || "None"}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                        ACTIVE
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/organizations/${o.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        View Tenant Detail
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
