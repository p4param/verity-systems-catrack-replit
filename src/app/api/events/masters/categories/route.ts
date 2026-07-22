/**
 * @deprecated LEGACY — Event Categories API.
 *
 * This route (GET/POST /api/events/masters/categories) is a prototype-era implementation.
 * It is superseded by the Core Master Data Engine (MDE) at /api/masters/categories.
 *
 * STATUS: Operational but deprecated. The CateringEventCategory Prisma model exists
 * but has no active FK relation from CateringEvent currently (category is optional).
 * Still keep route live for UI backward compat during transition.
 *
 * Migration target: /api/masters/categories?module=EVENT&key=EVENT_CATEGORY
 * Prisma model: CateringEventCategory → catering_event_categories table
 */

import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

const DEPRECATION_HEADER = {
  "X-Deprecated": "true",
  "X-Deprecated-Reason": "Superseded by Core MDE at /api/masters/categories",
  "X-Migration-Target": "/api/masters/categories?module=EVENT&key=EVENT_CATEGORY",
};

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tid = toCanonicalUuid(user.tenantId);
    const items = await prisma.cateringEventCategory.findMany({
      where: { tenantId: tid, isDeleted: false },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items, { headers: DEPRECATION_HEADER });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_MASTER_CREATE");
    const tid = toCanonicalUuid(user.tenantId);
    const userId = toCanonicalUuid(user.sub);
    const { name, code } = await req.json();
    if (!name || !code) return NextResponse.json({ message: "name and code are required" }, { status: 400 });
    const item = await prisma.cateringEventCategory.create({
      data: { tenantId: tid, companyId: tid, branchId: tid, name, code: code.toUpperCase(), createdBy: userId, updatedBy: userId },
    });
    return NextResponse.json(item, { status: 201, headers: DEPRECATION_HEADER });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
