import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StructuredLogger } from "@/modules/events/utils/logger";

export async function GET() {
  const healthStatus = {
    status: "UP",
    timestamp: new Date().toISOString(),
    services: {
      database: "UNKNOWN",
    },
  };

  try {
    // 1. Run basic DB raw query to test database connection health
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.services.database = "UP";
  } catch (error) {
    healthStatus.status = "DOWN";
    healthStatus.services.database = "DOWN";
    StructuredLogger.error("Health Check: Database service is down", error);
  }

  const statusCode = healthStatus.status === "UP" ? 200 : 503;
  return NextResponse.json(healthStatus, { status: statusCode });
}
