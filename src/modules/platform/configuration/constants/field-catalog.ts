export interface FieldCatalogEntry {
  type: string;
  name: string;
  description: string;
  dataType: "STRING" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "DATE" | "JSON" | "UUID";
  defaultUIControl: string;
  allowedValidations: string[];
  icon: string;
}

export const FIELD_CATALOG: FieldCatalogEntry[] = [
  { type: "TEXT", name: "Text", description: "Short alphanumeric text", dataType: "STRING", defaultUIControl: "TEXT_INPUT", allowedValidations: ["min", "max", "regex"], icon: "Type" },
  { type: "LONG_TEXT", name: "Long Text", description: "Multi-line text", dataType: "STRING", defaultUIControl: "TEXTAREA", allowedValidations: ["min", "max"], icon: "FileText" },
  { type: "INTEGER", name: "Integer", description: "Whole numbers", dataType: "INTEGER", defaultUIControl: "NUMBER_INPUT", allowedValidations: ["min", "max"], icon: "Hash" },
  { type: "DECIMAL", name: "Decimal", description: "Numbers with fractions", dataType: "DECIMAL", defaultUIControl: "NUMBER_INPUT", allowedValidations: ["min", "max", "precision"], icon: "CircleDot" },
  { type: "CURRENCY", name: "Currency", description: "Monetary values", dataType: "DECIMAL", defaultUIControl: "CURRENCY_INPUT", allowedValidations: ["min", "max"], icon: "DollarSign" },
  { type: "BOOLEAN", name: "Boolean", description: "True or False", dataType: "BOOLEAN", defaultUIControl: "SWITCH", allowedValidations: [], icon: "ToggleRight" },
  { type: "DATE", name: "Date", description: "Calendar date", dataType: "DATE", defaultUIControl: "DATE_PICKER", allowedValidations: ["minDate", "maxDate"], icon: "Calendar" },
  { type: "DATETIME", name: "DateTime", description: "Date and Time", dataType: "DATE", defaultUIControl: "DATETIME_PICKER", allowedValidations: ["minDate", "maxDate"], icon: "CalendarClock" },
  { type: "TIME", name: "Time", description: "Time of day", dataType: "STRING", defaultUIControl: "TIME_PICKER", allowedValidations: [], icon: "Clock" },
  { type: "EMAIL", name: "Email", description: "Email address format", dataType: "STRING", defaultUIControl: "EMAIL_INPUT", allowedValidations: ["email"], icon: "Mail" },
  { type: "PHONE", name: "Phone", description: "Phone number", dataType: "STRING", defaultUIControl: "PHONE_INPUT", allowedValidations: ["phone"], icon: "Phone" },
  { type: "URL", name: "URL", description: "Web link", dataType: "STRING", defaultUIControl: "URL_INPUT", allowedValidations: ["url"], icon: "Link" },
  { type: "SELECT", name: "Select", description: "Single choice from a list", dataType: "STRING", defaultUIControl: "SELECT", allowedValidations: ["options"], icon: "List" },
  { type: "MULTI_SELECT", name: "Multi Select", description: "Multiple choices", dataType: "JSON", defaultUIControl: "MULTI_SELECT", allowedValidations: ["options"], icon: "ListChecks" },
  { type: "LOOKUP", name: "Lookup", description: "Reference to another entity", dataType: "UUID", defaultUIControl: "LOOKUP", allowedValidations: ["lookupEntity"], icon: "Search" },
  { type: "MULTI_LOOKUP", name: "Multi Lookup", description: "Multiple references", dataType: "JSON", defaultUIControl: "MULTI_LOOKUP", allowedValidations: ["lookupEntity"], icon: "Database" },
  { type: "FORMULA", name: "Formula", description: "Computed value", dataType: "STRING", defaultUIControl: "FORMULA", allowedValidations: ["formula"], icon: "FunctionSquare" },
  { type: "ATTACHMENT", name: "Attachment", description: "File upload", dataType: "JSON", defaultUIControl: "FILE_UPLOAD", allowedValidations: ["maxSize", "allowedTypes"], icon: "Paperclip" },
  { type: "IMAGE", name: "Image", description: "Image upload", dataType: "JSON", defaultUIControl: "IMAGE_UPLOAD", allowedValidations: ["maxSize"], icon: "Image" },
  { type: "JSON", name: "JSON", description: "Structured JSON data", dataType: "JSON", defaultUIControl: "CODE_EDITOR", allowedValidations: ["schema"], icon: "Braces" },
  { type: "AI_GENERATED", name: "AI Generated", description: "AI computed text", dataType: "STRING", defaultUIControl: "AI_PROMPT", allowedValidations: ["prompt"], icon: "Sparkles" },
];
