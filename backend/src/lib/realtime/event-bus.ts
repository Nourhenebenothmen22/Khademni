import { EventEmitter } from "node:events";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../logger.js";
import { getRedisOptions } from "../redis.js";
import type { RealtimeEventPayload } from "./types.js";

const REDIS_CHANNEL = "khademni:realtime:events";

class RealtimeEventBus extends EventEmitter {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isRedisActive = false;

  constructor() {
    super();
    this.initRedis();
  }

  private initRedis(): void {
    if (!env.REDIS_URL) return;

    try {
      this.publisher = new Redis(env.REDIS_URL, getRedisOptions());
      this.subscriber = new Redis(env.REDIS_URL, getRedisOptions());

      this.subscriber.subscribe(REDIS_CHANNEL, (err) => {
        if (err) {
          logger.warn({ err: err.message }, "Failed to subscribe to Redis realtime channel.");
          return;
        }
        this.isRedisActive = true;
        logger.info("RealtimeEventBus subscribed to Redis Pub/Sub cluster.");
      });

      this.subscriber.on("message", (channel, message) => {
        if (channel === REDIS_CHANNEL) {
          try {
            const payload: RealtimeEventPayload = JSON.parse(message);
            // Emit locally for websocket-server to dispatch to connected clients
            super.emit("realtime:event", payload);
          } catch (e: unknown) {
            logger.error({ err: (e as Error).message }, "Error parsing realtime event from Redis Pub/Sub");
          }
        }
      });
    } catch (err: unknown) {
      logger.warn({ err: (err as Error).message }, "Redis Pub/Sub initialization skipped, using in-memory EventBus.");
    }
  }

  /**
   * Broadcast an event to the realtime bus (published to Redis or emitted in-memory).
   */
  public emitEvent<T = unknown>(payload: Omit<RealtimeEventPayload<T>, "timestamp">): void {
    const fullPayload: RealtimeEventPayload<T> = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    if (this.isRedisActive && this.publisher) {
      this.publisher.publish(REDIS_CHANNEL, JSON.stringify(fullPayload)).catch((err) => {
        logger.error({ err: err.message }, "Failed to publish realtime event to Redis");
        // Fallback to local emit
        super.emit("realtime:event", fullPayload);
      });
    } else {
      super.emit("realtime:event", fullPayload);
    }
  }
}

export const realtimeEventBus = new RealtimeEventBus();
