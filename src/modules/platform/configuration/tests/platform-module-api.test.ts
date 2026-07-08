import { GET, POST } from "@/app/api/platform/modules/route";
import { PlatformModuleService } from "../services/platform-module-service";
import { requirePermission } from "@/lib/auth/auth-guard";
import { NextResponse } from "next/server";

jest.mock("../services/platform-module-service");
jest.mock("@/lib/auth/auth-guard");

describe("Platform Modules API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET modules returns platform modules lists", async () => {
    const mockUser = { sub: 1, tenantId: 1, permissions: ["PLATFORM_MODULE_VIEW"] };
    (requirePermission as jest.Mock).mockReturnValue(mockUser);

    const mockModules = [{ code: "CRM", name: "CRM" }];
    const serviceMock = PlatformModuleService.prototype.getAll as jest.Mock;
    serviceMock.mockResolvedValue(mockModules);

    const req = new Request("http://localhost/api/platform/modules");
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockModules);
  });
});
