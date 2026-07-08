import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { authorizeEventAction, EventPermissionType } from "./index";

export function withAuth(
  handler: (req: Request, user: any) => Promise<Response>,
  requiredPermission: EventPermissionType
) {
  return async (req: Request) => {
    try {
      // 1. Authenticate and fetch general permissions
      const user = requirePermission(req, "INVENTORY_VIEW"); // Ensure valid user session

      // 2. Perform security authorization check
      authorizeEventAction(user, requiredPermission);

      // 3. Forward request to primary handler
      return await handler(req, user);
    } catch (error: any) {
      if (error instanceof Response) return error;
      console.error("[WITH_AUTH_SECURITY_MIDDLEWARE_ERROR]", error);
      return NextResponse.json(
        { message: error.message || "Unauthorized access blocked by Event Security Engine" },
        { status: error.status || 403 }
      );
    }
  };
}
