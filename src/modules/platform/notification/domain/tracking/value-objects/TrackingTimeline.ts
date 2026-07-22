/**
 * EWP-006 Value Object — TrackingTimeline
 * Governed by CC-006, ES-008
 */

export interface TimelineEntryProps {
  eventId?: string;
  eventType: string;
  timestamp: Date;
  details?: Record<string, any> | null;
}

export class TimelineEntry {
  readonly eventId: string;
  readonly eventType: string;
  readonly timestamp: Date;
  readonly details: Record<string, any> | null;

  constructor(props: TimelineEntryProps) {
    if (!props.eventType || !props.eventType.trim()) {
      throw new Error("TimelineEntry eventType is required");
    }
    this.eventId = props.eventId || crypto.randomUUID();
    this.eventType = props.eventType.trim();
    this.timestamp = props.timestamp ? new Date(props.timestamp) : new Date();
    this.details = props.details ? { ...props.details } : null;
  }

  toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
    };
  }
}

export class TrackingTimeline {
  private readonly _entries: TimelineEntry[];

  constructor(initialEntries: (TimelineEntryProps | TimelineEntry)[] = []) {
    this._entries = initialEntries.map((e) =>
      e instanceof TimelineEntry ? e : new TimelineEntry(e)
    );
  }

  // --- Exclusive Value Object Methods (AR-016) ---

  public append(entry: TimelineEntryProps | TimelineEntry): TrackingTimeline {
    const newEntry = entry instanceof TimelineEntry ? entry : new TimelineEntry(entry);
    return new TrackingTimeline([...this._entries, newEntry]);
  }

  public entries(): TimelineEntry[] {
    return this._entries.map(
      (e) =>
        new TimelineEntry({
          eventId: e.eventId,
          eventType: e.eventType,
          timestamp: e.timestamp,
          details: e.details,
        })
    );
  }

  public latest(): TimelineEntry | null {
    if (this._entries.length === 0) return null;
    const last = this._entries[this._entries.length - 1];
    return new TimelineEntry({
      eventId: last.eventId,
      eventType: last.eventType,
      timestamp: last.timestamp,
      details: last.details,
    });
  }

  public count(): number {
    return this._entries.length;
  }

  public toJSON(): Record<string, any>[] {
    return this._entries.map((e) => e.toJSON());
  }

  public static fromJSON(jsonArray: any[]): TrackingTimeline {
    if (!Array.isArray(jsonArray)) return new TrackingTimeline([]);
    const entries = jsonArray.map(
      (item) =>
        new TimelineEntry({
          eventId: item.eventId,
          eventType: item.eventType,
          timestamp: new Date(item.timestamp),
          details: item.details,
        })
    );
    return new TrackingTimeline(entries);
  }
}
