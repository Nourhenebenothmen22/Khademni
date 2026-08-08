"use client";

import React, { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/features/auth/api";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import { Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await requestPasswordReset({ email });
      if (res.success) {
        toast.success("Password reset email sent!");
        setSubmitted(true);
      } else {
        toast.error(res.message || "Reset request failed");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {submitted ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">Check Your Email</h2>
              <p className="text-sm text-slate-600">
                If an account exists for <strong className="text-slate-900">{email}</strong>, we have sent instructions to reset your password.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
                <p className="mt-1 text-sm text-slate-600">Enter your email to receive a password reset link</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {loading ? "Sending Email..." : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                Remembered password?{" "}
                <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
