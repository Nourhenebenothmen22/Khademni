"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Loader2, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getInterviewsApi } from "@/features/interviews/api/interviews-api";
import { InterviewList } from "@/features/interviews/components/InterviewList";
import { ScorecardModal } from "@/features/interviews/components/ScorecardModal";
import type { Interview, InterviewStatus } from "@/types/backend";

export default function AdminInterviewsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedInterviewForScorecard, setSelectedInterviewForScorecard] = useState<Interview | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-interviews", selectedStatus],
    queryFn: () =>
      getInterviewsApi({
        status: selectedStatus !== "ALL" ? (selectedStatus as InterviewStatus) : undefined,
      }),
  });

  const interviews = data?.data || [];

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Interview Management & Scorecards
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Schedule candidate rounds, dispatch Brevo invitation emails, and evaluate panel scorecards.
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

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-100">
          {["ALL", "SCHEDULED", "RESCHEDULED", "COMPLETED", "CANCELLED"].map((st) => (
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
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <InterviewList
            interviews={interviews}
            isAdmin
            onOpenScorecard={(item) => setSelectedInterviewForScorecard(item)}
          />
        )}

        {/* Scorecard Modal */}
        {selectedInterviewForScorecard && (
          <ScorecardModal
            isOpen={Boolean(selectedInterviewForScorecard)}
            onClose={() => setSelectedInterviewForScorecard(null)}
            onSuccess={() => refetch()}
            interviewId={selectedInterviewForScorecard.id}
            candidateName={selectedInterviewForScorecard.candidate?.fullName || "Candidate"}
            jobTitle={selectedInterviewForScorecard.jobPost?.title || "Position"}
            interviewType={selectedInterviewForScorecard.type}
          />
        )}
      </div>
    </DashboardShell>
  );
}
