"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-context";
import { getAccessToken, API_BASE_URL } from "../api/client";
import { tabSyncManager } from "./tab-sync";
import type { RealtimeEventPayload, RealtimeEventType } from "./types";

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: RealtimeEventPayload | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  lastEvent: null,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

function getWebSocketUrl(token?: string): string {
  try {
    const url = new URL(API_BASE_URL);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const host = url.host;
    return `${protocol}//${host}/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  } catch {
    return `ws://localhost:3000/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Invalidate TanStack Query key and sync with other tabs
  const handleQueryInvalidation = useCallback(
    (queryKey: string[], broadcast = true) => {
      queryClient.invalidateQueries({ queryKey });
      if (broadcast) {
        tabSyncManager.broadcast({ type: "INVALIDATE_QUERY", queryKey });
      }
    },
    [queryClient],
  );

  // Subscribe to Multi-Tab BroadcastChannel messages
  useEffect(() => {
    const unsubscribe = tabSyncManager.subscribe((message) => {
      if (message.type === "INVALIDATE_QUERY") {
        queryClient.invalidateQueries({ queryKey: message.queryKey });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Dispatch incoming realtime event to queries and toast alerts
  const handleRealtimeEvent = useCallback(
    (payload: RealtimeEventPayload) => {
      setLastEvent(payload);

      switch (payload.type) {
        case "NOTIFICATION_CREATED": {
          const notif = payload.data as { title?: string; message?: string };
          handleQueryInvalidation(["notifications"]);
          handleQueryInvalidation(["notifications", "unread-count"]);
          if (notif?.title) {
            toast.info(notif.title, {
              description: notif.message,
              duration: 5000,
            });
          }
          break;
        }

        case "NOTIFICATION_READ":
        case "NOTIFICATIONS_READ_ALL": {
          handleQueryInvalidation(["notifications"]);
          handleQueryInvalidation(["notifications", "unread-count"]);
          break;
        }

        case "APPLICATION_CREATED": {
          handleQueryInvalidation(["applications"]);
          handleQueryInvalidation(["admin", "stats"]);
          toast.success("Nouvelle candidature reçue !", {
            description: (payload.data as { jobTitle?: string })?.jobTitle
              ? `Pour le poste: ${(payload.data as { jobTitle?: string }).jobTitle}`
              : undefined,
          });
          break;
        }

        case "APPLICATION_STATUS_UPDATED": {
          const app = payload.data as { status?: string; jobTitle?: string };
          handleQueryInvalidation(["applications"]);
          handleQueryInvalidation(["candidate", "dashboard"]);
          handleQueryInvalidation(["admin", "stats"]);
          toast.info(`Statut de candidature mis à jour : ${app.status || ""}`, {
            description: app.jobTitle ? `Poste : ${app.jobTitle}` : undefined,
          });
          break;
        }

        case "MATCHING_PROGRESS_UPDATED": {
          handleQueryInvalidation(["matching-runs"]);
          break;
        }

        case "MATCHING_RUN_COMPLETED": {
          handleQueryInvalidation(["matching-runs"]);
          handleQueryInvalidation(["applications"]);
          toast.success("Calcul de matching IA terminé avec succès !");
          break;
        }

        case "INTERVIEW_SCHEDULED": {
          handleQueryInvalidation(["interviews"]);
          toast.info("Un entretien a été planifié.", {
            description: (payload.data as { jobTitle?: string })?.jobTitle,
          });
          break;
        }

        case "SCORECARD_SUBMITTED": {
          handleQueryInvalidation(["interviews"]);
          toast.success("Grille d'évaluation d'entretien soumise !");
          break;
        }

        default:
          break;
      }
    },
    [handleQueryInvalidation],
  );

  // Establish and manage WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated) return;

    const token = getAccessToken();
    if (!token) return;

    // Close any previous connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      const wsUrl = getWebSocketUrl(token);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Start Ping-Pong heartbeat every 25 seconds
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const payload: RealtimeEventPayload = JSON.parse(event.data);
          handleRealtimeEvent(payload);
        } catch {
          // Ignore invalid JSON payloads
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

        // Exponential backoff reconnection with random jitter
        if (isAuthenticated) {
          const attempts = reconnectAttemptsRef.current;
          const delay = Math.min(1000 * Math.pow(2, attempts) + Math.random() * 500, 30000);
          reconnectAttemptsRef.current += 1;

          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && isAuthenticated) {
              connectWebSocket();
            }
          }, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
    }
  }, [isAuthenticated, handleRealtimeEvent]);

  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated) {
      connectWebSocket();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setIsConnected(false);
    }

    return () => {
      isMountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [isAuthenticated, connectWebSocket]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
}
