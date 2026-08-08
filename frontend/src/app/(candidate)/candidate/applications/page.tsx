"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyApplications, withdrawApplication, getDocumentDownloadUrl } from "@/features/applications/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { FileText, Download, AlertCircle } from "lucide-react";

export default function CandidateApplicationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["myApplicationsList", page],
    queryFn: () => fetchMyApplications({ page, limit: 10 }),
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => withdrawApplication(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Application withdrawn");
        queryClient.invalidateQueries({ queryKey: ["myApplicationsList"] });
      } else {
        toast.error(res.message || "Could not withdraw application");
      }
    },
  });

  const applications = data?.data || [];
  const pagination = data?.meta;

  return (
    <DashboardShell requiredRole="CANDIDATE">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="mt-1 text-sm text-slate-600">Review status, tracking codes, and submitted documents.</p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Failed to load application history.
          </div>
        )}

        {!isLoading && !isError && applications.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-900">No applications submitted yet</h3>
            <p className="mt-1 text-sm text-slate-500">Apply to published teaching posts on the job board.</p>
            <Link
              href="/jobs"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Browse Jobs
            </Link>
          </div>
        )}

        {!isLoading && !isError && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      ID: {app.trackingCode}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{app.jobPost?.title || "Teaching Application"}</h2>
                  <p className="text-xs text-slate-500">
                    Submitted on {new Date(app.submittedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                  {app.documents && app.documents.length > 0 && (
                    app.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/candidate/applications/${app.id}/documents/${doc.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <span>View {doc.type}</span>
                      </Link>
                    ))
                  )}

                  {app.status !== "WITHDRAWN" && app.status !== "REJECTED" && app.status !== "ACCEPTED" && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to withdraw this application?")) {
                          withdrawMutation.mutate(app.id);
                        }
                      }}
                      disabled={withdrawMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Withdraw</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
