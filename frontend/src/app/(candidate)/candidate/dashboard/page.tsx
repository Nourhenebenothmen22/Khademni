"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyApplications } from "@/features/applications/api";
import { fetchJobs } from "@/features/jobs/api";
import { fetchNotifications } from "@/features/notifications/api";
import { JobPost } from "@/types/backend";
import { useAuth } from "@/lib/auth/auth-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Briefcase, Calendar, MessageSquare, RefreshCw, ChevronRight, Globe } from "lucide-react";

export default function CandidateDashboardPage() {
  const { user } = useAuth();

  const { data: appsRes, isLoading: appsLoading } = useQuery({
    queryKey: ["myApplicationsSummary"],
    queryFn: () => fetchMyApplications({ limit: 20 }),
  });

  const { data: jobsRes } = useQuery({
    queryKey: ["recommendedJobsSummary"],
    queryFn: () => fetchJobs({ status: "PUBLISHED", limit: 3 }),
  });

  const { data: notifsRes } = useQuery({
    queryKey: ["userRecentActivitySummary"],
    queryFn: () => fetchNotifications({ limit: 5 }),
  });

  const applications = appsRes?.data || [];
  const recommendedJobs = jobsRes?.data || [];
  const notifications = notifsRes?.data || [];

  // Compute Donut percentages dynamically from real applications array
  const totalApps = applications.length;
  const underReviewCount = applications.filter((a) => a.status === "UNDER_REVIEW" || a.status === "SHORTLISTED").length;
  const submittedCount = applications.filter((a) => a.status === "SUBMITTED").length;
  const offersCount = applications.filter((a) => a.status === "ACCEPTED").length;
  const rejectedCount = applications.filter((a) => a.status === "REJECTED").length;
  const underReviewPct = totalApps > 0 ? Math.round((underReviewCount / totalApps) * 100) : 0;
  const submittedPct = totalApps > 0 ? Math.round((submittedCount / totalApps) * 100) : 0;
  const offersPct = totalApps > 0 ? Math.round((offersCount / totalApps) * 100) : 0;
  const rejectedPct = totalApps > 0 ? Math.round((rejectedCount / totalApps) * 100) : 0;

  // Calculate dynamic profile strength percentage
  let profileStrength = 0;
  if (user?.fullName) profileStrength += 25;
  if (user?.isEmailVerified) profileStrength += 25;
  if (user?.avatarUrl) profileStrength += 25;
  if (applications.length > 0) profileStrength += 25;

  const profileDashOffset = 100 - profileStrength;

  return (
    <DashboardShell requiredRole="CANDIDATE">
      <div className="space-y-6 max-w-6xl">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Candidate Dashboard</h1>
          <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-500">
            Hello {user?.fullName?.split(" ")[0] || "Candidate"}! Here&apos;s your personalized recruitment overview.
          </p>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Application Status Summary */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
              <h2 className="text-base font-extrabold text-slate-900">Application Status Summary</h2>

              {appsLoading ? (
                <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                  {/* SVG Donut Chart */}
                  <div className="relative h-44 w-44 flex items-center justify-center shrink-0">
                    <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#282276]"
                        strokeDasharray={`${underReviewPct}, 100`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500"
                        strokeDasharray={`${submittedPct}, 100`}
                        strokeDashoffset={`-${underReviewPct}`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-amber-500"
                        strokeDasharray={`${offersPct}, 100`}
                        strokeDashoffset={`-${underReviewPct + submittedPct}`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-rose-500"
                        strokeDasharray={`${rejectedPct}, 100`}
                        strokeDashoffset={`-${underReviewPct + submittedPct + offersPct}`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>

                  {/* Legend list */}
                  <div className="space-y-3 font-bold text-xs sm:text-sm text-slate-700 w-full sm:w-auto">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#282276]" />
                        <span>Under Review</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{underReviewPct}%</span>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span>Submitted</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{submittedPct}%</span>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span>Offers</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{offersPct}%</span>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span>Rejected</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{rejectedPct}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Profile Strength */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4 text-center">
              <h2 className="text-base font-extrabold text-slate-900 text-left">Profile Completeness</h2>

              <div className="py-2">
                <div className="relative mx-auto h-32 w-32 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#282276]"
                      strokeDasharray={`${profileStrength}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-2xl font-black text-slate-900">{profileStrength}%</span>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-500 max-w-xs mx-auto">
                Complete your profile details to improve job match accuracy.
              </p>
            </div>
          </div>

          {/* Right Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Active Applications Summary */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Briefcase className="h-4 w-4 text-[#282276]" />
                <span>Active Submissions</span>
              </div>

              {applications.length > 0 ? (
                <div className="rounded-2xl border border-indigo-100/90 bg-[#f4f5fc] p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {applications[0].jobPost?.title || "Position Application"}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                      {applications[0].status}
                    </span>
                  </div>

                  <div className="pt-1 space-y-1 font-semibold text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Submitted: {new Date(applications[0].submittedAt).toLocaleDateString()}</span>
                    </p>
                    <p className="text-slate-500 pt-0.5">
                      Tracking Code: <strong className="font-mono text-slate-800">{applications[0].trackingCode}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">
                  No active job applications submitted yet.
                </div>
              )}
            </div>

            {/* Card 2: Recent Activity */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Calendar className="h-4 w-4 text-[#282276]" />
                <span>Recent Activity</span>
              </div>

              <div className="space-y-3.5 text-xs font-semibold">
                {notifications.length > 0 ? (
                  notifications.slice(0, 3).map((n) => (
                    <div key={n.id} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold">{n.title}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs py-2 text-center">No recent notifications.</p>
                )}
              </div>
            </div>

            {/* Card 3: Job Recommendations */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Briefcase className="h-4 w-4 text-[#282276]" />
                  <span>Job Recommendations</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Recommended positions matching your profile.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {recommendedJobs.length > 0 ? (
                  recommendedJobs.map((job: JobPost) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/60 border border-slate-100 transition-colors group"
                    >
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-[#282276] transition-colors">
                          {job.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">{job.organization?.name || "Khademni Partner School"}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#282276]" />
                    </Link>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs py-2 text-center">No open positions published currently.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
