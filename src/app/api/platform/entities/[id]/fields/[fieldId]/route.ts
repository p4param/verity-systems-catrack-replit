import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { FieldService } from "@/modules/platform/configuration/services/field-service";

const service = new FieldService();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const user = requirePermission(req, "PLATFORM_FIELD_EDIT");
    const body = await req.json();
    const fieldId = (await params).fieldId;

    const updated = await service.updateField(fieldId, body, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const user = requirePermission(req, "PLATFORM_FIELD_DELETE");
    const fieldId = (await params).fieldId;

    const deleted = await service.deleteField(fieldId, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: deleted });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
