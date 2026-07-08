import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";

export async function GET(req: Request) {
  try {
    requirePermission(req, "INVENTORY_VIEW");

    // Return empty list as placeholder for recurring event templates
    return NextResponse.json([]);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_CALENDAR_RECURRING_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
