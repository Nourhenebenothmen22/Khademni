"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyApplications, withdrawApplication } from "@/features/applications/api";
import { ApplicationStatus } from "@/types/backend";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import { FileText, Search, ChevronDown, MapPin, Building, ChevronLeft, ChevronRight } from "lucide-react";

export default function CandidateApplicationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["myApplicationsList", page, filterStatus, searchQuery],
    queryFn: () => fetchMyApplications({
      page,
      limit: 10,
      status: filterStatus !== "ALL" ? (filterStatus as ApplicationStatus) : undefined,
      search: searchQuery || undefined,
    }),
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => withdrawApplication(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Application withdrawn successfully");
        queryClient.invalidateQueries({ queryKey: ["myApplicationsList"] });
      } else {
        toast.error(res.message || "Could not withdraw application");
      }
    },
  });

  const allApplications = data?.data || [];
  const pagination = data?.meta;

  return (
    <DashboardShell requiredRole="CANDIDATE">
      <div className="space-y-6 max-w-5xl">
        <ConfirmModal
          isOpen={!!withdrawTargetId}
          onClose={() => setWithdrawTargetId(null)}
          onConfirm={() => {
            if (withdrawTargetId) {
              withdrawMutation.mutate(withdrawTargetId, {
                onSettled: () => setWithdrawTargetId(null),
              });
            }
          }}
          title="Withdraw Application"
          description="Are you sure you want to withdraw this application? This action cannot be reversed."
          confirmText="Withdraw Application"
          isPending={withdrawMutation.isPending}
        />
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Applications</h1>
          <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-500">Track the status of your job applications.</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-2xl border border-slate-200/90 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 shadow-2xs focus:border-[#282276] focus:ring-2 focus:ring-[#282276]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none rounded-2xl border border-slate-200/90 bg-white pl-4 pr-9 py-2.5 text-xs font-bold text-slate-700 shadow-2xs focus:border-[#282276] focus:ring-2 focus:ring-[#282276]/20 transition-all cursor-pointer"
              >
                <option value="ALL">Status filters: All</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-40 rounded-[22px] bg-white border border-slate-200 p-6 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-center text-rose-700 text-xs sm:text-sm font-bold">
            Failed to load application history. Please try again.
          </div>
        )}

        {!isLoading && !isError && allApplications.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-white p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-900">No applications found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || filterStatus !== "ALL"
                ? "No applications matching your current search or status filter."
                : "You haven't submitted any job applications yet."}
            </p>
            <Link
              href="/jobs"
              className="mt-4 inline-block rounded-xl bg-[#282276] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1f1a5f]"
            >
              Browse Openings
            </Link>
          </div>
        )}

        {!isLoading && !isError && allApplications.length > 0 && (
          <div className="space-y-4">
            {allApplications.map((app) => (
              <div
                key={app.id}
                className="rounded-[22px] border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow space-y-4"
              >
                {/* Top Row: Company Icon, Title, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-black text-lg shrink-0 shadow-2xs">
                      {app.jobPost?.title?.charAt(0).toUpperCase() || <Building className="h-6 w-6" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          {app.jobPost?.title || "Secondary Teacher Position"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                        <span className="text-slate-800 font-bold">Khademni Partner School</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="h-3.5 w-3.5" /> Tunis / Remote
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={app.status} />
                  </div>
                </div>

                {/* Bottom Row: Submitted Date + Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 space-y-0.5">
                    <p className="font-bold text-slate-700">Submitted Date</p>
                    <p className="text-slate-400">
                      Submitted Date: {new Date(app.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {app.documents && app.documents.length > 0 && (
                      <Link
                        href={`/candidate/applications/${app.id}/documents/${app.documents[0].id}`}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        View Details
                      </Link>
                    )}

                    <Link
                      href="/notifications"
                      className="rounded-xl bg-[#282276] hover:bg-[#1f1a5f] text-white px-4 py-2 text-xs font-extrabold transition-colors shadow-2xs"
                    >
                      Check Messages
                    </Link>

                    {app.status !== "WITHDRAWN" && app.status !== "REJECTED" && app.status !== "ACCEPTED" && (
                      <button
                        onClick={() => setWithdrawTargetId(app.id)}
                        disabled={withdrawMutation.isPending}
                        className="text-xs font-bold text-rose-600 hover:underline px-2"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 bg-white p-4 rounded-[22px] border border-slate-200/80 shadow-2xs">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-xs font-bold text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
