"use client";

import { Video, Calendar as CalendarIcon, Clock, User, Download, FileText } from "lucide-react";
import { getIcsDownloadUrl } from "../api/interviews-api";
import type { Interview } from "@/types/backend";

interface InterviewListProps {
  interviews: Interview[];
  isAdmin?: boolean;
  onReschedule?: (interview: Interview) => void;
  onCancel?: (interview: Interview) => void;
  onOpenScorecard?: (interview: Interview) => void;
}

export function InterviewList({
  interviews,
  isAdmin = false,
  onOpenScorecard,
}: InterviewListProps) {
  if (!interviews || interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
        <CalendarIcon className="w-12 h-12 text-zinc-400 mb-3 stroke-1" />
        <h4 className="text-base font-semibold text-zinc-800">No Interviews Scheduled</h4>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          {isAdmin ? "Schedule an interview for shortlisted candidates to begin evaluations." : "You have no upcoming or past interviews."}
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full">Scheduled</span>;
      case "RESCHEDULED":
        return <span className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">Rescheduled</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">Completed</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {interviews.map((item) => {
        const startDate = new Date(item.startTime);
        const endDate = new Date(item.endTime);

        return (
          <div
            key={item.id}
            className="p-5 bg-white border border-zinc-200 rounded-xl shadow-xs hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            {/* Main Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-[11px] font-bold text-blue-600 bg-blue-50 rounded-xs uppercase tracking-wide">
                  {item.type}
                </span>
                {getStatusBadge(item.status)}
              </div>

              <h4 className="text-base font-semibold text-zinc-900">
                {item.title}
              </h4>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                  {startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({item.timezone})
                </span>
                {item.candidate && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Candidate: {item.candidate.fullName}
                  </span>
                )}
              </div>
            </div>

            {/* Actions & Links */}
            <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100">
              {item.meetingUrl && item.status !== "CANCELLED" && (
                <a
                  href={item.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  Join Call
                </a>
              )}

              <a
                href={getIcsDownloadUrl(item.id)}
                download
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                .ics Invite
              </a>

              {isAdmin && onOpenScorecard && item.status !== "CANCELLED" && (
                <button
                  onClick={() => onOpenScorecard(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Evaluate Scorecard
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
