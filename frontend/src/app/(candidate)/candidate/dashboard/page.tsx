"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyApplications } from "@/features/applications/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileText, Briefcase, Clock, ArrowRight } from "lucide-react";

export default function CandidateDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["myApplicationsSummary"],
    queryFn: () => fetchMyApplications({ limit: 5 }),
  });

  const applications = data?.data || [];
  const totalApplications = data?.meta?.total || applications.length;

  return (
    <DashboardShell requiredRole="CANDIDATE">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidate Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Track your teaching applications and document reviews.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Submitted Applications</p>
              <p className="text-2xl font-bold text-slate-900">{totalApplications}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Shortlisted / Under Review</p>
              <p className="text-2xl font-bold text-slate-900">
                {applications.filter((a) => a.status === "SHORTLISTED" || a.status === "UNDER_REVIEW").length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Recent Status Activity</p>
              <p className="text-2xl font-bold text-slate-900">
                {applications.length > 0 ? "Active" : "None"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Applications List */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Applications</h2>
            <Link
              href="/candidate/applications"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && applications.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              You haven&apos;t submitted any applications yet.{" "}
              <Link href="/jobs" className="font-semibold text-indigo-600 hover:underline">
                Browse open teaching positions
              </Link>
            </div>
          )}

          {!isLoading && applications.length > 0 && (
            <div className="divide-y divide-slate-100">
              {applications.map((app) => (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{app.jobPost?.title || "Teaching Position"}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span>Tracking Code: <strong className="font-mono">{app.trackingCode}</strong></span>
                      <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
