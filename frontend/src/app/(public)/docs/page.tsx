"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/docs.json")
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">API Documentation</h1>
          <p className="mt-1 text-sm text-slate-600">
            OpenAPI 3.0 specification for Khademni ATS Recruitment Backend.
          </p>
        </div>

        {loading && (
          <div className="h-96 rounded-xl bg-white border border-slate-200 p-8 animate-pulse flex items-center justify-center text-slate-400">
            Loading API Specification...
          </div>
        )}

        {!loading && spec && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
            <pre className="text-xs font-mono text-slate-800 bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto max-h-[700px]">
              {JSON.stringify(spec, null, 2)}
            </pre>
          </div>
        )}

        {!loading && !spec && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Unable to connect to backend `/docs.json` endpoint. Ensure backend server is running.
          </div>
        )}
      </main>
    </div>
  );
}
