/**
 * Domain Events for YoungSharkJobHunter
 *
 * A lightweight in-memory event bus for decoupled communication
 * between domain services. Events are emitted synchronously and
 * listeners are called in registration order.
 */

// ─── Event Type Constants ───────────────────────────────────────────────────

export const DomainEvents = {
  JOB_DISCOVERED: 'job:discovered',
  JOB_MATCH_SCORED: 'job:match_scored',
  RESUME_PARSED: 'resume:parsed',
  RESUME_GENERATED: 'resume:generated',
  APPLICATION_STATUS_CHANGED: 'application:status_changed',
  INTERVIEW_SCHEDULED: 'interview:scheduled',
  SCRAPING_COMPLETED: 'scraping:completed',
  SKILL_GAP_DETECTED: 'skill:gap_detected',
} as const;

export type DomainEventType = (typeof DomainEvents)[keyof typeof DomainEvents];

// ─── Types ──────────────────────────────────────────────────────────────────

export type EventCallback = (payload: Record<string, unknown>) => void;

interface ListenerEntry {
  callback: EventCallback;
  once: boolean;
}

// ─── EventBus Implementation ────────────────────────────────────────────────

class EventBus {
  private listeners: Map<string, ListenerEntry[]> = new Map();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const entry: ListenerEntry = { callback, once: false };
    this.listeners.get(event)!.push(entry);

    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event, but only fire once then auto-unsubscribe.
   */
  once(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const entry: ListenerEntry = { callback, once: true };
    this.listeners.get(event)!.push(entry);

    return () => this.off(event, callback);
  }

  /**
   * Emit an event to all registered listeners.
   */
  emit(event: string, payload: Record<string, unknown> = {}): void {
    const entries = this.listeners.get(event);
    if (!entries || entries.length === 0) return;

    // Copy to avoid mutation issues during iteration
    const snapshot = [...entries];
    const toRemove: EventCallback[] = [];

    for (const entry of snapshot) {
      try {
        entry.callback(payload);
        if (entry.once) {
          toRemove.push(entry.callback);
        }
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${event}":`, error);
      }
    }

    // Clean up one-time listeners
    if (toRemove.length > 0) {
      const remaining = entries.filter(
        (e) => !toRemove.includes(e.callback)
      );
      if (remaining.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, remaining);
      }
    }
  }

  /**
   * Remove a specific listener for an event.
   */
  off(event: string, callback: EventCallback): void {
    const entries = this.listeners.get(event);
    if (!entries) return;

    const filtered = entries.filter((e) => e.callback !== callback);

    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if no event is specified.
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the count of listeners for a specific event.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * Get all registered event names.
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const eventBus = new EventBus();