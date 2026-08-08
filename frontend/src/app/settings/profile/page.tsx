"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { updateMyProfile, changePassword } from "@/features/users/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

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
        toast.success("Profile updated!");
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
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile & Security Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Update personal information, change password, or configure MFA.</p>
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleUpdateProfile} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Profile Information</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullNameInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || ""}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={profileLoading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Change Password</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>

        {/* MFA Redirect Banner */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900">Multi-Factor Authentication (TOTP)</h3>
              <p className="text-xs text-slate-600 mt-0.5">Status: {user?.mfaEnabled ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
          <Link
            href="/settings/mfa"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Configure MFA
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
