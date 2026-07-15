/**
 * CM-003 Runtime Data Engine — Default Entity Behavior (No-Op)
 *
 * Default implementation of IEntityBehavior used for all entities
 * that do not have a custom behavior registered.
 *
 * All methods are pass-through — no modifications made, no side effects.
 *
 * Standards: ES-008
 */
import type { IEntityBehavior } from "./IEntityBehavior";
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { PersistenceExecutionContext } from "../types/PersistenceExecutionContext";
import type { RuntimeRecord } from "../types/RuntimeRecord";

export class DefaultEntityBehavior implements IEntityBehavior {
  async beforeValidate(
    _manifest: RuntimeManifest,
    payload: Record<string, any>,
    _ctx: PersistenceExecutionContext
  ): Promise<Record<string, any>> {
    return payload;
  }

  async beforeSave(
    _manifest: RuntimeManifest,
    payload: Record<string, any>,
    _ctx: PersistenceExecutionContext
  ): Promise<Record<string, any>> {
    return payload;
  }

  async afterSave(
    _manifest: RuntimeManifest,
    _record: RuntimeRecord,
    _ctx: PersistenceExecutionContext
  ): Promise<void> {
    // No-op
  }

  async beforeDelete(
    _manifest: RuntimeManifest,
    _recordId: string,
    _ctx: PersistenceExecutionContext
  ): Promise<void> {
    // No-op
  }
}

/** Singleton default behavior for entities without custom behaviors. */
export const defaultEntityBehavior = new DefaultEntityBehavior();
