import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = "00000000-0000-0000-0000-" + user.tenantId.toString().padStart(12, "0");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const where = { tenantId: tenantUuid, isDeleted: false };

    const [
      totalEvents,
      todayEvents,
      upcomingEvents,
      allWithCosting,
    ] = await Promise.all([
      prisma.cateringEvent.count({ where }),
      prisma.cateringEvent.count({ where: { ...where, startDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.cateringEvent.count({ where: { ...where, startDate: { gt: todayEnd } } }),
      prisma.cateringEvent.findMany({
        where,
        include: { costing: { select: { invoiceTotal: true, amountPaid: true } } },
      }),
    ]);

    let revenueThisMonth = 0;
    let pendingPayments = 0;
    let overduePayments = 0;

    for (const ev of allWithCosting) {
      const evStart = new Date(ev.startDate);
      const invoice = Number(ev.costing?.invoiceTotal || ev.budgetAmount || 0);
      const paid = Number(ev.costing?.amountPaid || 0);
      const balance = invoice - paid;

      if (evStart >= monthStart && evStart <= monthEnd) {
        revenueThisMonth += invoice;
      }
      if (balance > 0) {
        if (evStart < now) {
          overduePayments += balance;
        } else {
          pendingPayments += balance;
        }
      }
    }

    const eventsRequiringAttention = allWithCosting.filter((ev) => {
      const isPast = new Date(ev.endDate) < now;
      const hasPendingBalance =
        Number(ev.costing?.invoiceTotal || ev.budgetAmount) - Number(ev.costing?.amountPaid || 0) > 0;
      return isPast && hasPendingBalance;
    }).length;

    const statusCounts = allWithCosting.reduce(
      (acc: Record<string, number>, ev) => {
        acc[ev.statusId] = (acc[ev.statusId] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      totalEvents,
      todayEvents,
      upcomingEvents,
      revenueThisMonth,
      pendingPayments,
      overduePayments,
      eventsRequiringAttention,
      eventsByStatus: statusCounts,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_DASHBOARD_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
