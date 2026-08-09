"use client";

import React, { useState } from "react";
import Link from "next/link";
import { setupMfa, verifyMfa } from "@/features/auth/api";
import { useAuth } from "@/lib/auth/auth-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, KeyRound, CheckCircle2, Copy, Sparkles } from "lucide-react";

export default function MfaSetupPage() {
  const { user, refreshUser } = useAuth();

  const [secret, setSecret] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await setupMfa();
      if (res.success && res.data) {
        setSecret(res.data.secret);
        setQrCodeUrl(res.data.qrCodeUrl);
        toast.info("Scan QR Code or enter secret in your authenticator app");
      } else {
        toast.error(res.message || "Failed to setup MFA");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await verifyMfa({ code });
      if (res.success) {
        toast.success("MFA enabled on your account!");
        refreshUser();
      } else {
        toast.error(res.message || "Invalid MFA code");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast.success("Secret key copied to clipboard!");
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-2xl">
        <Link href="/settings/profile" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Profile & Security
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Two-Factor Authentication Setup</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Secure your account with Google Authenticator, Authy, or 1Password.</p>
        </div>

        {user?.mfaEnabled ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center text-emerald-900 space-y-4 shadow-xs">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold">MFA Protection Enabled</h2>
              <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                Your account is protected. A 6-digit TOTP security code is required whenever you sign in.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            {!secret ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Step 1: Generate Authenticator Key</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click the button below to generate a TOTP secret and QR code for your authenticator app.
                  </p>
                </div>
                <button
                  onClick={handleSetup}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  {loading ? "Generating Secret..." : "Generate MFA Secret"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900">Step 2: Scan QR Code with Authenticator</h2>
                  {qrCodeUrl && (
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="MFA QR Code" className="h-44 w-44 mx-auto rounded-lg" />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-xs font-mono">
                    <span className="truncate">Secret: <strong>{secret}</strong></span>
                    <button onClick={copySecret} className="text-indigo-600 hover:text-indigo-800 p-1 shrink-0" title="Copy secret">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleVerify} className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900">Step 3: Enter 6-Digit Code</h2>
                    <p className="text-xs text-slate-500">Enter the 6-digit code displayed in your authenticator app to confirm setup.</p>
                  </div>

                  <div className="relative max-w-xs">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      className="w-full font-mono text-center tracking-widest text-lg font-bold rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2.5 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    {loading ? "Enabling MFA..." : "Confirm & Enable MFA"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
