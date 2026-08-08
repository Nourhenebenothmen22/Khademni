"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { updateMyProfile, changePassword } from "@/features/users/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import {
  User as UserIcon,
  Lock,
  ShieldCheck,
  KeyRound,
  Mail,
  ArrowRight,
  Circle,
} from "lucide-react";

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();

  const [fullNameInput, setFullNameInput] = useState<string | null>(null);
  const fullName = fullNameInput ?? (user?.fullName || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const res = await updateMyProfile({ fullName });
      if (res.success) {
        toast.success("Profile updated successfully!");
        refreshUser();
      } else {
        toast.error(res.message || "Failed to update profile");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Profile update error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        toast.error(res.message || "Failed to change password");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Password change error");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-6xl">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Security Settings</h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Manage your personal profile details, security credentials, and authentication preferences.
          </p>
        </div>

        {/* 2-Column Layout Grid matching screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Forms Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Personal Information Card */}
            <form
              onSubmit={handleUpdateProfile}
              className="rounded-[22px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5"
            >
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e2e3f6] text-[#282276] font-bold">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                  <p className="text-xs text-slate-400 font-medium">Update your public profile details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    FULL NAME <span className="text-[#282276]">* (EDITABLE)</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#282276] focus:ring-2 focus:ring-[#282276]/20 transition-all bg-white"
                      placeholder="Nourhene ben othmen"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                      EMAIL ADDRESS
                    </label>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> MANAGED & READ-ONLY
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || "nourhenbenoth37@gmail.com"}
                      className="w-full rounded-xl border border-slate-200 bg-[#eeeef4] pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="rounded-xl bg-[#282276] hover:bg-[#1f1a5f] text-white text-xs sm:text-sm font-extrabold px-6 py-2.5 shadow-sm transition-all disabled:opacity-50"
                >
                  {profileLoading ? "Saving..." : "Save Profile Details"}
                </button>
              </div>
            </form>

            {/* Change Password Card */}
            <form
              onSubmit={handleChangePassword}
              className="rounded-[22px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5"
            >
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef9c3] text-[#854d0e] font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Change Password</h2>
                  <p className="text-xs text-slate-400 font-medium">Ensure your account is using a strong password</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    CURRENT PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-[#282276] focus:ring-2 focus:ring-[#282276]/20 bg-white"
                    placeholder="••••••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    NEW PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-[#282276] focus:ring-2 focus:ring-[#282276]/20 bg-white"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading || !currentPassword || newPassword.length < 8}
                  className="rounded-xl bg-[#282276] hover:bg-[#1f1a5f] text-white text-xs sm:text-sm font-extrabold px-6 py-2.5 shadow-sm transition-all disabled:opacity-40"
                >
                  {passwordLoading ? "Updating..." : "Update Security Password"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column Security Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Multi-Factor Auth Card */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e2e3f6] text-[#282276] font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Multi-Factor Auth (TOTP)</h3>
                  <p className="text-xs text-slate-400 font-medium">Two-step verification</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold py-1">
                <span className="text-slate-600">MFA Status</span>
                <span className="font-extrabold text-rose-600">
                  {user?.mfaEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Adds an extra layer of security to your candidate account requiring a 6-digit code from Google Authenticator or Authy.
              </p>

              <Link
                href="/settings/mfa"
                className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-[#edf0fc] hover:bg-[#e2e6fa] border border-[#d8ddf8] text-[#282276] text-xs font-extrabold py-2.5 px-4 transition-colors text-center"
              >
                <span>Configure Two-Factor Auth</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Account Overview Card 1 */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Circle className="h-3.5 w-3.5 text-slate-400" />
                <span>Account Overview</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">MFA Status</span>
                <span className="font-extrabold text-rose-600">
                  {user?.mfaEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Adds an extra layer of security to your candidate account requiring a 6-digit code from Google Authenticator or Authy.
              </p>

              <Link
                href="/settings/mfa"
                className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-[#edf0fc] hover:bg-[#e2e6fa] border border-[#d8ddf8] text-[#282276] text-xs font-extrabold py-2.5 px-4 transition-colors text-center"
              >
                <span>Configure Two-Factor Auth</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Account Overview Card 2 (Role & Email Status) */}
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3.5 text-xs">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Circle className="h-3.5 w-3.5 text-slate-400" />
                <span>Account Overview</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Role Clearance:</span>
                <span className="font-extrabold bg-[#dcfce7] text-[#15803d] px-2.5 py-0.5 rounded-md">
                  {user?.role || "CANDIDATE"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Email Status:</span>
                <span className="font-extrabold text-[#15803d]">
                  {user?.isEmailVerified ? "Verified" : "Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
