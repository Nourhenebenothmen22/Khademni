"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchUnreadNotificationCount } from "@/features/notifications/api";
import { Bell, LogOut, User as UserIcon, Shield, Building2, ChevronDown, Sparkles } from "lucide-react";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadNotificationCount().then((res) => {
        if (res.success && res.data) {
          setUnreadCount(res.data.unreadCount);
        }
      });
    }
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/jobs" className="flex items-center gap-2.5 font-extrabold text-slate-900 text-lg tracking-tight group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#282276] text-white shadow-md shadow-indigo-900/10 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-base font-extrabold text-slate-900">Khademni ATS</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Enterprise Recruitment</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link href="/jobs" className="hover:text-[#282276] transition-colors py-1">
              Job Openings
            </Link>
            <Link href="/docs" className="hover:text-[#282276] transition-colors py-1 flex items-center gap-1.5">
              <span>API Specs</span>
              <span className="rounded-full bg-[#e2e3f6] px-2 py-0.5 text-[10px] font-bold text-[#282276]">v1.0</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center text-slate-500 hover:text-[#282276] transition-colors rounded-xl hover:bg-slate-100"
                title="Notifications Center"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/50 p-1 pl-4 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100/80 transition-all focus:outline-none"
                >
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {user?.fullName || "Nourhene ben othmen"}
                  </span>
                  {user?.avatarUrl && !avatarError ? (
                    <img
                      src={user.avatarUrl.startsWith("http") ? user.avatarUrl : `http://localhost:3000${user.avatarUrl}`}
                      alt={user.fullName}
                      className="h-7 w-7 rounded-full object-cover border border-slate-200"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#282276] text-white font-extrabold text-xs shadow-xs">
                      {user?.fullName?.charAt(0).toUpperCase() || "N"}
                    </div>
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-400 mr-1 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 z-50 divide-y divide-slate-100 border border-slate-100">
                    <div className="px-3 py-2.5">
                      <p className="font-bold text-sm text-slate-900">{user?.fullName}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                          <Sparkles className="h-3 w-3 text-indigo-500" />
                          {user?.role}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href={user?.role === "ADMIN" ? "/admin/dashboard" : "/candidate/dashboard"}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-[#e2e3f6] hover:text-[#282276] rounded-xl transition-colors"
                      >
                        <Shield className="h-4 w-4 text-slate-400" />
                        Dashboard Overview
                      </Link>

                      <Link
                        href="/settings/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-[#e2e3f6] hover:text-[#282276] rounded-xl transition-colors"
                      >
                        <UserIcon className="h-4 w-4 text-slate-400" />
                        Account & Security
                      </Link>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl text-left transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-[#282276] transition-colors px-3 py-1.5"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl bg-[#282276] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1f1a5f] transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
