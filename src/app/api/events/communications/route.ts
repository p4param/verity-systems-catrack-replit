import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";

export async function GET(req: Request) {
  try {
    requirePermission(req, "INVENTORY_VIEW");
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const communicationsData = [
      {
        id: "1",
        eventId: eventId || "1",
        channel: "EMAIL",
        recipient: "client@example.com",
        subject: "Your Event Quotation Confirmation",
        content: "Dear Client, please find attached the confirmed quotation.",
        createdAt: new Date(),
      },
      {
        id: "2",
        eventId: eventId || "1",
        channel: "WHATSAPP",
        recipient: "+1234567890",
        content: "Hi! Your event booking is now planning ready. We look forward to serving you.",
        createdAt: new Date(),
      }
    ];

    return NextResponse.json(communicationsData);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_COMMUNICATIONS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
