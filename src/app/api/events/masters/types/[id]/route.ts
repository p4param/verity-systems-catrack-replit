/**
 * @deprecated LEGACY — Event Type update/delete.
 * Superseded by Core MDE. Operational for backward compatibility only.
 * Do not reference this route in new code.
 */
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

const DEPRECATION_HEADER = { "X-Deprecated": "true" };

function systemUuid() { return "00000000-0000-0000-0000-000000000001"; }

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "INVENTORY_MASTER_UPDATE");
    const { id } = await params;
    const { name, code } = await req.json();
    const item = await prisma.cateringEventType.update({
      where: { id },
      data: { name, code: code?.toUpperCase(), updatedBy: systemUuid() },
    });
    return NextResponse.json(item, { headers: DEPRECATION_HEADER });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(req, "INVENTORY_MASTER_DELETE");
    const { id } = await params;
    await prisma.cateringEventType.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: systemUuid() },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
