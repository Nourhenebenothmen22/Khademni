"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminApplications, updateApplicationStatus, getDocumentDownloadUrl } from "@/features/applications/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApplicationStatus } from "@/types/backend";
import { toast } from "sonner";
import { FileText, Download, Cpu, ChevronRight } from "lucide-react";

export default function AdminApplicationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminApplications", page, statusFilter],
    queryFn: () => fetchAdminApplications({ page, limit: 10, status: statusFilter }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      updateApplicationStatus(id, { status }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Application status updated!");
        queryClient.invalidateQueries({ queryKey: ["adminApplications"] });
      } else {
        toast.error(res.message || "Failed to update status");
      }
    },
  });

  const applications = data?.data || [];
  const pagination = data?.meta;

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Submitted Applications</h1>
            <p className="mt-1 text-sm text-slate-600">Review candidate submissions, update status, and inspect AI fit scores.</p>
          </div>
          <Link
            href="/admin/matching"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Cpu className="h-4 w-4" /> AI Matching Engine
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              !statusFilter ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            All Submissions
          </button>
          {(["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "REJECTED", "ACCEPTED"] as ApplicationStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                statusFilter === st ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Applications Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Position</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Documents</th>
                  <th className="px-6 py-3 text-right">Actions / AI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading applications...</td>
                  </tr>
                )}

                {isError && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-rose-600">Error loading applications.</td>
                  </tr>
                )}

                {!isLoading && !isError && applications.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No applications found.</td>
                  </tr>
                )}

                {!isLoading && !isError && applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{app.candidate?.fullName || "Candidate"}</p>
                      <p className="text-xs text-slate-500">{app.candidate?.email}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{app.jobPost?.title}</td>
                    <td className="px-6 py-4">
                      <select
                        value={app.status}
                        onChange={(e) =>
                          statusMutation.mutate({ id: app.id, status: e.target.value as ApplicationStatus })
                        }
                        className="rounded border border-slate-300 p-1 text-xs font-semibold text-slate-700 focus:border-indigo-500"
                      >
                        <option value="SUBMITTED">SUBMITTED</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="SHORTLISTED">SHORTLISTED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="ACCEPTED">ACCEPTED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {app.documents && app.documents.length > 0 ? (
                        app.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={getDocumentDownloadUrl(app.id, doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline mr-2"
                          >
                            <FileText className="h-3.5 w-3.5" /> CV PDF
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/matching/scores/${app.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <span>Fit Score Breakdown</span>
                        <ChevronRight className="h-3.5 w-3.5" />
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
