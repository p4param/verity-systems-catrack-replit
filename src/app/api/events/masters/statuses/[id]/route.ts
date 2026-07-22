/**
 * @deprecated LEGACY — Event Status update/delete.
 * Superseded by Core MDE. Operational for backward compatibility only.
 * Do not reference this route in new code.
 */
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

const DEPRECATION_HEADER = { "X-Deprecated": "true" };

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "INVENTORY_MASTER_UPDATE");
    const tid = toCanonicalUuid(user.tenantId);
    const userId = toCanonicalUuid(user.sub);
    const { id } = await params;
    const { name, code } = await req.json();

    const existing = await prisma.cateringEventStatus.findFirst({
      where: { id, tenantId: tid, isDeleted: false }
    });
    if (!existing) {
      return NextResponse.json({ message: "Master record not found or access denied" }, { status: 404 });
    }

    const item = await prisma.cateringEventStatus.update({
      where: { id: existing.id },
      data: { name, code: code?.toUpperCase(), updatedBy: userId },
    });
    return NextResponse.json(item, { headers: DEPRECATION_HEADER });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "INVENTORY_MASTER_DELETE");
    const tid = toCanonicalUuid(user.tenantId);
    const userId = toCanonicalUuid(user.sub);
    const { id } = await params;

    const existing = await prisma.cateringEventStatus.findFirst({
      where: { id, tenantId: tid, isDeleted: false }
    });
    if (!existing) {
      return NextResponse.json({ message: "Master record not found or access denied" }, { status: 404 });
    }

    await prisma.cateringEventStatus.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
