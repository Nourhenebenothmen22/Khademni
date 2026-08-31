"use client";

import React, { use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicationScore } from "@/features/matching/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, CheckCircle2, AlertTriangle, Cpu, Award } from "lucide-react";

export default function ApplicationScorePage({
  params,
}: {
  params?: Promise<{ applicationId: string }>;
}) {
  const routeParams = useParams();
  const applicationId = (routeParams?.applicationId as string) || (params ? use(params).applicationId : "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["applicationScore", applicationId],
    queryFn: () => fetchApplicationScore(applicationId),
  });

  const scoreData = data?.data;
  const run = scoreData?.matchingRun;

  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="space-y-6 max-w-4xl">
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Applications List
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidate Fit Score Breakdown</h1>
          <p className="mt-1 text-sm font-mono text-slate-500">Application ID: {applicationId}</p>
        </div>

        {isLoading && (
          <div className="h-64 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
        )}

        {isError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
            Matching score has not been calculated for this application yet.
          </div>
        )}

        {scoreData && (
          <div className="space-y-6">
            {/* Header Score Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold text-2xl border border-indigo-100">
                  {Number(scoreData.finalScore).toFixed(0)}%
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Final Candidate Match Score</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Recommendation:</span>
                    <StatusBadge status={scoreData.recommendation} />
                  </div>
                </div>
              </div>

              {run && run.confidence !== null && run.confidence !== undefined && (
                <div className="bg-slate-50 rounded-lg p-3 text-right">
                  <p className="text-xs text-slate-500">AI Model Confidence</p>
                  <p className="text-lg font-bold text-slate-900">
                    {(Number(run.confidence) * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>

            {/* Matched vs Missing Keywords */}
            {run && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Matched Keywords & Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {run.matchedKeywords && run.matchedKeywords.length > 0 ? (
                      run.matchedKeywords.map((kw, i) => (
                        <span key={i} className="rounded-md bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold border border-emerald-200">
                          {kw.keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No matched keywords</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Missing Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {run.missingKeywords && run.missingKeywords.length > 0 ? (
                      run.missingKeywords.map((kw, i) => (
                        <span key={i} className="rounded-md bg-amber-50 text-amber-700 px-2.5 py-1 text-xs font-semibold border border-amber-200">
                          {kw.keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No missing keywords</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rule Engine Results */}
            {run?.ruleResults && run.ruleResults.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900">Matching Rule Engine Verification</h3>
                <div className="divide-y divide-slate-100">
                  {run.ruleResults.map((rr, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{rr.name} ({rr.type})</p>
                        <p className="text-xs text-slate-500">{rr.explanation}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          rr.matched ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {rr.matched ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            {scoreData.explanation && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2">Detailed AI Fit Explanation</h3>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg leading-relaxed">
                  {scoreData.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
