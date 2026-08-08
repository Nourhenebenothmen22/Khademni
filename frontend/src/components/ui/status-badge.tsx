import React from "react";
import { cn } from "@/lib/utils/cn";
import { ApplicationStatus, JobStatus, RunStatus, ScoreRecommendation } from "@/types/backend";

interface StatusBadgeProps {
  status: ApplicationStatus | JobStatus | RunStatus | ScoreRecommendation | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorStyle = "bg-slate-100 text-slate-800 border-slate-200";

  switch (status) {
    // Application Statuses
    case "SUBMITTED":
      colorStyle = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "UNDER_REVIEW":
      colorStyle = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "SHORTLISTED":
    case "ACCEPTED":
    case "HIGHLY_RECOMMENDED":
    case "RECOMMENDED":
      colorStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "REJECTED":
    case "NOT_RECOMMENDED":
    case "FAILED":
      colorStyle = "bg-rose-50 text-rose-700 border-rose-200";
      break;
    case "WITHDRAWN":
    case "ARCHIVED":
    case "CLOSED":
      colorStyle = "bg-zinc-100 text-zinc-600 border-zinc-200";
      break;
    // Job & Run Statuses
    case "PUBLISHED":
    case "COMPLETED":
      colorStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "DRAFT":
    case "PENDING":
      colorStyle = "bg-slate-100 text-slate-700 border-slate-200";
      break;
    case "RUNNING":
      colorStyle = "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors",
        colorStyle,
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
