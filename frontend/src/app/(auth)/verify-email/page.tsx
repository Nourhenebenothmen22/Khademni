"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { verifyEmail } from "@/features/auth/api";
import { Header } from "@/components/layout/header";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = use(searchParams);

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "Verification token is missing.");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    verifyEmail(token).then((res) => {
      if (!isMounted) return;
      if (res.success) {
        setStatus("success");
        setMessage(res.data?.message || "Your email address has been verified successfully!");
      } else {
        setStatus("error");
        setMessage(res.message || "Failed to verify email token.");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          {status === "loading" && (
            <div className="space-y-3">
              <Loader2 className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
              <h2 className="text-xl font-bold text-slate-900">Verifying Email...</h2>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">Email Verified</h2>
              <p className="text-sm text-slate-600">{message}</p>
              <Link
                href="/login"
                className="mt-4 inline-block w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Sign In to Account
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="mx-auto h-12 w-12 text-rose-600" />
              <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
              <p className="text-sm text-slate-600">{message}</p>
              <Link
                href="/login"
                className="mt-4 inline-block w-full rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
