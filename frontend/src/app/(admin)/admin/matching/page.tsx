"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchJobs } from "@/features/jobs/api";
import { fetchAIModels } from "@/features/ai-models/api";
import {
  triggerJobMatchingRun,
  enqueueJobMatchingRun,
  fetchMatchingQueueStatus,
  fetchMatchingRuns,
} from "@/features/matching/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { Cpu, Play, Clock, CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react";

export default function AIMatchingDashboardPage() {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [activeQueueJobId, setActiveQueueJobId] = useState<string | null>(null);

  // Fetch Jobs & Models
  const { data: jobsData } = useQuery({
    queryKey: ["matchingJobsList"],
    queryFn: () => fetchJobs({ status: "PUBLISHED", limit: 50 }),
  });

  const { data: modelsData } = useQuery({
    queryKey: ["matchingModelsList"],
    queryFn: () => fetchAIModels({ isActive: true }),
  });

  const { data: runsData, refetch: refetchRuns } = useQuery({
    queryKey: ["matchingRunsHistory"],
    queryFn: () => fetchMatchingRuns({ limit: 10 }),
  });

  // Polling queue status every 2 seconds when an active queue job exists
  const { data: queueStatusData } = useQuery({
    queryKey: ["queueStatus", activeQueueJobId],
    queryFn: () => fetchMatchingQueueStatus(activeQueueJobId!),
    enabled: !!activeQueueJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === "completed" || status === "failed") {
        return false; // Stop polling
      }
      return 2000; // Poll every 2 seconds
    },
  });

  const queueStatus = queueStatusData?.data;

  // Instant Job Run Mutation
  const instantRunMutation = useMutation({
    mutationFn: () => triggerJobMatchingRun(selectedJobId, selectedModelId || undefined),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success(`Processed ${res.data.processedCount} applications cleanly!`);
        refetchRuns();
      } else {
        toast.error(res.message || "Execution failed");
      }
    },
  });

  // Async Queue Run Mutation
  const enqueueMutation = useMutation({
    mutationFn: () => enqueueJobMatchingRun(selectedJobId, selectedModelId || undefined),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success("Job enqueued in background BullMQ worker!");
        setActiveQueueJobId(res.data.queueJobId);
        refetchRuns();
      } else {
        toast.error(res.message || "Enqueue failed");
      }
    },
  });

  const jobs = jobsData?.data || [];
  const models = modelsData?.data || [];
  const runs = runsData?.data || [];

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Matching Engine & Queue Control</h1>
          <p className="mt-1 text-sm text-slate-600">
            Execute hybrid dense vector (384d) + BM25 sparse matching runs on candidate CVs.
          </p>
        </div>

        {/* Execution Control Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-600" />
            <span>Trigger Batch Job Matching</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Target Job Post *</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500"
              >
                <option value="">-- Choose Published Position --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.organization?.name || "Global"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select AI Benchmark Model (Optional)</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500"
              >
                <option value="">Default Active Model (Xenova 384d MiniLM + RRF)</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} v{m.version} ({m.algorithm})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => instantRunMutation.mutate()}
              disabled={!selectedJobId || instantRunMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Play className="h-4 w-4" />
              {instantRunMutation.isPending ? "Calculating Embeddings..." : "Execute Synchronous Run"}
            </button>

            <button
              onClick={() => enqueueMutation.mutate()}
              disabled={!selectedJobId || enqueueMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-600 bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            >
              <Clock className="h-4 w-4" />
              {enqueueMutation.isPending ? "Enqueuing..." : "Enqueue Background Job (BullMQ)"}
            </button>
          </div>
        </div>

        {/* Polling Live Progress Bar */}
        {queueStatus && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-indigo-950 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600 animate-spin" />
                  Background Queue Status (Job ID: <span className="font-mono text-xs">{queueStatus.queueJobId}</span>)
                </h3>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Status: <strong className="uppercase">{queueStatus.status}</strong> — Processed {queueStatus.processedCount} of {queueStatus.totalApplications} applications
                </p>
              </div>
              <span className="text-xl font-extrabold text-indigo-700">{queueStatus.progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-indigo-200 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${queueStatus.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Historical Matching Runs Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Historical Matching Runs</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Run ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total Score</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{r.id}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {r.totalScore !== null ? `${Number(r.totalScore).toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {r.confidence !== null ? `${(r.confidence * 100).toFixed(0)}%` : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/matching/runs/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        <span>View Run Breakdown</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
