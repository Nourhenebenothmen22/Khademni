"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { loginUser } from "@/features/auth/api";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import { Input, PasswordInput } from "@/components/ui/input";
import { Mail, Lock, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { setAuthUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getSafeRedirectUrl = (role: string, redirect: string | null): string => {
    if (role === "ORGANIZATION_ADMIN") {
      if (redirect && redirect.startsWith("/admin") && !redirect.startsWith("//")) {
        return redirect;
      }
      return "/admin/dashboard";
    } else {
      if (redirect && (redirect.startsWith("/candidate") || redirect.startsWith("/jobs")) && !redirect.startsWith("//")) {
        return redirect;
      }
      return "/candidate/dashboard";
    }
  };

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
        if (redirectParam) queryParams.set("redirect", redirectParam);
        router.push(`/mfa/login?${queryParams.toString()}`);
        return;
      }

      if (res.success && res.data?.user) {
        setAuthUser(res.data.user, res.data.accessToken);
        toast.success("Successfully signed in!");
        
        const destination = getSafeRedirectUrl(res.data.user.role, redirectParam);
        router.push(destination);
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
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
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

        <PasswordInput
          label="Password"
          rightLabel={
            <Link href="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">
              Forgot password?
            </Link>
          }
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          icon={Lock}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Authenticating..." : "Sign In"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Don&apos;t have a candidate account?{" "}
        <Link
          href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"}
          className="font-bold text-indigo-600 hover:underline"
        >
          Create candidate account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div className="h-96 w-full max-w-md bg-white rounded-2xl animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
