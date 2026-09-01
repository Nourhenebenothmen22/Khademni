import type { Server as HttpServer, IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseUrl } from "node:url";
import { verifyAccessToken } from "../jwt.js";
import { logger } from "../logger.js";
import { realtimeEventBus } from "./event-bus.js";
import type { AuthenticatedWebSocket, RealtimeEventPayload } from "./types.js";

const HEARTBEAT_INTERVAL_MS = 25000;

export function initWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
  });

  const rooms = new Map<string, Set<AuthenticatedWebSocket>>();

  function joinRoom(room: string, socket: AuthenticatedWebSocket) {
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room)!.add(socket);
    socket.rooms.add(room);
  }

  function leaveAllRooms(socket: AuthenticatedWebSocket) {
    for (const room of socket.rooms) {
      const set = rooms.get(room);
      if (set) {
        set.delete(socket);
        if (set.size === 0) {
          rooms.delete(room);
        }
      }
    }
    socket.rooms.clear();
  }

  function broadcastToRoom(room: string, payload: RealtimeEventPayload) {
    const clients = rooms.get(room);
    if (!clients || clients.size === 0) return;

    const message = JSON.stringify(payload);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // Handle HTTP Upgrade requests
  httpServer.on("upgrade", async (request: IncomingMessage, socket, head) => {
    try {
      const { pathname, query } = parseUrl(request.url || "", true);

      if (pathname !== "/ws" && pathname !== "/api/v1/ws") {
        socket.destroy();
        return;
      }

      // Extract JWT from query string ?token=... or authorization header
      let token = (query.token as string) || "";
      if (!token && request.headers.authorization?.startsWith("Bearer ")) {
        token = request.headers.authorization.substring(7);
      }

      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const decoded = await verifyAccessToken(token);
      if (!decoded.userId || decoded.isMfaPending) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        const authSocket = ws as AuthenticatedWebSocket;
        authSocket.isAlive = true;
        authSocket.userId = decoded.userId;
        authSocket.role = decoded.role;
        authSocket.organizationId = decoded.organizationId;
        authSocket.rooms = new Set();

        wss.emit("connection", authSocket, request);
      });
    } catch (err: unknown) {
      logger.warn({ err: (err as Error).message }, "WebSocket upgrade failed verification");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  // Client connection handler
  wss.on("connection", (socket: AuthenticatedWebSocket) => {
    logger.info(
      { userId: socket.userId, role: socket.role, orgId: socket.organizationId },
      "WebSocket client connected and authenticated",
    );

    // Auto-join user room
    if (socket.userId) {
      joinRoom(`user:${socket.userId}`, socket);
    }

    // Auto-join tenant room if organization admin
    if (socket.organizationId && socket.role === "ORGANIZATION_ADMIN") {
      joinRoom(`tenant:${socket.organizationId}`, socket);
    }

    // Join public broadcast room
    joinRoom("public:jobs", socket);

    // Heartbeat handling
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore unparseable client messages
      }
    });

    socket.on("close", () => {
      leaveAllRooms(socket);
    });

    socket.on("error", (err) => {
      logger.error({ err: err.message, userId: socket.userId }, "WebSocket client error");
      leaveAllRooms(socket);
    });

    // Send initial connected acknowledgement
    socket.send(
      JSON.stringify({
        type: "CONNECTED",
        data: {
          userId: socket.userId,
          role: socket.role,
          organizationId: socket.organizationId,
        },
        timestamp: new Date().toISOString(),
      }),
    );
  });

  // Periodic Heartbeat Interval (Ping)
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      const authWs = ws as AuthenticatedWebSocket;
      if (authWs.isAlive === false) {
        leaveAllRooms(authWs);
        authWs.terminate();
        continue;
      }
      authWs.isAlive = false;
      authWs.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => {
    clearInterval(interval);
  });

  // Forward RealtimeEventBus events to WebSocket clients
  realtimeEventBus.on("realtime:event", (payload: RealtimeEventPayload) => {
    if (payload.userId) {
      broadcastToRoom(`user:${payload.userId}`, payload);
    } else if (payload.organizationId) {
      broadcastToRoom(`tenant:${payload.organizationId}`, payload);
    } else {
      broadcastToRoom("public:jobs", payload);
    }
  });

  return wss;
}
