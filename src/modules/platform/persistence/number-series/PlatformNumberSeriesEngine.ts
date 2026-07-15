/**
 * CM-003 Runtime Data Engine — Platform Number Series Engine (VS05H Stub)
 *
 * VS05H implementation of INumberSeriesEngine.
 * Uses the platform_record_sequences table for atomic, collision-free sequence generation.
 *
 * This stub generates: PREFIX-000001, PREFIX-000002, …
 * CM-004 will replace this with full formatting, fiscal-year resets, and
 * branch-level sequence isolation.
 *
 * Eliminates the legacy EAV dependency in NumberGeneratorService
 * (previously used entityRecord.findFirst() for numbering).
 *
 * Standards: ES-008
 */
import { prisma } from "@/lib/prisma";
import type { INumberSeriesEngine, NumberSeriesConfig } from "./INumberSeriesEngine";

export class PlatformNumberSeriesEngine implements INumberSeriesEngine {
  /**
   * Generates the next sequence number for an entity using an atomic UPSERT.
   * Thread-safe: database upsert + increment is atomic.
   */
  async generate(
    entityId: string,
    entityCode: string,
    config?: NumberSeriesConfig,
    tx?: any
  ): Promise<string> {
    const db = tx ?? prisma;

    // Derive prefix from config or entity code
    const prefix = config?.prefix ?? this.derivePrefix(entityCode);
    const padLength = config?.sequenceLength ?? 6;

    // Atomic upsert + increment
    const seq = await db.platformRecordSequence.upsert({
      where: { entityId },
      create: {
        entityId,
        prefix,
        lastValue: 1,
      },
      update: {
        lastValue: { increment: 1 },
      },
    });

    const paddedSeq = seq.lastValue.toString().padStart(padLength, "0");
    return `${prefix}-${paddedSeq}`;
  }

  /**
   * Derives a short prefix from an entity code.
   * Examples: "DEPARTMENT" → "DEP", "INCIDENT" → "INC", "PURCHASE_ORDER" → "PO"
   *
   * VS05H: uses first 3 uppercase letters.
   * CM-004: configurable per entity in manifest.numberSeries.prefix.
   */
  private derivePrefix(entityCode: string): string {
    const clean = entityCode.replace(/_/g, " ").trim().toUpperCase();
    const words = clean.split(" ");
    if (words.length >= 2) {
      // Multi-word: use initials (e.g., "PURCHASE ORDER" → "PO")
      return words.map(w => w[0]).join("").substring(0, 4);
    }
    // Single word: first 3 characters (e.g., "DEPARTMENT" → "DEP")
    return clean.substring(0, 3);
  }
}
