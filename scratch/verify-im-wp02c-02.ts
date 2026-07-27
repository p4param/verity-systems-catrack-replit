import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth/jwt";
import { GET, POST } from "@/app/api/cat/inquiries/[id]/discovery/route";

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const record = await prisma.$queryRaw<Array<{ id: string; tenant_id: string }>>`
    SELECT id, tenant_id
    FROM cat_inquiries
    WHERE is_deleted = false
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const inquiry = record[0];
  if (!inquiry) {
    throw new Error("No inquiry record available for verification.");
  }

  const token = signJwt({
    sub: "00000000-0000-0000-0000-000000000001",
    tenantId: inquiry.tenant_id,
    email: "qa@verity.local",
    roles: ["ADMIN"],
    permissions: [],
    mfaEnabled: false,
  });

  const params = { params: Promise.resolve({ id: inquiry.id }) } as any;

  const existingSaveRequest = new NextRequest(
    `http://localhost/api/cat/inquiries/${inquiry.id}/discovery`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        areaKey: "VENUE",
        lifecycle: "IN_PROGRESS",
        validation: "READY",
        summary: "Venue selected from existing references.",
        venueDiscovery: {
          selectionMode: "EXISTING",
          existingVenueId: "The Grand Ballroom",
          existingVenueName: "The Grand Ballroom",
          venueType: "BANQUET_HALL",
          venueFinalizationStatus: "CONFIRMED",
          knowledge: {
            kitchenAvailable: "YES",
            powerAvailable: "YES",
            outdoorSetup: "UNKNOWN",
            parkingConstraints: "NO",
            loadingRestrictions: "UNKNOWN",
            siteVisitRequired: "NO",
          },
          additionalNotes: "Customer prefers evening setup.",
          businessSummary: "Existing venue confirmed.",
          isSummaryManuallyEdited: false,
          discussionStatus: "CONTINUE_LATER",
          validationStatus: "READY",
        },
      }),
    },
  );

  const existingSaveResponse = await POST(existingSaveRequest, params);
  const existingSaveJson = await existingSaveResponse.json();

  assertCondition(existingSaveResponse.ok, "Existing venue save request failed.");
  assertCondition(existingSaveJson?.success === true, "Existing venue save did not return success.");
  assertCondition(Array.isArray(existingSaveJson?.overview?.areas), "Overview refresh missing after existing save.");

  const proposedSaveRequest = new NextRequest(
    `http://localhost/api/cat/inquiries/${inquiry.id}/discovery`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        areaKey: "VENUE",
        lifecycle: "COMPLETED",
        validation: "READY",
        summary: "Proposed venue captured with location context.",
        venueDiscovery: {
          selectionMode: "PROPOSED",
          proposedVenueName: "Riverside Green Estate",
          venueType: "LAWNS",
          proposedLocationText: "Near East Bypass, Sector 9",
          venueFinalizationStatus: "SHORTLISTED",
          knowledge: {
            kitchenAvailable: "UNKNOWN",
            powerAvailable: "YES",
            outdoorSetup: "YES",
            parkingConstraints: "UNKNOWN",
            loadingRestrictions: "UNKNOWN",
            siteVisitRequired: "YES",
          },
          additionalNotes: "Awaiting customer shortlist decision.",
          businessSummary: "Proposed venue option logged.",
          isSummaryManuallyEdited: true,
          discussionStatus: "COMPLETE",
          validationStatus: "READY",
        },
      }),
    },
  );

  const proposedSaveResponse = await POST(proposedSaveRequest, params);
  const proposedSaveJson = await proposedSaveResponse.json();

  assertCondition(proposedSaveResponse.ok, "Proposed venue save request failed.");
  assertCondition(proposedSaveJson?.success === true, "Proposed venue save did not return success.");
  assertCondition(Array.isArray(proposedSaveJson?.overview?.areas), "Overview refresh missing after proposed save.");

  const reloadRequest = new NextRequest(
    `http://localhost/api/cat/inquiries/${inquiry.id}/discovery`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );

  const reloadResponse = await GET(reloadRequest, params);
  const reloadJson = await reloadResponse.json();

  assertCondition(reloadResponse.ok, "Discovery reload request failed.");
  assertCondition(reloadJson?.success === true, "Discovery reload did not return success.");

  const venueArea = (reloadJson?.overview?.areas || []).find((area: any) => area.areaKey === "VENUE");
  assertCondition(!!venueArea, "Venue area missing from discovery overview.");

  assertCondition(venueArea.lifecycle === "COMPLETED", "Venue lifecycle did not persist as COMPLETED.");
  assertCondition(venueArea.validation === "READY", "Venue validation did not persist as READY.");
  assertCondition(typeof venueArea.summary === "string" && venueArea.summary.length > 0, "Venue summary did not persist.");
  assertCondition(typeof venueArea.updatedAt === "string" && venueArea.updatedAt.length > 0, "Venue updatedAt missing.");

  const venuePayload = venueArea.venueDiscovery;
  assertCondition(venuePayload?.selectionMode === "PROPOSED", "Proposed venue mode did not persist.");
  assertCondition(venuePayload?.proposedVenueName === "Riverside Green Estate", "Proposed venue name did not persist.");
  assertCondition(venuePayload?.proposedLocationText === "Near East Bypass, Sector 9", "Proposed venue location did not persist.");

  assertCondition(
    ["READY", "NEEDS_ATTENTION", "NOT_READY"].includes(reloadJson?.overview?.quotationReadiness),
    "Overview quotation readiness is missing.",
  );

  console.log("PASS Existing Venue selection");
  console.log("PASS Proposed Venue capture");
  console.log("PASS Save persistence");
  console.log("PASS Reload");
  console.log("PASS Validation persistence");
  console.log("PASS Summary persistence");
  console.log("PASS Requirements refresh source (updated area fields)");
  console.log("PASS Overview refresh source (overview returned after save and reload)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
