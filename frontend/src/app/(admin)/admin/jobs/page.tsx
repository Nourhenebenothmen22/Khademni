"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, deleteJob } from "@/features/jobs/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import { fetchMyOrganization } from "@/features/organizations/api";
import { AlertCircle, Plus, Search, Edit3, Trash2, ExternalLink, Building2 } from "lucide-react";

export default function AdminJobsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: orgData } = useQuery({
    queryKey: ["myOrganizationProfile"],
    queryFn: () => fetchMyOrganization(),
  });
  const org = orgData?.data;
  const isProfileIncomplete = !org?.description || !org?.location;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminJobs", page, search],
    queryFn: () => fetchJobs({ page, limit: 10, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Job post deleted");
        queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
      } else {
        toast.error(res.message || "Failed to delete job post");
      }
    },
  });

  const jobs = data?.data || [];
  const pagination = data?.meta;

  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="space-y-6">
        <ConfirmModal
          isOpen={!!deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onConfirm={() => {
            if (deleteTargetId) {
              deleteMutation.mutate(deleteTargetId, {
                onSettled: () => setDeleteTargetId(null),
              });
            }
          }}
          title="Delete Job Opening"
          description="Are you sure you want to delete this job posting? This action will remove all associated keywords and rules."
          confirmText="Delete Job"
          isPending={deleteMutation.isPending}
        />

        {isProfileIncomplete && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold">Your Organization Profile is incomplete</p>
                <p className="text-xs text-amber-700">Please complete mandatory profile fields (description & campus location) in Organization Settings before publishing job offers.</p>
              </div>
            </div>
            <Link
              href="/admin/organizations"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shrink-0 shadow-2xs"
            >
              <Building2 className="h-3.5 w-3.5" /> Complete Profile
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Openings</h1>
            <p className="mt-1 text-sm text-slate-600">Manage teaching positions, keywords, and AI matching rules for {org?.name || "your organization"}.</p>
          </div>
          <Link
            href="/admin/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create New Job
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search job title or requirements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Jobs Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Job Title</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Deadline</th>
                  <th className="px-6 py-3">Created Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading job posts...</td>
                  </tr>
                )}

                {isError && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-rose-600">Error loading job posts.</td>
                  </tr>
                )}

                {!isLoading && !isError && jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No job posts found.</td>
                  </tr>
                )}

                {!isLoading && !isError && jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{job.title}</td>
                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {job.deadline ? new Date(job.deadline).toLocaleDateString() : "None"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <Link
                        href={`/jobs/${job.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </Link>
                      <Link
                        href={`/admin/jobs/${job.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit & Rules
                      </Link>
                      <button
                        onClick={() => setDeleteTargetId(job.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
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
