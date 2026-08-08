"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchJobs } from "@/features/jobs/api";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Briefcase, Calendar, MapPin } from "lucide-react";

export default function PublicJobBoardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["publicJobs", page, searchTerm],
    queryFn: () => fetchJobs({ status: "PUBLISHED", page, limit: 9, search: searchTerm }),
  });

  const jobs = data?.data || [];
  const pagination = data?.meta;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Open Teaching Positions</h1>
          <p className="mt-2 text-slate-600">
            Explore verified teaching opportunities and apply using your CV.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by job title, subject, or requirements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-48 rounded-xl bg-white border border-slate-200 p-6 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Failed to load published jobs. Please refresh or try again later.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && jobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-900">No published positions found</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search keywords.</p>
          </div>
        )}

        {/* Jobs Grid */}
        {!isLoading && !isError && jobs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <StatusBadge status={job.status} />
                      {job.organization && (
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {job.organization.name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{job.title}</h2>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3">{job.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{job.deadline ? new Date(job.deadline).toLocaleDateString() : "No deadline"}</span>
                    </div>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      View & Apply
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} positions)
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
