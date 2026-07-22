import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = toCanonicalUuid(user.tenantId);
    const body = await req.json();

    const { ids, format } = body as { ids?: string[]; format: string };

    const where: any = { tenantId: tenantUuid, isDeleted: false };
    if (ids && ids.length > 0) where.id = { in: ids };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (await prisma.cateringEvent.findMany({
      where,
      include: {
        status: { select: { name: true } },
        type: { select: { name: true } },
        priority: { select: { name: true } },
        costing: { select: { invoiceTotal: true, amountPaid: true } as any },
      } as any,
      orderBy: { startDate: "desc" },
    })) as any[];

    if (format === "csv") {
      const headers = [
        "Event No",
        "Name",
        "Status",
        "Type",
        "Priority",
        "Start Date",
        "End Date",
        "Guests",
        "Budget",
        "Invoice Total",
        "Amount Paid",
        "Balance Due",
        "Created At",
      ].join(",");

      const rows = events.map((e) => {
        const invoice = Number(e.costing?.invoiceTotal ?? e.budgetAmount);
        const paid = Number(e.costing?.amountPaid ?? 0);
        return [
          e.eventNumber,
          `"${e.name.replace(/"/g, '""')}"`,
          e.status?.name ?? "",
          e.type?.name ?? "",
          e.priority?.name ?? "",
          new Date(e.startDate).toISOString().split("T")[0],
          new Date(e.endDate).toISOString().split("T")[0],
          e.guestCount,
          invoice.toFixed(2),
          invoice.toFixed(2),
          paid.toFixed(2),
          (invoice - paid).toFixed(2),
          new Date(e.createdAt).toISOString().split("T")[0],
        ].join(",");
      });

      const csv = [headers, ...rows].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="events-export-${Date.now()}.csv"`,
        },
      });
    }

    // JSON export fallback
    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_EXPORT_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
