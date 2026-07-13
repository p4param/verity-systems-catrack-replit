import { FieldControlRegistry } from "./field-control-registry";

export const MetadataRegistry = {
  DataTypes: [
    { id: "STRING", name: "String", description: "Text-based data" },
    { id: "INTEGER", name: "Integer", description: "Whole numbers" },
    { id: "DECIMAL", name: "Decimal", description: "Numbers with fractions" },
    { id: "BOOLEAN", name: "Boolean", description: "True or False" },
    { id: "DATE", name: "Date", description: "Date and time data" },
    { id: "JSON", name: "JSON", description: "Structured JSON objects or arrays" },
    { id: "UUID", name: "UUID", description: "Unique identifiers" }
  ],
  
  // Forward to new robust registry
  UIControls: FieldControlRegistry.getControls(),
  
  DataSources: [
    { id: "STATIC", name: "Static Options", category: "Static", description: "Options defined manually in the designer" },
    { id: "SYSTEM", name: "System Constants", category: "Static", description: "Built-in platform constants" },
    { id: "LOOKUP_ENTITY", name: "Lookup Entity", category: "Platform", description: "Options queried from another CAP entity" },
    { id: "LOOKUP_VIEW", name: "Lookup View", category: "Platform", description: "Options queried from a specific view" },
    { id: "SQL_VIEW", name: "SQL View", category: "Database", description: "Options queried from a database view" },
    { id: "API", name: "REST API", category: "External", description: "Options fetched from a generic API endpoint" },
    { id: "INTEGRATION", name: "Integration Engine", category: "External", description: "Options from external systems" },
    { id: "SCRIPT", name: "Formula", category: "Intelligent", description: "Custom JS/TS execution" },
    { id: "AI", name: "AI Provider", category: "Intelligent", description: "Data generated via AI" }
  ],

  ValidationProfiles: [
    { id: "NONE", name: "No Validation" },
    { id: "EMAIL", name: "Email Address" },
    { id: "PHONE", name: "Phone Number" },
    { id: "URL", name: "URL" },
    { id: "CUSTOM_REGEX", name: "Custom Regex" }
  ],

  Formatters: [
    { id: "NONE", name: "Raw Display" },
    { id: "CURRENCY_USD", name: "Currency (USD)" },
    { id: "DATE_SHORT", name: "Short Date" },
    { id: "DATETIME_LOCAL", name: "Local Date Time" },
    { id: "MASKED", name: "Masked (e.g. Password)" }
  ],

  Behaviors: [
    { id: "STANDARD", name: "Standard" },
    { id: "READONLY_AFTER_CREATE", name: "Readonly After Create" },
    { id: "HIDDEN", name: "Hidden" }
  ],

  FieldTemplates: [
    { type: "TEXT", name: "Short Text", description: "A single line of text", dataType: "STRING", uiControl: "TEXT_INPUT", dataSource: "STATIC", icon: "Type" },
    { type: "LONG_TEXT", name: "Long Text", description: "Multi-line text area", dataType: "STRING", uiControl: "TEXTAREA", dataSource: "STATIC", icon: "FileText" },
    { type: "RICH_TEXT", name: "Rich Text", description: "Rich text editor", dataType: "STRING", uiControl: "RICH_TEXT", dataSource: "STATIC", icon: "Type" },
    { type: "MARKDOWN", name: "Markdown", description: "Markdown editor", dataType: "STRING", uiControl: "MARKDOWN", dataSource: "STATIC", icon: "FileText" },
    { type: "INTEGER", name: "Whole Number", description: "Numeric without decimals", dataType: "INTEGER", uiControl: "NUMBER_INPUT", dataSource: "STATIC", icon: "Hash" },
    { type: "DECIMAL", name: "Decimal Number", description: "Numeric with decimals", dataType: "DECIMAL", uiControl: "NUMBER_INPUT", dataSource: "STATIC", icon: "CircleDot" },
    { type: "CURRENCY", name: "Currency", description: "Monetary amount", dataType: "DECIMAL", uiControl: "CURRENCY_INPUT", dataSource: "STATIC", icon: "DollarSign" },
    { type: "BOOLEAN", name: "Switch (Yes/No)", description: "Toggle switch", dataType: "BOOLEAN", uiControl: "SWITCH", dataSource: "STATIC", icon: "ToggleRight" },
    { type: "DATE", name: "Date", description: "Calendar date picker", dataType: "DATE", uiControl: "DATE_PICKER", dataSource: "STATIC", icon: "Calendar" },
    { type: "DATETIME", name: "Date & Time", description: "Calendar and time picker", dataType: "DATE", uiControl: "DATETIME_PICKER", dataSource: "STATIC", icon: "CalendarClock" },
    { type: "EMAIL", name: "Email", description: "Email address", dataType: "STRING", uiControl: "EMAIL_INPUT", dataSource: "STATIC", icon: "Mail" },
    { type: "PHONE", name: "Phone", description: "Phone number", dataType: "STRING", uiControl: "PHONE_INPUT", dataSource: "STATIC", icon: "Phone" },
    { type: "SELECT", name: "Single Select", description: "Dropdown menu", dataType: "STRING", uiControl: "SELECT", dataSource: "STATIC", icon: "List" },
    { type: "MULTI_SELECT", name: "Multi Select", description: "Multiple selection dropdown", dataType: "JSON", uiControl: "MULTI_SELECT", dataSource: "STATIC", icon: "ListChecks" },
    { type: "CHECKBOX_GROUP", name: "Checkboxes", description: "Multiple checkboxes", dataType: "JSON", uiControl: "CHECKBOX_GROUP", dataSource: "STATIC", icon: "CheckSquare" },
    { type: "LOOKUP", name: "Entity Lookup", description: "Search reference to another entity", dataType: "UUID", uiControl: "LOOKUP", dataSource: "LOOKUP_ENTITY", icon: "Search" },
    { type: "MULTI_LOOKUP", name: "Multi Entity Lookup", description: "Multiple references", dataType: "JSON", uiControl: "MULTI_LOOKUP", dataSource: "LOOKUP_ENTITY", icon: "Database" },
    { type: "ATTACHMENT", name: "File Upload", description: "Upload documents", dataType: "JSON", uiControl: "FILE_UPLOAD", dataSource: "STATIC", icon: "Paperclip" },
    { type: "IMAGE", name: "Image Upload", description: "Upload images", dataType: "JSON", uiControl: "IMAGE_UPLOAD", dataSource: "STATIC", icon: "Image" }
  ]
};
