"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/features/notifications/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { Bell, CheckCheck, Trash2, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["userNotificationsList"],
    queryFn: () => fetchNotifications({ limit: 50 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotificationsList"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["userNotificationsList"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotificationsList"] });
    },
  });

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const displayedNotifications = filter === "UNREAD"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications Center</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white shadow-2xs">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Application status updates, system alerts, and recruitment notices.</p>
          </div>

          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <CheckCheck className="h-4 w-4 text-indigo-600" />
            <span>Mark All as Read</span>
          </button>
        </div>

        {/* Tab filters */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xs w-fit">
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
              filter === "ALL" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100/70"
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
              filter === "UNREAD" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100/70"
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>

        {/* List Card Container */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && displayedNotifications.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Bell className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-base">No Notifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filter === "UNREAD" ? "You have read all notifications." : "Your inbox is empty."}
              </p>
            </div>
          )}

          {!isLoading && displayedNotifications.length > 0 && (
            <div className="divide-y divide-slate-100">
              {displayedNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between py-4 gap-4 transition-colors group ${
                    !n.isRead ? "bg-indigo-50/40 -mx-6 px-6 rounded-xl" : ""
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 font-bold ${
                      !n.isRead ? "bg-indigo-600 text-white shadow-2xs" : "bg-slate-100 text-slate-500"
                    }`}>
                      {n.title.toLowerCase().includes("accepted") || n.title.toLowerCase().includes("shortlisted") ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : n.title.toLowerCase().includes("reject") || n.title.toLowerCase().includes("alert") ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <Info className="h-5 w-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{n.message}</p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(n.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
