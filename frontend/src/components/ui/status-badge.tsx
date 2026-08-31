import React from "react";
import { cn } from "@/lib/utils/cn";
import { ApplicationStatus, JobStatus, RunStatus, ScoreRecommendation } from "@/types/backend";

interface StatusBadgeProps {
  status: ApplicationStatus | JobStatus | RunStatus | ScoreRecommendation | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorStyle = "bg-slate-50 text-slate-700 border-slate-200/80";
  let dotStyle = "bg-slate-400";

  switch (status) {
    // Application & Interview Statuses
    case "SUBMITTED":
      colorStyle = "bg-blue-50/80 text-blue-700 border-blue-200/80";
      dotStyle = "bg-blue-500";
      break;
    case "UNDER_REVIEW":
      colorStyle = "bg-amber-50/80 text-amber-700 border-amber-200/80";
      dotStyle = "bg-amber-500";
      break;
    case "INTERVIEW_SCHEDULED":
    case "SCHEDULED":
      colorStyle = "bg-indigo-50/80 text-indigo-700 border-indigo-200/80";
      dotStyle = "bg-indigo-500";
      break;
    case "RESCHEDULED":
      colorStyle = "bg-amber-50/80 text-amber-700 border-amber-200/80";
      dotStyle = "bg-amber-500";
      break;
    case "INTERVIEWED":
      colorStyle = "bg-purple-50/80 text-purple-700 border-purple-200/80";
      dotStyle = "bg-purple-500";
      break;
    case "SHORTLISTED":
    case "ACCEPTED":
    case "COMPLETED":
    case "STRONG_HIRE":
    case "HIRE":
    case "HIGHLY_RECOMMENDED":
    case "RECOMMENDED":
      colorStyle = "bg-emerald-50/80 text-emerald-700 border-emerald-200/80";
      dotStyle = "bg-emerald-500";
      break;
    case "AVERAGE":
    case "NEUTRAL":
      colorStyle = "bg-amber-50/80 text-amber-700 border-amber-200/80";
      dotStyle = "bg-amber-500";
      break;
    case "REJECTED":
    case "NOT_RECOMMENDED":
    case "FAILED":
    case "CANCELLED":
    case "NO_SHOW":
    case "NO_HIRE":
    case "STRONG_NO_HIRE":
      colorStyle = "bg-rose-50/80 text-rose-700 border-rose-200/80";
      dotStyle = "bg-rose-500";
      break;
    case "WITHDRAWN":
    case "ARCHIVED":
    case "CLOSED":
      colorStyle = "bg-slate-100/80 text-slate-600 border-slate-200/80";
      dotStyle = "bg-slate-400";
      break;
    // Job & Run Statuses
    case "PUBLISHED":
      colorStyle = "bg-emerald-50/80 text-emerald-700 border-emerald-200/80";
      dotStyle = "bg-emerald-500";
      break;
    case "DRAFT":
    case "PENDING":
      colorStyle = "bg-slate-100/80 text-slate-700 border-slate-200/80";
      dotStyle = "bg-slate-400";
      break;
    case "RUNNING":
      colorStyle = "bg-indigo-50/80 text-indigo-700 border-indigo-200/80";
      dotStyle = "bg-indigo-500 animate-ping";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        colorStyle,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5 shrink-0", dotStyle)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
