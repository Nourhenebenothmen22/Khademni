"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchJobs } from "@/features/jobs/api";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Briefcase, Calendar, Building2, ArrowRight, Eye, Sparkles } from "lucide-react";

export default function PublicJobBoardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["publicJobs", page, searchTerm],
    queryFn: () => fetchJobs({ status: "PUBLISHED", page, limit: 9, search: searchTerm }),
  });

  const jobs = data?.data || [];
  const pagination = data?.meta;

  const handleApplyClick = (jobId: string) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/jobs/${jobId}#apply-section`)}`);
    } else {
      router.push(`/jobs/${jobId}#apply-section`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-700 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Public Teacher Recruitment Board</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Explore Open Teaching Positions
          </h1>
          <p className="mt-2 text-base text-slate-600 max-w-2xl">
            Discover verified educator opportunities across premier academic institutions. Browse job descriptions, qualifications, and apply directly.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by job title, subject, qualification, or keywords..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-xs transition-all"
            />
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-60 rounded-2xl bg-white border border-slate-200 p-6 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="h-16 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-200 rounded w-1/2 mt-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
            <p className="font-semibold">Failed to load published positions.</p>
            <p className="text-sm mt-1 text-rose-600">Please verify your connection and try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && jobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <Briefcase className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No open positions matching your search</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              We currently don&apos;t have active job postings matching &quot;{searchTerm}&quot;. Try adjusting your keywords or clearing the search.
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}

        {/* Jobs Grid */}
        {!isLoading && !isError && jobs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <StatusBadge status={job.status} />
                      {job.organization && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                          <Building2 className="h-3 w-3 text-indigo-500" />
                          {job.organization.name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {job.title}
                    </h2>
                    <p className="mt-2.5 text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>

                    {job.keywords && job.keywords.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {job.keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw.id}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            {kw.keyword}
                          </span>
                        ))}
                        {job.keywords.length > 3 && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            +{job.keywords.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{job.deadline ? `Deadline: ${new Date(job.deadline).toLocaleDateString()}` : "Open until filled"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                        <span>View</span>
                      </Link>
                      <button
                        onClick={() => handleApplyClick(job.id)}
                        className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                      >
                        <span>Apply</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
                >
                  Previous Page
                </button>
                <span className="text-xs font-semibold text-slate-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} positions)
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
                >
                  Next Page
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
