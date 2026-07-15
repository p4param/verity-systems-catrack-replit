import { NextResponse } from "next/server";
import { DashboardSnapshotJob } from "@/lib/inventory/dashboard/dashboard-snapshot-job";

const INTERNAL_SECRET = process.env.INTERNAL_JOB_SECRET;

/**
 * POST /api/internal/jobs/dashboard-snapshot
 *
 * Triggers the nightly DashboardSnapshotJob.
 * Protected by X-Internal-Secret header.
 *
 * Body (optional):
 *   { tenantId: number }  — run for a specific tenant only
 *   {}                    — run for ALL active tenants
 *
 * Set INTERNAL_JOB_SECRET in .env to enable this endpoint.
 * Call this from a cron job (Vercel Cron, GitHub Actions, etc.) nightly.
 */
export async function POST(req: Request) {
    // ── Security check ─────────────────────────────────────────────────────────
    if (!INTERNAL_SECRET) {
        return NextResponse.json(
            { message: "Internal jobs are not configured (INTERNAL_JOB_SECRET missing)." },
            { status: 503 }
        );
    }

    const providedSecret = req.headers.get("x-internal-secret");
    if (providedSecret !== INTERNAL_SECRET) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        let body: { tenantId?: number } = {};
        try {
            body = await req.json();
        } catch {
            // Body is optional
        }

        if (body.tenantId !== undefined) {
            // Single tenant run
            const result = await DashboardSnapshotJob.run(String(body.tenantId));
            return NextResponse.json({ success: true, result });
        } else {
            // All tenants run
            const result = await DashboardSnapshotJob.runForAllTenants();
            return NextResponse.json({ success: true, result });
        }
    } catch (error) {
        console.error("[DASHBOARD_SNAPSHOT_JOB_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Job failed" },
            { status: 500 }
        );
    }
}
