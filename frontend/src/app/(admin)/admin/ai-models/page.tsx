"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAIModels, createAIModel, updateAIModel } from "@/features/ai-models/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { ShieldCheck, Plus, CheckCircle2, ChevronRight } from "lucide-react";

export default function AIModelsRegistryPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [algorithm, setAlgorithm] = useState("ONNX_MINILM_PGVECTOR_RRF");
  const [description, setDescription] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["aiModelsList"],
    queryFn: () => fetchAIModels(),
  });

  const createMutation = useMutation({
    mutationFn: () => createAIModel({ name, version, algorithm, description }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("AI Model registered!");
        setShowCreate(false);
        queryClient.invalidateQueries({ queryKey: ["aiModelsList"] });
      } else {
        toast.error(res.message || "Failed to register model");
      }
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAIModel(id, { isActive }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Active AI Model updated!");
        queryClient.invalidateQueries({ queryKey: ["aiModelsList"] });
      }
    },
  });

  const models = data?.data || [];

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Matching Models Registry</h1>
            <p className="mt-1 text-sm text-slate-600">Register benchmark models, set active status, and inspect evaluation metrics.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Register Model
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-2xl"
          >
            <h2 className="font-bold text-slate-900">Register New AI Model</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Model Name (e.g. all-MiniLM-L6-v2)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Version (e.g. 1.0.0)"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <input
              type="text"
              required
              placeholder="Algorithm Name"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
            <textarea
              rows={2}
              placeholder="Description & hyperparameters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Save Model
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading && (
            <div className="h-40 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
          )}

          {!isLoading && models.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  v{m.version}
                </span>
                {m.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE MODEL
                  </span>
                ) : (
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: m.id, isActive: true })}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Set Active
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">{m.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{m.algorithm}</p>
                <p className="text-sm text-slate-600 mt-2">{m.description || "No description provided."}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Created: {new Date(m.createdAt).toLocaleDateString()}</span>
                <Link
                  href={`/admin/ai-models/${m.id}/evaluations/eval-1`}
                  className="font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  Evaluations & Metrics <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
