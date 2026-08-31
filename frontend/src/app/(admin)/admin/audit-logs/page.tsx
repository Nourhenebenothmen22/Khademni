"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/features/audit-logs/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ShieldCheck, Search } from "lucide-react";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminAuditLogs", page, actionFilter],
    queryFn: () => fetchAuditLogs({ page, limit: 15, action: actionFilter }),
  });

  const logs = data?.data || [];
  const pagination = data?.meta;

  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-600">Immutable security event records, IP addresses, and administrative actions.</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by action (e.g. AUTH_LOGIN, MATCHING_TRIGGER)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-indigo-500"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans">Loading audit logs...</td>
                  </tr>
                )}

                {!isLoading && logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-semibold text-indigo-700">{log.action}</td>
                    <td className="px-6 py-3 text-slate-600 truncate max-w-[120px]">{log.userId}</td>
                    <td className="px-6 py-3 text-slate-700">
                      {log.entityType}: {log.entityId}
                    </td>
                    <td className="px-6 py-3 text-slate-400">{log.ipAddress || "::1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 font-sans">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
