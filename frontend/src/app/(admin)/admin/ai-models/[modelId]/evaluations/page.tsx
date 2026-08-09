"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchModelEvaluations, createModelEvaluation, fetchAIModelById } from "@/features/ai-models/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { ArrowLeft, Activity, Plus, ChevronRight, BarChart3 } from "lucide-react";

export default function ModelEvaluationsListPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = use(params);
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [sampleSize, setSampleSize] = useState(100);
  const [latencyMs, setLatencyMs] = useState(45);

  const { data: modelData } = useQuery({
    queryKey: ["aiModelDetail", modelId],
    queryFn: () => fetchAIModelById(modelId),
  });

  const { data: evalData, isLoading, isError } = useQuery({
    queryKey: ["modelEvaluationsList", modelId],
    queryFn: () => fetchModelEvaluations(modelId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createModelEvaluation(modelId, {
        datasetName,
        evaluationSampleSize: Number(sampleSize),
        averageLatencyMs: Number(latencyMs),
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Benchmark evaluation record created!");
        setShowCreate(false);
        setDatasetName("");
        queryClient.invalidateQueries({ queryKey: ["modelEvaluationsList", modelId] });
      } else {
        toast.error(res.message || "Failed to create evaluation");
      }
    },
  });

  const model = modelData?.data;
  const evaluations = evalData?.data || [];

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6 max-w-5xl">
        <Link
          href="/admin/ai-models"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Models Registry
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Model Evaluations: {model?.name || modelId}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Algorithm: <span className="font-mono text-slate-700">{model?.algorithm || "384d Vector RRF"}</span> | Version: <span className="font-bold text-slate-700">v{model?.version || "1.0"}</span>
            </p>
          </div>

          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Run Benchmark Evaluation
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-md"
          >
            <h2 className="font-bold text-slate-900 text-sm">New Benchmark Dataset Evaluation</h2>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Dataset Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. STEM Teaching CV Test Set 2026"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Sample Size *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Latency (ms)</label>
                <input
                  type="number"
                  step="0.1"
                  value={latencyMs}
                  onChange={(e) => setLatencyMs(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                {createMutation.isPending ? "Creating..." : "Save Evaluation"}
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-32 rounded-2xl bg-white border border-slate-200 p-6 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 text-xs font-bold">
            Failed to load benchmark evaluations for this model.
          </div>
        )}

        {!isLoading && !isError && evaluations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No evaluations recorded yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Run benchmark evaluation tests against sample candidate datasets to evaluate precision, recall, and NDCG@5 scores.
            </p>
          </div>
        )}

        {!isLoading && !isError && evaluations.length > 0 && (
          <div className="space-y-4">
            {evaluations.map((ev) => (
              <div
                key={ev.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">{ev.datasetName}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                    <span>Sample Size: <strong className="text-slate-800">{ev.evaluationSampleSize}</strong></span>
                    {ev.averageLatencyMs && (
                      <span>Avg Latency: <strong className="text-indigo-600">{ev.averageLatencyMs.toFixed(1)} ms</strong></span>
                    )}
                    <span>Evaluated: {ev.evaluatedAt ? new Date(ev.evaluatedAt).toLocaleDateString() : "Recently"}</span>
                  </div>
                </div>

                <Link
                  href={`/admin/ai-models/${modelId}/evaluations/${ev.id}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shrink-0"
                >
                  <span>Metrics & Precision</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
