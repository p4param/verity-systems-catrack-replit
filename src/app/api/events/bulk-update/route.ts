import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";
import { z } from "zod";

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  action: z.enum(["change_status", "assign_manager", "archive", "delete"]),
  payload: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_MANAGE");
    const tenantUuid = toCanonicalUuid(user.tenantId);
    const updaterUuid = toCanonicalUuid(user.sub);

    const body = await req.json();
    const { ids, action, payload } = BulkUpdateSchema.parse(body);

    const where = { id: { in: ids }, tenantId: tenantUuid, isDeleted: false };

    let updatedCount = 0;

    if (action === "change_status" && payload?.statusId) {
      const result = await prisma.cateringEvent.updateMany({
        where,
        data: { statusId: payload.statusId, updatedBy: updaterUuid },
      });
      updatedCount = result.count;
    } else if (action === "assign_manager" && payload?.managerId) {
      const result = await prisma.cateringEvent.updateMany({
        where,
        data: { managerId: payload.managerId, updatedBy: updaterUuid },
      });
      updatedCount = result.count;
    } else if (action === "archive" || action === "delete") {
      const result = await prisma.cateringEvent.updateMany({
        where,
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: updaterUuid },
      });
      updatedCount = result.count;
    } else {
      return NextResponse.json({ message: "Invalid action or missing payload" }, { status: 400 });
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_BULK_UPDATE_ERROR]", error);
    return NextResponse.json(
      { message: error.message || "Bad Request" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
