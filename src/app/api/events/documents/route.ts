import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";

export async function GET(req: Request) {
  try {
    requirePermission(req, "INVENTORY_VIEW");
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const documentsData = [
      {
        id: "1",
        eventId: eventId || "1",
        name: "Standard BEO Checklist.pdf",
        filePath: "/uploads/beo-standard.pdf",
        fileSize: 102456,
        createdAt: new Date(),
      },
      {
        id: "2",
        eventId: eventId || "1",
        name: "Quotation v2 - Confirmed.pdf",
        filePath: "/uploads/quote-v2.pdf",
        fileSize: 456012,
        createdAt: new Date(),
      }
    ];

    return NextResponse.json(documentsData);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_DOCUMENTS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
