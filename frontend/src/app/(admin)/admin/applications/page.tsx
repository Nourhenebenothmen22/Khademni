"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminApplications, updateApplicationStatus, getDocumentDownloadUrl, downloadDocumentBlob } from "@/features/applications/api";
import { fetchUsersList } from "@/features/users/api";
import { ScheduleInterviewModal } from "@/features/interviews/components/ScheduleInterviewModal";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApplicationStatus } from "@/types/backend";
import { toast } from "sonner";
import { FileText, Cpu, ChevronRight, Calendar, Search, Loader2 } from "lucide-react";

export default function AdminApplicationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<{
    applicationId: string;
    candidateName: string;
    jobTitle: string;
  } | null>(null);

  const handleDownloadDoc = async (applicationId: string, docId: string, filename: string) => {
    setDownloadingDocId(docId);
    try {
      await downloadDocumentBlob(applicationId, docId, filename);
      toast.success("Document downloaded!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to download document");
    } finally {
      setDownloadingDocId(null);
    }
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminApplications", page, statusFilter, searchQuery],
    queryFn: () =>
      fetchAdminApplications({
        page,
        limit: 10,
        status: statusFilter,
        search: searchQuery || undefined,
      }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["orgAdminUsers"],
    queryFn: () => fetchUsersList({ role: "ORGANIZATION_ADMIN", limit: 50 }),
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

  const availableInterviewers = (usersData?.data || []).map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
  }));

  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Submitted Applications</h1>
            <p className="mt-1 text-sm text-slate-600">
              Review candidate submissions, update status, and inspect AI fit scores.
            </p>
          </div>
          <Link
            href="/admin/matching"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Cpu className="h-4 w-4" /> AI Matching Engine
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by candidate name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
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
          {(["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "ACCEPTED", "REJECTED", "WITHDRAWN"] as ApplicationStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                statusFilter === st ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {st.replace(/_/g, " ")}
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
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Loading applications...
                    </td>
                  </tr>
                )}
                {isError && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-rose-600">
                      Error loading applications.
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && applications.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No applications found.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !isError &&
                  applications.map((app) => (
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
                          <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
                          <option value="INTERVIEWED">INTERVIEWED</option>
                          <option value="ACCEPTED">ACCEPTED</option>
                          <option value="REJECTED">REJECTED</option>
                          <option value="WITHDRAWN">WITHDRAWN</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        {app.documents && app.documents.length > 0 ? (
                          app.documents.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => handleDownloadDoc(app.id, doc.id, doc.storedName || `${app.candidate?.fullName || "cv"}-resume.pdf`)}
                              disabled={downloadingDocId === doc.id}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline mr-2 disabled:opacity-50"
                            >
                              {downloadingDocId === doc.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                              CV PDF
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() =>
                              setScheduleTarget({
                                applicationId: app.id,
                                candidateName: app.candidate?.fullName || "Candidate",
                                jobTitle: app.jobPost?.title || "Position",
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Schedule Interview</span>
                          </button>
                          <Link
                            href={`/admin/matching/scores/${app.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <span>Fit Score Breakdown</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
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

      {/* Schedule Interview Modal */}
      {scheduleTarget && (
        <ScheduleInterviewModal
          applicationId={scheduleTarget.applicationId}
          candidateName={scheduleTarget.candidateName}
          jobTitle={scheduleTarget.jobTitle}
          availableInterviewers={availableInterviewers}
          onClose={() => setScheduleTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["adminApplications"] });
            setScheduleTarget(null);
          }}
        />
      )}
    </DashboardShell>
  );
}
