"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createJob } from "@/features/jobs/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { JobStatus } from "@/types/backend";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewJobPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [status, setStatus] = useState<JobStatus>("PUBLISHED");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createJob({
        title,
        description,
        requirements,
        status,
        deadline: deadline || undefined,
      });

      if (res.success && res.data) {
        toast.success("Job post created!");
        router.push(`/admin/jobs/${res.data.id}/edit`);
      } else {
        toast.error(res.message || "Failed to create job post");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Creation error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-6 max-w-3xl">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Job Post</h1>
          <p className="mt-1 text-sm text-slate-600">Define title, description, requirements, and status.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior High School Mathematics Teacher"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:ring-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of responsibilities and school environment..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:ring-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Requirements & Qualifications *</label>
            <textarea
              required
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Degrees, certifications, years of experience required..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:ring-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Application Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Link href="/admin/jobs" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create & Configure Rules"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
