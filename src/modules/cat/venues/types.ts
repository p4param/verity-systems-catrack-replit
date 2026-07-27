export type CatVenueStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type VenueCreationSource =
  | "MANUAL"
  | "INQUIRY_DISCOVERY"
  | "IMPORT"
  | "API";

export type CatVenueType =
  | "BANQUET_HALL"
  | "HOTEL"
  | "LAWNS"
  | "RESIDENCE"
  | "CORPORATE_PREMISES"
  | "OTHER";

export interface CatVenue {
  id: string;
  venueNumber: string;
  venueName: string;
  venueType: CatVenueType;
  address?: string;
  areaLocality?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  primaryContactName?: string;
  primaryContactMobile?: string;
  primaryContactEmail?: string;
  notes?: string;
  status: CatVenueStatus;
  creationSource?: VenueCreationSource;
  createdFromModule?: string;
  createdFromRecordId?: string;
  createdFromRecordNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueLookupItem {
  id: string;
  name: string;
  venueType?: CatVenueType;
  city?: string;
  primaryContactName?: string;
  primaryContactMobile?: string;
}

export const VENUE_TYPE_OPTIONS: Array<{ value: CatVenueType; label: string }> = [
  { value: "BANQUET_HALL", label: "Banquet Hall" },
  { value: "HOTEL", label: "Hotel" },
  { value: "LAWNS", label: "Lawns" },
  { value: "RESIDENCE", label: "Residence" },
  { value: "CORPORATE_PREMISES", label: "Corporate Premises" },
  { value: "OTHER", label: "Other" },
];

export const VENUE_STATUS_OPTIONS: Array<{ value: CatVenueStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

export function venueTypeLabel(type?: CatVenueType): string {
  return VENUE_TYPE_OPTIONS.find((item) => item.value === type)?.label || "Other";
}
