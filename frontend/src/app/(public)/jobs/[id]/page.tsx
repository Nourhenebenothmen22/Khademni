"use client";

import React, { useState, useCallback, use } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchJobById } from "@/features/jobs/api";
import { applyToJob } from "@/features/applications/api";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { UploadCloud, FileText, CheckCircle2, ArrowLeft, Lock } from "lucide-react";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, user } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [motivationLetter, setMotivationLetter] = useState("");
  const [applicationSuccess, setApplicationSuccess] = useState<{ trackingCode: string } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["jobDetail", id],
    queryFn: () => fetchJobById(id),
  });

  const job = data?.data;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error("CV Document file is required");
      return applyToJob(id, selectedFile, motivationLetter);
    },
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success("Application submitted successfully!");
        setApplicationSuccess({ trackingCode: res.data.trackingCode });
      } else {
        toast.error(res.message || "Failed to submit application");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Submission failed");
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Job Board
        </Link>

        {isLoading && (
          <div className="h-96 rounded-xl bg-white border border-slate-200 p-8 animate-pulse" />
        )}

        {isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Position not found or unavailable.
          </div>
        )}

        {job && (
          <div className="space-y-8">
            {/* Header Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <StatusBadge status={job.status} />
                {job.organization && (
                  <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md">
                    {job.organization.name}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{job.title}</h1>
              <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
                Posted on {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Description & Requirements */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Job Overview</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Requirements & Qualifications</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.requirements}</p>
              </div>

              {job.keywords && job.keywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Core Skills & Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.keywords.map((kw) => (
                      <span key={kw.id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {kw.keyword} ({kw.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Application Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Apply for Position</h2>

              {applicationSuccess ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6 text-center text-emerald-800">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-2" />
                  <h3 className="text-lg font-bold">Application Submitted!</h3>
                  <p className="text-sm mt-1">Your unique tracking code is:</p>
                  <code className="mt-2 inline-block rounded bg-emerald-100 px-3 py-1 text-base font-mono font-bold text-emerald-900">
                    {applicationSuccess.trackingCode}
                  </code>
                  <div className="mt-6">
                    <Link
                      href="/candidate/applications"
                      className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      View Applications Dashboard
                    </Link>
                  </div>
                </div>
              ) : !isAuthenticated ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-6 text-center text-amber-800">
                  <Lock className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                  <p className="font-semibold">Candidate Account Required</p>
                  <p className="text-sm mt-1">Please sign in or create a candidate account to submit your CV.</p>
                  <div className="mt-4 flex justify-center gap-3">
                    <Link href="/login" className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
                      Sign In
                    </Link>
                    <Link href="/register" className="rounded-md border border-amber-600 px-4 py-2 text-sm font-semibold text-amber-900">
                      Create Account
                    </Link>
                  </div>
                </div>
              ) : user?.role !== "CANDIDATE" ? (
                <div className="rounded-lg bg-slate-100 p-4 text-center text-sm text-slate-600">
                  Logged in as {user?.role}. Candidate role required to apply for positions.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyMutation.mutate();
                  }}
                  className="space-y-6"
                >
                  {/* Dropzone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload Resume / CV (PDF or DOCX) *
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                        isDragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      <input {...getInputProps()} />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2 text-indigo-700 font-medium">
                          <FileText className="h-6 w-6" />
                          <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                          <p className="text-sm font-medium text-slate-700">Drag & drop your CV file here, or click to browse</p>
                          <p className="text-xs text-slate-500">Supports PDF and DOCX formats</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Motivation Letter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Motivation Letter (Optional)
                    </label>
                    <textarea
                      rows={4}
                      value={motivationLetter}
                      onChange={(e) => setMotivationLetter(e.target.value)}
                      placeholder="Briefly describe your teaching background and qualifications..."
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedFile || applyMutation.isPending}
                    className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {applyMutation.isPending ? "Submitting Application & Extracting CV..." : "Submit Application"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
