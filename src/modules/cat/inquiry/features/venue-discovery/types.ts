import {
  BusinessValidationStatus,
  DiscussionStatus,
} from "@/modules/cat/inquiry/domain/discovery-types";

export type VenueSelectionMode = "EXISTING" | "NEW" | "PROPOSED";

export type VenueFinalizationStatus =
  | "CONFIRMED"
  | "SHORTLISTED"
  | "SEARCHING"
  | "UNDECIDED";

export type VenueType =
  | "BANQUET_HALL"
  | "HOTEL"
  | "LAWNS"
  | "RESIDENCE"
  | "CORPORATE_PREMISES"
  | "OTHER";

export type KnowledgeFlagValue = "YES" | "NO" | "UNKNOWN";

export interface VenuePickerOption {
  id: string;
  name: string;
}

export interface VenueKnowledgeSnapshot {
  kitchenAvailable?: KnowledgeFlagValue;
  powerAvailable?: KnowledgeFlagValue;
  outdoorSetup?: KnowledgeFlagValue;
  parkingConstraints?: KnowledgeFlagValue;
  loadingRestrictions?: KnowledgeFlagValue;
  siteVisitRequired?: KnowledgeFlagValue;
}

export interface VenueDiscoveryConversation {
  selectionMode: VenueSelectionMode;
  venueId?: string;
  existingVenueId?: string;
  existingVenueName?: string;
  proposedVenueName?: string;
  venueType?: VenueType;
  proposedLocationText?: string;
  venueFinalizationStatus: VenueFinalizationStatus;
  knowledge: VenueKnowledgeSnapshot;
  additionalNotes?: string;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export interface VenueValidationContext {
  selectionMode: VenueSelectionMode;
  existingVenueName?: string;
  proposedVenueName?: string;
  proposedLocationText?: string;
  venueFinalizationStatus: VenueFinalizationStatus;
}

export interface VenueValidationResult {
  status: BusinessValidationStatus;
  reasons: string[];
}
