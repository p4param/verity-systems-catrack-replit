import { prisma } from '@/lib/prisma';

// PM-WP04A — Vendor Recommendation Enhancement.
// The five domain operations, and only these five, may ever change
// `cat_vendor_ingredients.priority`. No endpoint anywhere accepts a raw
// priority number — that is a deliberate, stated architectural rule
// (PM-WP04 Engineering Package §2/§4), not an incidental omission.
//
// Every operation locks the full set of Vendor-Ingredient links for one
// Ingredient (`FOR UPDATE`) before reading or writing any of them, so
// two concurrent operations against the same Ingredient (e.g. two
// buyers promoting different Vendors at once) serialize correctly
// rather than racing — including Add To Ranking, whose own write looks
// simple (append one row) but still depends on reading a consistent
// MAX(priority) across the set.

// Not an explicit annotation on any function below — under this
// project's strict:false tsconfig, an explicit `Promise<OperationResult>`
// return-type annotation defeats control-flow narrowing on the `ok`
// discriminant at call sites (a confirmed tsc quirk, not a style
// choice). Every operation instead returns bare `{ ok: true as const }`
// / `{ ok: false as const, status, error }` literals and lets TypeScript
// infer the union fresh, exactly like the working precedent in
// POST /api/cat/purchase-orders/[id]/approve. This type documents the
// shape callers can rely on.
export type OperationResult = { ok: true } | { ok: false; status: number; error: string };

interface RankedLink {
  id: string;
  vendorId: string;
  priority: number | null;
}

async function fetchLinksForUpdate(tx: any, tenantId: string, ingredientId: string): Promise<RankedLink[]> {
  return tx.$queryRaw`
    SELECT id, vendor_id as "vendorId", priority
    FROM cat_vendor_ingredients
    WHERE tenant_id = ${tenantId}::uuid AND ingredient_id = ${ingredientId}::uuid
    ORDER BY priority ASC NULLS LAST
    FOR UPDATE
  `;
}

// Writes priority = 1, 2, 3, ... in the exact order given. Always
// writes every row rather than diffing against the prior value first —
// the ranked sets here are small (realistically well under 10 Vendors
// per Ingredient), so a few no-op writes cost nothing and this avoids
// any risk of a stale-comparison bug.
async function applyRankOrder(tx: any, userId: string, orderedLinks: RankedLink[]) {
  for (let i = 0; i < orderedLinks.length; i++) {
    await tx.$executeRaw`
      UPDATE cat_vendor_ingredients SET priority = ${i + 1}, updated_at = NOW(), updated_by = ${userId}::uuid
      WHERE id = ${orderedLinks[i].id}::uuid
    `;
  }
}

// Add To Ranking — the normal way a newly-linked Vendor enters the
// recommendation order: appended at the end, disturbing no one.
export async function addVendorToRanking(tenantId: string, userId: string, ingredientId: string, vendorId: string) {
  return prisma.$transaction(async (tx) => {
    const links = await fetchLinksForUpdate(tx, tenantId, ingredientId);
    const target = links.find((l) => l.vendorId === vendorId);
    if (!target) return { ok: false as const, status: 404, error: 'This Vendor does not supply this Ingredient.' };
    if (target.priority !== null) return { ok: false as const, status: 409, error: 'This Vendor already has a Priority.' };

    const maxPriority = links.reduce((max, l) => (l.priority !== null && l.priority > max ? l.priority : max), 0);
    await tx.$executeRaw`
      UPDATE cat_vendor_ingredients SET priority = ${maxPriority + 1}, updated_at = NOW(), updated_by = ${userId}::uuid
      WHERE id = ${target.id}::uuid
    `;
    return { ok: true as const };
  });
}

// Make Primary — jumps straight to Priority 1 from any state (No
// Recommendation or already ranked anywhere), cascading everyone else
// currently ranked down by one, preserving their relative order.
// Available for the exceptional case; Add To Ranking is the ordinary
// path for a newly-linked Vendor.
export async function makeVendorPrimary(tenantId: string, userId: string, ingredientId: string, vendorId: string) {
  return prisma.$transaction(async (tx) => {
    const links = await fetchLinksForUpdate(tx, tenantId, ingredientId);
    const target = links.find((l) => l.vendorId === vendorId);
    if (!target) return { ok: false as const, status: 404, error: 'This Vendor does not supply this Ingredient.' };
    if (target.priority === 1) return { ok: true as const }; // already Primary — no-op

    const otherRanked = links
      .filter((l) => l.id !== target.id && l.priority !== null)
      .sort((a, b) => (a.priority as number) - (b.priority as number));
    await applyRankOrder(tx, userId, [target, ...otherRanked]);
    return { ok: true as const };
  });
}

