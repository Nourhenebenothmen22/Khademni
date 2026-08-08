"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/features/notifications/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { toast } from "sonner";
import { Bell, Check, Trash2 } from "lucide-react";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["userNotificationsList"],
    queryFn: () => fetchNotifications({ limit: 20 }),
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

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications Center</h1>
            <p className="mt-1 text-sm text-slate-600">Application status updates, system alerts, and notifications.</p>
          </div>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={notifications.length === 0}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Mark All as Read
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Bell className="mx-auto h-10 w-10 text-slate-400 mb-2" />
              <p className="font-semibold">No notifications found</p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between py-4 transition-colors ${
                    !n.isRead ? "bg-indigo-50/30 -mx-6 px-6" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{n.message}</p>
                    <p className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(n.id)}
                      className="text-rose-600 hover:text-rose-800 p-1"
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
