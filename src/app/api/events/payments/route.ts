import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";

export async function GET(req: Request) {
  try {
    requirePermission(req, "INVENTORY_VIEW");
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const paymentsData = [
      {
        id: "1",
        eventId: eventId || "1",
        amount: 1500.0,
        method: "CREDIT_CARD",
        transactionId: "ch_12345abcde",
        paidAt: new Date(),
      }
    ];

    return NextResponse.json(paymentsData);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_PAYMENTS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
