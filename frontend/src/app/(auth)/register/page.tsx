"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "@/features/auth/api";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import { Input, PasswordInput } from "@/components/ui/input";
import { User, Mail, Lock, CheckCircle2 } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await registerUser({ fullName, email, password });
      if (res.success) {
        toast.success("Account created successfully!");
        setRegisteredSuccess(true);
      } else {
        toast.error(res.message || "Registration failed");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Registration error");
    } finally {
      setLoading(false);
    }
  };

  const loginRedirectUrl = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/login";

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      {registeredSuccess ? (
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">Registration Successful</h2>
          <p className="text-sm text-slate-600">
            We have sent a verification link to <strong className="text-slate-900">{email}</strong>. Please verify your email before logging in.
          </p>
          <button
            onClick={() => router.push(loginRedirectUrl)}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Go to Sign In
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Create Candidate Account</h1>
            <p className="mt-1 text-sm text-slate-600">Apply to verified teaching positions</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              icon={User}
            />

            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              icon={Mail}
            />

            <PasswordInput
              label="Password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              icon={Lock}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href={loginRedirectUrl} className="font-bold text-indigo-600 hover:underline">
              Sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div className="h-96 w-full max-w-md bg-white rounded-2xl animate-pulse" />}>
          <RegisterForm />
        </Suspense>
      </main>
    </div>
  );
}
