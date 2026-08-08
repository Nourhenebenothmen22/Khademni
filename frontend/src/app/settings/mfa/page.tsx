"use client";

import React, { useState } from "react";
import Link from "next/link";
import { setupMfa, verifyMfa } from "@/features/auth/api";
import { useAuth } from "@/lib/auth/auth-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";

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

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-xl">
        <Link href="/settings/profile" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Profile Settings
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">MFA Security Configuration</h1>
          <p className="mt-1 text-sm text-slate-600">Protect your account with Google Authenticator or Authy.</p>
        </div>

        {user?.mfaEnabled ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800 space-y-3">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="text-lg font-bold">Two-Factor Authentication Active</h2>
            <p className="text-xs">Your account requires a 6-digit TOTP code during sign-in.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            {!secret ? (
              <div className="space-y-4">
                <ShieldCheck className="h-10 w-10 text-indigo-600" />
                <h2 className="font-bold text-slate-900">Step 1: Generate Authenticator Secret</h2>
                <p className="text-sm text-slate-600">
                  Click the button below to generate a TOTP secret and QR code for setup.
                </p>
                <button
                  onClick={handleSetup}
                  disabled={loading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Generating Secret..." : "Generate MFA Secret"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="font-bold text-slate-900 mb-2">Step 2: Scan QR Code</h2>
                  {qrCodeUrl && (
                    <div className="p-4 bg-slate-50 border rounded-lg inline-block mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="MFA QR Code" className="h-40 w-40 mx-auto" />
                    </div>
                  )}
                  <p className="text-xs font-mono text-slate-700 bg-slate-100 p-2 rounded">
                    Secret Key: {secret}
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4 pt-4 border-t border-slate-100">
                  <h2 className="font-bold text-slate-900">Step 3: Enter Verification Code</h2>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      className="w-full font-mono text-center tracking-widest rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
