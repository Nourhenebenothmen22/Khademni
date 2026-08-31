"use client";

import React, { useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchJobById } from "@/features/jobs/api";
import { applyToJob } from "@/features/applications/api";
import { CV_UPLOAD_CONFIG } from "@/config/constants";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Edit,
  X,
  Loader2,
  Tag,
} from "lucide-react";

export default function JobDetailPage({ params }: { params?: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || (params ? use(params).id : "");
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [motivationLetter, setMotivationLetter] = useState("");
  const [applicationSuccess, setApplicationSuccess] = useState<{ trackingCode: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["jobDetail", id],
    queryFn: () => fetchJobById(id),
    enabled: !!id,
  });

  const job = data?.data;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > CV_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
        toast.error(`File size exceeds the maximum limit of ${CV_UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: CV_UPLOAD_CONFIG.DROPZONE_ACCEPT,
    maxSize: CV_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
    maxFiles: 1,
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error("Candidate CV document file is required");
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

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(`/jobs/${id}`)}`;
      router.push(redirectUrl);
    } else if (user?.role === "CANDIDATE") {
      setIsApplyModalOpen(true);
    } else {
      router.push(`/admin/jobs/${id}/edit`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Job Board
        </Link>

        {isLoading && (
          <div className="h-96 rounded-2xl bg-white border border-slate-200 p-8 animate-pulse space-y-6">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-200 rounded w-3/4" />
            <div className="h-32 bg-slate-100 rounded" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
            <ShieldAlert className="mx-auto h-10 w-10 text-rose-500 mb-2" />
            <h2 className="text-lg font-bold">Position Not Available</h2>
            <p className="text-sm mt-1 text-rose-600">
              The requested job post could not be found, or is not currently open for public applications.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => refetch()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
              <Link
                href="/jobs"
                className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                Browse All Positions
              </Link>
            </div>
          </div>
        )}

        {job && (
          <div className="space-y-6">
            {/* Header Card */}
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

                <button
                  onClick={handleApplyClick}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm transition-all"
                >
                  <span>Apply for this Role</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {job.title}
              </h1>

              <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Posted on {new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  {job.deadline ? (
                    <span className="font-semibold text-indigo-600">
                      Application Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-slate-500">Open until position is filled</span>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Banner if Admin is viewing */}
            {isAuthenticated && user?.role === "ORGANIZATION_ADMIN" && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-950">Administrator Mode</p>
                    <p className="text-xs text-indigo-700">You are viewing this job opening with full ATS administrative permissions.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href={`/admin/jobs/${id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-xs"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Job
                  </Link>
                  <Link
                    href={`/admin/applications?jobPostId=${id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    View Applicants
                  </Link>
                </div>
              </div>
            )}

            {/* Description & Responsibilities */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2.5">Position Overview & Responsibilities</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">{job.description}</p>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-2.5">Requirements & Qualifications</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">{job.requirements}</p>
              </div>

              {job.keywords && job.keywords.length > 0 && (
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-indigo-600" />
                    <span>Key Skills & Subject Competencies</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.keywords.map((kw) => (
                      <span
                        key={kw.id}
                        className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {kw.keyword} <span className="text-[10px] text-slate-400 ml-1">({kw.type})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Candidate Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Candidate Application</h3>
                <p className="text-xs text-slate-500">{job?.title}</p>
              </div>
              <button
                onClick={() => {
                  setIsApplyModalOpen(false);
                  setApplicationSuccess(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {applicationSuccess ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center text-emerald-800 space-y-4">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                  <h3 className="text-lg font-bold">Application Submitted Successfully!</h3>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Your profile and CV have been securely submitted to the school recruitment team. Your tracking code is:
                  </p>
                  <div>
                    <code className="inline-block rounded-xl bg-emerald-100 border border-emerald-200 px-4 py-2 text-sm font-mono font-bold text-emerald-950 shadow-xs">
                      {applicationSuccess.trackingCode}
                    </code>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <Link
                      href="/candidate/applications"
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      View My Applications
                    </Link>
                    <button
                      onClick={() => {
                        setIsApplyModalOpen(false);
                        setApplicationSuccess(null);
                      }}
                      className="rounded-xl border border-emerald-300 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyMutation.mutate();
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Upload Resume / CV (PDF or DOCX) *
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDragActive
                          ? "border-indigo-500 bg-indigo-50/50"
                          : "border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-white"
                      }`}
                    >
                      <input {...getInputProps()} />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3 text-indigo-700 font-bold">
                          <FileText className="h-7 w-7 text-indigo-600" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                            <p className="text-[11px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                          <p className="text-xs font-bold text-slate-700">
                            Drag & drop your resume here, or <span className="text-indigo-600 underline">browse</span>
                          </p>
                          <p className="text-[10px] text-slate-400">Accepted formats: PDF, DOCX (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Motivation Letter / Personal Statement (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={motivationLetter}
                      onChange={(e) => setMotivationLetter(e.target.value)}
                      placeholder="Highlight your teaching experience, subject expertise, and reason for applying..."
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedFile || applyMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {applyMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submit Application
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
