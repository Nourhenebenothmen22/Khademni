"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getAvatarImageUrl } from "@/lib/api/client";
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
  ShieldAlert,
  Calendar,
  User as UserIcon,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isOrgAdmin = user?.role === "ORGANIZATION_ADMIN";
  const [sidebarAvatarError, setSidebarAvatarError] = React.useState(false);

  const candidateNav = [
    { name: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
    { name: "Explore Jobs", href: "/jobs", icon: Briefcase },
    { name: "My Applications", href: "/candidate/applications", icon: FileText },
    { name: "My Interviews", href: "/candidate/interviews", icon: Calendar },
  ];

  const adminNav = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Job Openings", href: "/admin/jobs", icon: Briefcase },
    { name: "Applications", href: "/admin/applications", icon: FileText },
    { name: "Interviews", href: "/admin/interviews", icon: Calendar },
    { name: "AI Matching Engine", href: "/admin/matching", icon: Cpu },
    { name: "Organization Profile", href: "/admin/organizations", icon: Building2 },
    { name: "Team Members", href: "/admin/users", icon: Users },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldAlert },
  ];

  const commonNav = [
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Profile & Security", href: "/settings/profile", icon: Settings },
  ];

  const items = isOrgAdmin ? adminNav : candidateNav;

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200/70 bg-[#f8fafc]/80 backdrop-blur-sm min-h-[calc(100vh-4rem)] p-4 hidden md:flex flex-col justify-between">
      <div className="space-y-6">
        {/* Top User Card in Sidebar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs text-center space-y-3">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200 overflow-hidden shadow-inner">
            {user?.avatarUrl && !sidebarAvatarError ? (
              <img
                src={getAvatarImageUrl(user.avatarUrl)!}
                alt={user.fullName}
                className="h-full w-full object-cover"
                onError={() => setSidebarAvatarError(true)}
              />
            ) : (
              <UserIcon className="h-12 w-12 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 font-bold text-slate-900 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#282276] text-[10px] font-extrabold text-white">
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </span>
              <span className="truncate">{user?.fullName || "User"}</span>
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>{user?.role || "CANDIDATE"}</span>
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <div>
          <h2 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {isOrgAdmin ? "Organization Workspace" : "Candidate Portal"}
          </h2>
          <nav className="mt-2.5 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/candidate/dashboard" &&
                  item.href !== "/admin/dashboard" &&
                  pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#e2e3f6] text-[#282276] font-bold shadow-2xs border-l-4 border-[#282276]"
                      : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-[#282276]" : "text-slate-400 group-hover:text-slate-600",
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section 2 */}
        <div>
          <h2 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Preferences & System
          </h2>
          <nav className="mt-2.5 space-y-1">
            {commonNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#e2e3f6] text-[#282276] font-bold shadow-2xs border-l-4 border-[#282276]"
                      : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-[#282276]" : "text-slate-400 group-hover:text-slate-600",
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Circle Badge */}
      <div className="pt-4 border-t border-slate-200/60">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#282276] text-white font-extrabold text-xs shadow-xs">
          {user?.fullName?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </aside>
  );
}
