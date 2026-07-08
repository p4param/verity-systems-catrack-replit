/**
 * @deprecated LEGACY — Event Statuses API.
 *
 * This route (GET/POST /api/events/masters/statuses) is a prototype-era implementation.
 * It is superseded by the Core Master Data Engine (MDE) at /api/masters/categories.
 *
 * STATUS: Operational but deprecated. The CateringEventStatus Prisma model still has
 * active FK relations from CateringEvent. Do NOT drop the table until MDE migration
 * and data transfer are complete.
 *
 * Migration target: /api/masters/categories?module=EVENT&key=EVENT_STATUS
 * Prisma model: CateringEventStatus → catering_event_statuses table
 */

import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

const DEPRECATION_HEADER = {
  "X-Deprecated": "true",
  "X-Deprecated-Reason": "Superseded by Core MDE at /api/masters/categories",
  "X-Migration-Target": "/api/masters/categories?module=EVENT&key=EVENT_STATUS",
};

function tenantUuid(tenantId: number) {
  return "00000000-0000-0000-0000-" + tenantId.toString().padStart(12, "0");
}
function systemUuid() { return "00000000-0000-0000-0000-000000000001"; }

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tid = tenantUuid(user.tenantId);
    const items = await prisma.cateringEventStatus.findMany({
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
    const tid = tenantUuid(user.tenantId);
    const { name, code } = await req.json();
    if (!name || !code) return NextResponse.json({ message: "name and code are required" }, { status: 400 });
    const item = await prisma.cateringEventStatus.create({
      data: { tenantId: tid, companyId: tid, branchId: tid, name, code: code.toUpperCase(), createdBy: systemUuid(), updatedBy: systemUuid() },
    });
    return NextResponse.json(item, { status: 201, headers: DEPRECATION_HEADER });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