// Move Up / Move Down — a plain two-row swap with whoever holds the
// adjacent rank. Moving one step is mathematically identical to
// swapping with your neighbor, so this needs no cascade at all.
export async function moveVendorPriority(
  tenantId: string,
  userId: string,
  ingredientId: string,
  vendorId: string,
  direction: 'up' | 'down',
) {
  return prisma.$transaction(async (tx) => {
    const links = await fetchLinksForUpdate(tx, tenantId, ingredientId);
    const target = links.find((l) => l.vendorId === vendorId);
    if (!target) return { ok: false as const, status: 404, error: 'This Vendor does not supply this Ingredient.' };
    if (target.priority === null) return { ok: false as const, status: 409, error: 'This Vendor is not currently ranked — use Add To Ranking first.' };

    const ranked = links.filter((l) => l.priority !== null).sort((a, b) => (a.priority as number) - (b.priority as number));
    const idx = ranked.findIndex((l) => l.id === target.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ranked.length) {
      return { ok: false as const, status: 409, error: direction === 'up' ? 'This Vendor is already Priority 1.' : 'This Vendor is already at the lowest rank.' };
    }
    const other = ranked[swapIdx];
    await tx.$executeRaw`
      UPDATE cat_vendor_ingredients SET priority = ${other.priority}, updated_at = NOW(), updated_by = ${userId}::uuid WHERE id = ${target.id}::uuid
    `;
    await tx.$executeRaw`
      UPDATE cat_vendor_ingredients SET priority = ${target.priority}, updated_at = NOW(), updated_by = ${userId}::uuid WHERE id = ${other.id}::uuid
    `;
    return { ok: true as const };
  });
}

// Remove From Ranking — clears this Vendor's Priority back to No
// Recommendation and closes the gap for everyone still ranked. The
// Vendor-Ingredient link itself is untouched: it still appears in
// Supply Portfolio and can be re-ranked later via Make Primary or
// Add To Ranking.
export async function removeVendorFromRanking(tenantId: string, userId: string, ingredientId: string, vendorId: string) {
  return prisma.$transaction(async (tx) => {
    const links = await fetchLinksForUpdate(tx, tenantId, ingredientId);
    const target = links.find((l) => l.vendorId === vendorId);
    if (!target) return { ok: false as const, status: 404, error: 'This Vendor does not supply this Ingredient.' };
    if (target.priority === null) return { ok: false as const, status: 409, error: 'This Vendor is already not ranked.' };

    await tx.$executeRaw`
      UPDATE cat_vendor_ingredients SET priority = NULL, updated_at = NOW(), updated_by = ${userId}::uuid WHERE id = ${target.id}::uuid
    `;
    const remainingRanked = links
      .filter((l) => l.id !== target.id && l.priority !== null)
      .sort((a, b) => (a.priority as number) - (b.priority as number));
    await applyRankOrder(tx, userId, remainingRanked);
    return { ok: true as const };
  });
}

// Not one of the five named operations — a shared helper the
// Vendor-rooted DELETE (Remove Ingredient) route calls, in the same
// transaction as the row deletion, to close the ranking gap a removed
// link may have left. Same effect as Remove From Ranking, triggered by
// link deletion instead of an explicit ranking action.
export async function renumberAfterLinkRemoval(tx: any, tenantId: string, userId: string, ingredientId: string, removedLinkId: string): Promise<void> {
  const links: RankedLink[] = await tx.$queryRaw`
    SELECT id, vendor_id as "vendorId", priority FROM cat_vendor_ingredients
    WHERE tenant_id = ${tenantId}::uuid AND ingredient_id = ${ingredientId}::uuid AND id != ${removedLinkId}::uuid
    ORDER BY priority ASC NULLS LAST
    FOR UPDATE
  `;
  const ranked = links.filter((l) => l.priority !== null).sort((a, b) => (a.priority as number) - (b.priority as number));
  await applyRankOrder(tx, userId, ranked);
}
