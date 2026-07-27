import {
  VenueValidationContext,
  VenueValidationResult,
} from "@/modules/cat/inquiry/features/venue-discovery/types";

function isBlank(value?: string): boolean {
  return !value || !value.trim();
}

export function computeVenueValidation(
  input: VenueValidationContext,
): VenueValidationResult {
  const reasons: string[] = [];

  const hasVenue =
    input.selectionMode === "EXISTING"
      ? !isBlank(input.existingVenueName)
      : !isBlank(input.proposedVenueName);

  if (!hasVenue) {
    reasons.push("Venue is not captured.");
  }

  if (!input.venueFinalizationStatus) {
    reasons.push("Venue finalization status is missing.");
  }

  const isSearchingState =
    input.venueFinalizationStatus === "SEARCHING" ||
    input.venueFinalizationStatus === "UNDECIDED";

  const hasBasicLocation =
    input.selectionMode === "EXISTING" || !isBlank(input.proposedLocationText);

  if (!hasBasicLocation) {
    reasons.push("Basic location context is incomplete.");
  }

  if (input.selectionMode === "PROPOSED" && !isBlank(input.proposedVenueName) && !hasBasicLocation) {
    return {
      status: "BLOCKED",
      reasons: [
        "Proposed venue has no basic location context to continue business discovery.",
      ],
    };
  }

  if (!hasVenue || isSearchingState || !hasBasicLocation) {
    return {
      status: "NEEDS_ATTENTION",
      reasons,
    };
  }

  return {
    status: "READY",
    reasons: ["Venue details are sufficient to progress the sales conversation."],
  };
}
