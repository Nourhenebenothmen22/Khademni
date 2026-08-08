"use client";

import React, { use } from "react";
import Link from "next/link";
import { getDocumentDownloadUrl } from "@/features/applications/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ArrowLeft, Download, FileCheck, Shield } from "lucide-react";

export default function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = use(params);
  const downloadUrl = getDocumentDownloadUrl(id, docId);

  return (
    <DashboardShell requiredRole="CANDIDATE">
      <div className="space-y-6 max-w-2xl">
        <Link
          href="/candidate/applications"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Applications
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Access</h1>
          <p className="mt-0.5 text-xs text-slate-500">Document Reference Key: <strong className="font-mono text-slate-700">{docId}</strong></p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center space-y-6 shadow-xs">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-inner">
            <FileCheck className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">Application CV / Document</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your document is securely stored on the recruitment platform. Click the button below to stream and download the file.
            </p>
          </div>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
          >
            <Download className="h-4 w-4" /> Download Attached Document
          </a>

          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 pt-4 border-t border-slate-100">
            <Shield className="h-3.5 w-3.5 text-indigo-500" />
            <span>End-to-End Secure Storage & Access Control</span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
