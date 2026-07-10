import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { FIELD_CATALOG } from "@/modules/platform/configuration/constants/field-catalog";

export async function GET(req: Request) {
  try {
    requirePermission(req, "PLATFORM_FIELD_VIEW");
    return NextResponse.json({ success: true, data: FIELD_CATALOG });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
