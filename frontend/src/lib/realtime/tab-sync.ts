import type { TabSyncMessage } from "./types";

class TabSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(message: TabSyncMessage) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("khademni_tab_sync");
        this.channel.onmessage = (event: MessageEvent<TabSyncMessage>) => {
          if (event.data) {
            this.listeners.forEach((listener) => listener(event.data));
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  public broadcast(message: TabSyncMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch {
        // Fallback or ignore
      }
    }
  }

  public subscribe(listener: (message: TabSyncMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const tabSyncManager = new TabSyncManager();
