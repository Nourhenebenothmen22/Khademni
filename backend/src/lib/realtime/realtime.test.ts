import { describe, it, expect, vi } from "vitest";
import { realtimeEventBus } from "./event-bus.js";
import type { RealtimeEventPayload } from "./types.js";

describe("RealtimeEventBus", () => {
  it("should emit and receive typed realtime events in-memory", async () => {
    const receivedEvents: RealtimeEventPayload[] = [];

    const listener = (payload: RealtimeEventPayload) => {
      receivedEvents.push(payload);
    };

    realtimeEventBus.on("realtime:event", listener);

    realtimeEventBus.emitEvent({
      type: "NOTIFICATION_CREATED",
      data: { id: "notif-1", title: "Test Notification" },
      userId: "user-123",
    });

    realtimeEventBus.emitEvent({
      type: "APPLICATION_STATUS_UPDATED",
      data: { applicationId: "app-1", status: "INTERVIEW_SCHEDULED" },
      userId: "user-123",
      organizationId: "org-456",
    });

    expect(receivedEvents.length).toBe(2);
    expect(receivedEvents[0].type).toBe("NOTIFICATION_CREATED");
    expect(receivedEvents[0].userId).toBe("user-123");
    expect(receivedEvents[1].type).toBe("APPLICATION_STATUS_UPDATED");
    expect(receivedEvents[1].organizationId).toBe("org-456");

    realtimeEventBus.off("realtime:event", listener);
  });
});
