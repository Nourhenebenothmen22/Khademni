"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { loginUser } from "@/features/auth/api";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import { Input, PasswordInput } from "@/components/ui/input";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuthUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      if (res.data?.mfaRequired) {
        toast.info("MFA verification required");
        const queryParams = new URLSearchParams();
        if (res.data.mfaToken) queryParams.set("mfaToken", res.data.mfaToken);
        if (res.data.userId) queryParams.set("userId", res.data.userId);
        router.push(`/mfa/login?${queryParams.toString()}`);
        return;
      }

      if (res.success && res.data?.user) {
        setAuthUser(res.data.user, res.data.accessToken);
        toast.success("Successfully signed in!");
        if (res.data.user.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/candidate/dashboard");
        }
      } else {
        toast.error(res.message || "Invalid credentials");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Sign In to Khademni</h1>
            <p className="mt-1 text-sm text-slate-600">Access candidate portal or admin ATS dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              icon={Mail}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#282276]">
                  {/* Space for label aligned with PasswordInput */}
                </span>
                <Link href="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                label="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Authenticating..." : "Sign In"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have a candidate account?{" "}
            <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
