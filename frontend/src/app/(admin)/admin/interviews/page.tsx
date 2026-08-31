"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getInterviewsApi,
  rescheduleInterviewApi,
  cancelInterviewApi,
} from "@/features/interviews/api/interviews-api";
import { InterviewList } from "@/features/interviews/components/InterviewList";
import { ScorecardModal } from "@/features/interviews/components/ScorecardModal";
import type { Interview, InterviewStatus } from "@/types/backend";

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function autoTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────────────────── */

export default function AdminInterviewsPage() {
  // ── filter state ──────────────────────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // ── modal state ───────────────────────────────────────────────────────────
  const [selectedInterviewForScorecard, setSelectedInterviewForScorecard] =
    useState<Interview | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Interview | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Interview | null>(null);

  // ── reschedule form state ─────────────────────────────────────────────────
  const [rsDate, setRsDate] = useState("");
  const [rsStartTime, setRsStartTime] = useState("");
  const [rsDuration, setRsDuration] = useState<number>(60);
  const [rsTimezone, setRsTimezone] = useState(autoTimezone());
  const [rsReason, setRsReason] = useState("");

  // ── cancel form state ─────────────────────────────────────────────────────
  const [cancelReason, setCancelReason] = useState("");

  // ── query ─────────────────────────────────────────────────────────────────
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-interviews", selectedStatus],
    queryFn: () =>
      getInterviewsApi({
        status:
          selectedStatus !== "ALL"
            ? (selectedStatus as InterviewStatus)
            : undefined,
      }),
  });

  const interviews = data?.data || [];

  // ── reschedule mutation ───────────────────────────────────────────────────
  const rescheduleMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        startTime: string;
        endTime: string;
        timezone: string;
        reason?: string;
      };
    }) => rescheduleInterviewApi(id, payload),
    onSuccess: () => {
      toast.success("Interview rescheduled successfully.");
      refetch();
      closeRescheduleModal();
    },
    onError: () => {
      toast.error("Failed to reschedule interview. Please try again.");
    },
  });

  // ── cancel mutation ───────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelInterviewApi(id, { reason }),
    onSuccess: () => {
      toast.success("Interview cancelled successfully.");
      refetch();
      closeCancelModal();
    },
    onError: () => {
      toast.error("Failed to cancel interview. Please try again.");
    },
  });

  // ── modal helpers ─────────────────────────────────────────────────────────
  function openRescheduleModal(item: Interview) {
    setRsDate("");
    setRsStartTime("");
    setRsDuration(60);
    setRsTimezone(autoTimezone());
    setRsReason("");
    setRescheduleTarget(item);
  }

  function closeRescheduleModal() {
    setRescheduleTarget(null);
  }

  function openCancelModal(item: Interview) {
    setCancelReason("");
    setCancelTarget(item);
  }

  function closeCancelModal() {
    setCancelTarget(null);
  }

  // ── reschedule submit ─────────────────────────────────────────────────────
  function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleTarget) return;

    const startISO = new Date(`${rsDate}T${rsStartTime}`).toISOString();
    const endISO = new Date(
      new Date(`${rsDate}T${rsStartTime}`).getTime() + rsDuration * 60_000
    ).toISOString();

    rescheduleMutation.mutate({
      id: rescheduleTarget.id,
      payload: {
        startTime: startISO,
        endTime: endISO,
        timezone: rsTimezone,
        reason: rsReason || undefined,
      },
    });
  }

  // ── cancel submit ─────────────────────────────────────────────────────────
  function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTarget) return;
    cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Interview Management &amp; Scorecards
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Schedule candidate rounds, dispatch Brevo invitation emails, and
              evaluate panel scorecards.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Status filter ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-100">
          {["ALL", "SCHEDULED", "RESCHEDULED", "COMPLETED", "CANCELLED"].map(
            (st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  selectedStatus === st
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {st === "ALL" ? "All Interviews" : st}
              </button>
            )
          )}
        </div>

        {/* ── List ── */}
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <InterviewList
            interviews={interviews}
            isAdmin
            onOpenScorecard={(item) => setSelectedInterviewForScorecard(item)}
            onReschedule={(item) => openRescheduleModal(item)}
            onCancel={(item) => openCancelModal(item)}
          />
        )}

        {/* ── Scorecard Modal ── */}
        {selectedInterviewForScorecard && (
          <ScorecardModal
            isOpen={Boolean(selectedInterviewForScorecard)}
            onClose={() => setSelectedInterviewForScorecard(null)}
            onSuccess={() => refetch()}
            interviewId={selectedInterviewForScorecard.id}
            candidateName={
              selectedInterviewForScorecard.candidate?.fullName || "Candidate"
            }
            jobTitle={
              selectedInterviewForScorecard.jobPost?.title || "Position"
            }
            interviewType={selectedInterviewForScorecard.type}
          />
        )}

        {/* ── Reschedule Modal ── */}
        {rescheduleTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                <h2 className="text-base font-semibold text-zinc-900">
                  Reschedule Interview
                </h2>
                <button
                  onClick={closeRescheduleModal}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="px-6 py-5 space-y-4">
                <p className="text-sm text-zinc-500">
                  Rescheduling interview for{" "}
                  <span className="font-medium text-zinc-700">
                    {rescheduleTarget.candidate?.fullName || "Candidate"}
                  </span>{" "}
                  —{" "}
                  <span className="font-medium text-zinc-700">
                    {rescheduleTarget.jobPost?.title || "Position"}
                  </span>
                </p>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={rsDate}
                    onChange={(e) => setRsDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={rsStartTime}
                    onChange={(e) => setRsStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Duration
                  </label>
                  <select
                    value={rsDuration}
                    onChange={(e) => setRsDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {[15, 30, 45, 60, 90].map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={rsTimezone}
                    onChange={(e) => setRsTimezone(e.target.value)}
                    placeholder="e.g. Africa/Tunis"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Reason{" "}
                    <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rsReason}
                    onChange={(e) => setRsReason(e.target.value)}
                    placeholder="Briefly explain why the interview is being rescheduled…"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeRescheduleModal}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduleMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {rescheduleMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Cancel Modal ── */}
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                <h2 className="text-base font-semibold text-zinc-900">
                  Cancel Interview
                </h2>
                <button
                  onClick={closeCancelModal}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCancelSubmit} className="px-6 py-5 space-y-4">
                <p className="text-sm text-zinc-500">
                  You are about to cancel the interview for{" "}
                  <span className="font-medium text-zinc-700">
                    {cancelTarget.candidate?.fullName || "Candidate"}
                  </span>{" "}
                  —{" "}
                  <span className="font-medium text-zinc-700">
                    {cancelTarget.jobPost?.title || "Position"}
                  </span>
                  . This action cannot be undone.
                </p>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={10}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Provide a reason for cancellation (min 10 characters)…"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                  {cancelReason.length > 0 && cancelReason.length < 10 && (
                    <p className="text-xs text-red-500">
                      Minimum 10 characters required ({cancelReason.length}/10)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCancelModal}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cancelMutation.isPending || cancelReason.length < 10}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {cancelMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
