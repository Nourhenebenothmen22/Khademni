"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/features/auth/api";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/input";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const router = useRouter();
  const { token } = use(searchParams);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Password reset token is missing");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, newPassword: password });
      if (res.success) {
        toast.success("Password reset successfully!");
        setSuccess(true);
      } else {
        toast.error(res.message || "Failed to reset password");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">Password Changed</h2>
              <p className="text-sm text-slate-600">Your password has been updated. You can now sign in with your new password.</p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 text-center"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
                <p className="mt-1 text-sm text-slate-600">Enter a new secure password for your account</p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <PasswordInput
                  label="New Password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  icon={Lock}
                />

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {loading ? "Updating Password..." : "Update Password"}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
