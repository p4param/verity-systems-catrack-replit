// Unit tests for WorkspaceInstallationRepository (mocked Prisma)
// Profile: smoke — no DB connection required

import { WorkspaceInstallationRepository } from "../repositories/WorkspaceInstallationRepository";
import {
  DuplicateWorkspaceInstallationError,
  InstallationWorkspaceNotFoundError,
  InstallationPackageNotFoundError,
  WorkspaceInstallationConcurrencyError,
} from "../domain/WorkspaceInstallationErrors";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";
import type { WorkspaceInstallationRecord } from "../models/WorkspaceInstallationModels";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: jest.fn(),
    workspaceInstallation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  workspaceInstallation: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const PACKAGE_ID = "00000000-0000-0000-0000-000000000020";
const INSTALLATION_ID = "00000000-0000-0000-0000-000000000030";
const ACTOR = "00000000-0000-0000-0000-000000000002";

function makeRecord(
  overrides: Partial<WorkspaceInstallationRecord> = {}
): WorkspaceInstallationRecord {
  return {
    id: INSTALLATION_ID,
    workspaceId: WORKSPACE_ID,
    packageId: PACKAGE_ID,
    status: WORKSPACE_INSTALLATION_STATUS.Installing,
    installedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    createdBy: ACTOR,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    updatedBy: ACTOR,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
    ...overrides,
  };
}

let repo: WorkspaceInstallationRepository;

beforeEach(() => {
  repo = new WorkspaceInstallationRepository();
  jest.clearAllMocks();
});

describe("install()", () => {
  test("calls $executeRaw with INSERT", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.install(makeRecord());
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("translates P2002 to DuplicateWorkspaceInstallationError", async () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["workspace_id", "application_package_id"] },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.install(makeRecord())).rejects.toThrow(
      DuplicateWorkspaceInstallationError
    );
  });

  test("translates FK P2003 on workspace to InstallationWorkspaceNotFoundError", async () => {
    const err = Object.assign(new Error("FK constraint tenant_workspaces"), {
      code: "P2003",
      message: "foreign key constraint tenant_workspaces",
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.install(makeRecord())).rejects.toThrow(
      InstallationWorkspaceNotFoundError
    );
  });

  test("translates FK P2003 on package to InstallationPackageNotFoundError", async () => {
    const err = Object.assign(new Error("FK constraint platform_application_packages"), {
      code: "P2003",
      message: "foreign key constraint platform_application_packages",
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.install(makeRecord())).rejects.toThrow(
      InstallationPackageNotFoundError
    );
  });
});

describe.each([
  ["completeInstallation", "Installed"],
  ["suspend", "Suspended"],
  ["resume", "Installed"],
  ["uninstall", "Uninstalled"],
] as const)("%s()", (method, status) => {
  test(`calls $executeRaw for ${method}`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await (repo as any)[method](INSTALLATION_ID, ACTOR, 1n);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test(`throws WorkspaceInstallationConcurrencyError when 0 rows affected`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect((repo as any)[method](INSTALLATION_ID, ACTOR, 1n)).rejects.toThrow(
      WorkspaceInstallationConcurrencyError
    );
  });
});

describe("getById()", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    mockPrisma.workspaceInstallation.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getById(INSTALLATION_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(INSTALLATION_ID);
  });

  test("returns null when not found", async () => {
    mockPrisma.workspaceInstallation.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getById(INSTALLATION_ID);
    expect(result).toBeNull();
  });
});

describe("getByWorkspaceAndPackage()", () => {
  test("queries by workspaceId and packageId", async () => {
    const record = makeRecord();
    mockPrisma.workspaceInstallation.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getByWorkspaceAndPackage(WORKSPACE_ID, PACKAGE_ID);
    expect(result).not.toBeNull();
    const call = mockPrisma.workspaceInstallation.findFirst.mock.calls[0]![0];
    expect(call.where.workspaceId).toBe(WORKSPACE_ID);
    expect(call.where.packageId).toBe(PACKAGE_ID);
  });
});

describe("listByWorkspace()", () => {
  test("returns records filtered by workspaceId", async () => {
    mockPrisma.workspaceInstallation.findMany.mockResolvedValueOnce([makeRecord()]);
    const results = await repo.listByWorkspace({ workspaceId: WORKSPACE_ID });
    expect(results).toHaveLength(1);
    const call = mockPrisma.workspaceInstallation.findMany.mock.calls[0]![0];
    expect(call.where.workspaceId).toBe(WORKSPACE_ID);
  });
});

describe("existsInstallation()", () => {
  test("returns true when count > 0", async () => {
    mockPrisma.workspaceInstallation.count.mockResolvedValueOnce(1);
    expect(await repo.existsInstallation(WORKSPACE_ID, PACKAGE_ID)).toBe(true);
  });

  test("returns false when count === 0", async () => {
    mockPrisma.workspaceInstallation.count.mockResolvedValueOnce(0);
    expect(await repo.existsInstallation(WORKSPACE_ID, PACKAGE_ID)).toBe(false);
  });
});
