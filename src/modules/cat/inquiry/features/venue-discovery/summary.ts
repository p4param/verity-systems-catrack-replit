import {
  KnowledgeFlagValue,
  VenueDiscoveryConversation,
  VenueFinalizationStatus,
  VenueType,
} from "@/modules/cat/inquiry/features/venue-discovery/types";

function venueTypeLabel(type?: VenueType): string {
  switch (type) {
    case "BANQUET_HALL":
      return "Banquet Hall";
    case "HOTEL":
      return "Hotel";
    case "LAWNS":
      return "Lawns";
    case "RESIDENCE":
      return "Residence";
    case "CORPORATE_PREMISES":
      return "Corporate Premises";
    case "OTHER":
      return "Other";
    default:
      return "";
  }
}

function finalizationLabel(status: VenueFinalizationStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";
    case "SHORTLISTED":
      return "Shortlisted";
    case "SEARCHING":
      return "Searching";
    case "UNDECIDED":
      return "Undecided";
    default:
      return "Unknown";
  }
}

function knowledgeItem(label: string, value?: KnowledgeFlagValue): string | null {
  if (!value || value === "UNKNOWN") return null;
  return `${label}: ${value === "YES" ? "Yes" : "No"}`;
}

export function generateVenueBusinessSummary(
  venue: Pick<
    VenueDiscoveryConversation,
    | "selectionMode"
    | "existingVenueName"
    | "proposedVenueName"
    | "venueType"
    | "proposedLocationText"
    | "venueFinalizationStatus"
    | "knowledge"
    | "additionalNotes"
  >,
): string {
  const parts: string[] = [];

  const venueName =
    venue.selectionMode === "EXISTING"
      ? venue.existingVenueName?.trim()
      : venue.proposedVenueName?.trim();

  if (venueName) {
    parts.push(`Venue: ${venueName}`);
  } else {
    parts.push("Venue not finalized yet");
  }

  if (venue.venueType) {
    parts.push(`Type: ${venueTypeLabel(venue.venueType)}`);
  }

  parts.push(`Status: ${finalizationLabel(venue.venueFinalizationStatus)}`);

  if (venue.selectionMode === "PROPOSED" && venue.proposedLocationText?.trim()) {
    parts.push(`Location: ${venue.proposedLocationText.trim()}`);
  }

  const knowledge = [
    knowledgeItem("Kitchen", venue.knowledge.kitchenAvailable),
    knowledgeItem("Power", venue.knowledge.powerAvailable),
    knowledgeItem("Outdoor Setup", venue.knowledge.outdoorSetup),
    knowledgeItem("Parking Constraints", venue.knowledge.parkingConstraints),
    knowledgeItem("Loading Restrictions", venue.knowledge.loadingRestrictions),
    knowledgeItem("Site Visit Required", venue.knowledge.siteVisitRequired),
  ].filter(Boolean) as string[];

  if (knowledge.length > 0) {
    parts.push(`Known: ${knowledge.join(", ")}`);
  }

  if (venue.additionalNotes?.trim()) {
    parts.push(`Note: ${venue.additionalNotes.trim()}`);
  }

  return parts.join(". ");
}
