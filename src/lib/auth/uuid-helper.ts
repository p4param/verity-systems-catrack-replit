/**
 * UUID Helper — Auth Layer
 *
 * VS05Z: User.id is now a real UUID (String @db.Uuid via gen_random_uuid()).
 * This function is now a simple identity passthrough for UUID strings.
 *
 * Kept for backward compatibility with code that imported it, but no longer
 * performs any integer-to-UUID conversion. The workaround is permanently gone.
 *
 * @deprecated The numeric-to-UUID mapping is no longer needed.
 *             Code that calls this can now pass actorUserId directly.
 */
export function formatUserIdToUuid(userId: string): string {
  return userId;
}
