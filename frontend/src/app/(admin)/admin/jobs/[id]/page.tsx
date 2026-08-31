"use client";

import React, { use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchJobById } from "@/features/jobs/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  Edit,
  ExternalLink,
  ShieldCheck,
  Tag,
  Sliders,
  AlertCircle,
} from "lucide-react";

export default function AdminJobDetailPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || (params ? use(params).id : "");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["adminJobDetail", id],
    queryFn: () => fetchJobById(id),
    enabled: !!id,
  });

  const job = data?.data;

  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="space-y-6 max-w-5xl">
        <Link
          href="/admin/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Job Openings
        </Link>

        {isLoading && (
          <div className="h-96 rounded-2xl bg-white border border-slate-200 p-8 animate-pulse space-y-6">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-200 rounded w-3/4" />
            <div className="h-48 bg-slate-100 rounded" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
            <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-2" />
            <h2 className="text-lg font-bold">Job Post Not Found</h2>
            <p className="text-sm mt-1 text-rose-600">
              The position ID ({id}) could not be loaded or you do not have permission to view it.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => refetch()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
              <Link
                href="/admin/jobs"
                className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                Return to Jobs List
              </Link>
            </div>
          </div>
        )}

        {job && (
          <div className="space-y-6">
            {/* Header Action Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={job.status} />
                  {job.organization && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                      <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                      {job.organization.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    <span>Public View</span>
                  </Link>
                  <Link
                    href={`/admin/jobs/${job.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Job & Rules</span>
                  </Link>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {job.title}
              </h1>

              <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Created: {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  {job.publishedAt && (
                    <span>Published: {new Date(job.publishedAt).toLocaleDateString()}</span>
                  )}
                  {job.deadline && (
                    <span className="font-semibold text-indigo-600">
                      Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {job._count && (
                  <Link
                    href={`/admin/applications?jobPostId=${job.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{job._count.applications || 0} Candidate Application(s)</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Description & Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Job Overview & Description</span>
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Requirements & Qualifications</span>
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {job.requirements}
                </p>
              </div>
            </div>

            {/* Keywords & Matching Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Keywords Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-indigo-600" />
                    <span>Configured Keywords ({job.keywords?.length || 0})</span>
                  </h3>
                  <Link
                    href={`/admin/jobs/${job.id}/edit`}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Manage
                  </Link>
                </div>

                {job.keywords && job.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {job.keywords.map((kw) => (
                      <span
                        key={kw.id}
                        className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {kw.keyword}{" "}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({kw.type} • w:{kw.weight})
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No keywords configured yet.</p>
                )}
              </div>

              {/* Matching Rules Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-emerald-600" />
                    <span>Matching Rules ({job.matchingRules?.length || 0})</span>
                  </h3>
                  <Link
                    href={`/admin/jobs/${job.id}/edit`}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Manage
                  </Link>
                </div>

                {job.matchingRules && job.matchingRules.length > 0 ? (
                  <div className="space-y-2">
                    {job.matchingRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{rule.ruleName}</p>
                          <p className="text-slate-500 text-[11px]">{rule.type} (Weight: {rule.weight})</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${rule.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                          {rule.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No matching rules defined yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
