"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Cpu,
  Users,
  Building2,
  ShieldCheck,
  Bell,
  Settings,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const candidateNav = [
    { name: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
    { name: "My Applications", href: "/candidate/applications", icon: FileText },
  ];

  const adminNav = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Job Openings", href: "/admin/jobs", icon: Briefcase },
    { name: "Applications", href: "/admin/applications", icon: FileText },
    { name: "AI Matching Run", href: "/admin/matching", icon: Cpu },
    { name: "AI Benchmark Models", href: "/admin/ai-models", icon: ShieldCheck },
    { name: "User Directory", href: "/admin/users", icon: Users },
    { name: "Organizations", href: "/admin/organizations", icon: Building2 },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
  ];

  const commonNav = [
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Profile & Security", href: "/settings/profile", icon: Settings },
  ];

  const items = isAdmin ? adminNav : candidateNav;

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/50 min-h-[calc(100vh-4rem)] p-4 hidden md:block">
      <div className="space-y-6">
        <div>
          <h2 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isAdmin ? "Admin Navigation" : "Candidate Menu"}
          </h2>
          <nav className="mt-2 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <h2 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Account & Preferences
          </h2>
          <nav className="mt-2 space-y-1">
            {commonNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
