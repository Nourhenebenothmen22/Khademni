"use client";

import React, { use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchMatchingRunById } from "@/features/matching/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, Cpu, CheckCircle2, AlertCircle } from "lucide-react";

export default function MatchingRunDetailPage({ params }: { params?: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || (params ? use(params).id : "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["matchingRunDetail", id],
    queryFn: () => fetchMatchingRunById(id),
  });

  const run = data?.data;

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6 max-w-4xl">
        <Link href="/admin/matching" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Matching Runs
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Matching Run Breakdown</h1>
          <p className="mt-1 text-sm font-mono text-slate-500">Run ID: {id}</p>
        </div>

        {isLoading && (
          <div className="h-64 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
        )}

        {isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Failed to load matching run details.
          </div>
        )}

        {run && (
          <div className="space-y-6">
            {/* Header Status Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <StatusBadge status={run.status} />
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Total Hybrid Score: {run.totalScore !== null ? `${Number(run.totalScore).toFixed(1)}%` : "N/A"}
                </h2>
                <p className="text-xs text-slate-500">
                  Calculated AI Confidence: {run.confidence !== null ? `${(Number(run.confidence) * 100).toFixed(0)}%` : "N/A"}
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p>Started: {new Date(run.startedAt).toLocaleString()}</p>
                {run.finishedAt && <p>Finished: {new Date(run.finishedAt).toLocaleString()}</p>}
              </div>
            </div>

            {/* Score Breakdown JSON */}
            {run.scoreBreakdown && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900">Score Breakdown Metrics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Dense PGVector (384d)</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {Number(run.scoreBreakdown.semanticScore).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Rule Engine Score</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {Number(run.scoreBreakdown.ruleBasedScore).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Keywords Score</p>
                    <p className="text-lg font-bold text-amber-600">
                      {Number(run.scoreBreakdown.keywordsScore).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Provider Used</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 uppercase">
                      {run.scoreBreakdown.providerUsed}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Explanation Box */}
            {run.explanation && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2">Semantic AI Explanation</h3>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg leading-relaxed">
                  {run.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
