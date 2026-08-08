"use client";

import React, { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchEvaluationById } from "@/features/ai-models/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ArrowLeft, ShieldCheck, Activity } from "lucide-react";

export default function ModelEvaluationPage({
  params,
}: {
  params: Promise<{ modelId: string; id: string }>;
}) {
  const { modelId, id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["evaluationDetail", modelId, id],
    queryFn: () => fetchEvaluationById(modelId, id),
  });

  const evaluation = data?.data;

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6 max-w-4xl">
        <Link href="/admin/ai-models" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to AI Models Registry
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Model Evaluation Metrics</h1>
          <p className="mt-1 text-sm text-slate-500">Model ID: {modelId} | Evaluation ID: {id}</p>
        </div>

        {isLoading && (
          <div className="h-64 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
        )}

        {evaluation ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{evaluation.datasetName}</h2>
                <p className="text-sm text-slate-500">Sample Size: {evaluation.evaluationSampleSize} candidates</p>
              </div>
              {evaluation.averageLatencyMs && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Average Latency</p>
                  <p className="text-lg font-bold text-indigo-600">{evaluation.averageLatencyMs.toFixed(1)} ms</p>
                </div>
              )}
            </div>

            {/* Metrics List */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Benchmark Metrics (Precision, Recall, F1, MRR)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {evaluation.metrics && evaluation.metrics.length > 0 ? (
                  evaluation.metrics.map((m) => (
                    <div key={m.id} className="p-4 bg-slate-50 rounded-lg text-center border">
                      <p className="text-xs font-semibold text-slate-500 uppercase">{m.type}</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{(m.value * 100).toFixed(1)}%</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 col-span-4 text-center py-4">
                    No individual metric entries uploaded for this evaluation benchmark.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          !isLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              Evaluation dataset record not found.
            </div>
          )
        )}
      </div>
    </DashboardShell>
  );
}
