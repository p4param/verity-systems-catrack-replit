import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_UPDATE");
    
    // Clear next.js navigation cache tag
    revalidateTag("navigation");
    
    return NextResponse.json({ success: true, message: "Runtime cache refreshed successfully" });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
