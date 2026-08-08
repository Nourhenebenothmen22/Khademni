"use client";

import React, { use } from "react";
import Link from "next/link";
import { getDocumentDownloadUrl } from "@/features/applications/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ArrowLeft, Download, FileText } from "lucide-react";

export default function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = use(params);
  const downloadUrl = getDocumentDownloadUrl(id, docId);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <Link
          href="/candidate/applications"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Applications
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Submitted Document Viewer</h1>
            <p className="mt-1 text-sm text-slate-500">Document Reference ID: {docId}</p>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Download className="h-4 w-4" /> Download Original Document
          </a>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
          <FileText className="mx-auto h-16 w-16 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">CV / Document File Access</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Click the download button above to retrieve the authenticated binary stream directly from the storage pipeline.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
