"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardStats } from "@/features/audit-logs/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Users, FileText, Briefcase, Cpu } from "lucide-react";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => fetchAdminDashboardStats(),
  });

  const stats = data?.data;
  const statusData = stats?.applicationsByStatus || [];

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin ATS Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Recruitment analytics, application status distribution, and tenant metrics.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Registered Users</p>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? "..." : stats?.totalUsers}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Job Posts</p>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? "..." : stats?.totalJobPosts}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Applications</p>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? "..." : stats?.totalApplications}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">AI Matching Engine</p>
              <p className="text-2xl font-bold text-slate-900">Active</p>
            </div>
          </div>
        </div>

        {/* Status Distribution Rechart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Applications Status Breakdown</h2>
          {isLoading ? (
            <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
          ) : statusData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No application status data recorded.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="status" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/matching"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 transition-colors"
          >
            <h3 className="font-bold text-slate-900">Run AI Matching Engine</h3>
            <p className="text-sm text-slate-500 mt-1">Execute batch vector matching on incoming CVs.</p>
          </Link>
          <Link
            href="/admin/jobs/new"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 transition-colors"
          >
            <h3 className="font-bold text-slate-900">Create New Job Post</h3>
            <p className="text-sm text-slate-500 mt-1">Publish teaching position & define matching rules.</p>
          </Link>
          <Link
            href="/admin/applications"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 transition-colors"
          >
            <h3 className="font-bold text-slate-900">Manage Applications</h3>
            <p className="text-sm text-slate-500 mt-1">Review candidate profiles, statuses, and documents.</p>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
