"use client";

import React, { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { loginMfa } from "@/features/auth/api";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import { ShieldCheck, KeyRound } from "lucide-react";

export default function MfaLoginPage({ searchParams }: { searchParams: Promise<{ mfaToken?: string }> }) {
  const router = useRouter();
  const { mfaToken } = use(searchParams);
  const { setAuthUser } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) {
      toast.error("Invalid MFA session token");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await loginMfa({ mfaToken, code });
      if (res.success && res.data?.user) {
        setAuthUser(res.data.user, res.data.accessToken);
        toast.success("MFA authentication successful!");
        if (res.data.user.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/candidate/dashboard");
        }
      } else {
        toast.error(res.message || "Invalid 6-digit MFA code");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "MFA login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-indigo-600 mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Two-Factor Authentication</h1>
          <p className="mt-1 text-sm text-slate-600 mb-6">
            Enter the 6-digit verification code from your authenticator app.
          </p>

          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                placeholder="123456"
                className="w-full text-center text-lg font-mono tracking-widest rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Verifying Code..." : "Verify & Sign In"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
