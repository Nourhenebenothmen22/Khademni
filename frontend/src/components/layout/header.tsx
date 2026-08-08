"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchUnreadNotificationCount } from "@/features/notifications/api";
import { Bell, LogOut, User as UserIcon, Shield, Briefcase, ChevronDown } from "lucide-react";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/jobs" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            <span>Khademni ATS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/jobs" className="hover:text-indigo-600 transition-colors">
              Job Board
            </Link>
            <Link href="/docs" className="hover:text-indigo-600 transition-colors">
              API Docs
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                href="/notifications"
                className="relative p-2 text-slate-600 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-100"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 p-1.5 pl-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none"
                >
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">{user?.fullName}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                    {user?.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-3 py-2 text-xs border-b border-slate-100">
                      <p className="font-semibold text-slate-900">{user?.fullName}</p>
                      <p className="text-slate-500 truncate">{user?.email}</p>
                      <span className="mt-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                        {user?.role}
                      </span>
                    </div>

                    <Link
                      href={user?.role === "ADMIN" ? "/admin/dashboard" : "/candidate/dashboard"}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
                    >
                      <Shield className="h-4 w-4" />
                      Dashboard
                    </Link>

                    <Link
                      href="/settings/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile Settings
                    </Link>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
