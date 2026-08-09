"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getMyInterviewsApi } from "@/features/interviews/api/interviews-api";
import { InterviewList } from "@/features/interviews/components/InterviewList";

export default function CandidateInterviewsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-interviews"],
    queryFn: () => getMyInterviewsApi(),
  });

  const interviews = data?.data || [];

  return (
    <DashboardShell requiredRole="CANDIDATE">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-5 border-b border-zinc-200">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            My Interview Schedule
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View your upcoming live video interviews, join meetings, and download `.ics` calendar events.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <InterviewList interviews={interviews} />
        )}
      </div>
    </DashboardShell>
  );
}
