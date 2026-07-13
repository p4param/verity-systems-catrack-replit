export type ControlStatus = "Experimental" | "Preview" | "Stable" | "Deprecated" | "Planned";
export type ControlCategory = "Text" | "Number" | "Date" | "Selection" | "Reference" | "Media" | "Advanced";

export interface FieldControlDefinition {
  id: string;
  name: string;
  version: string;
  since: string;
  status: ControlStatus;

  // Designer Metadata
  designer: {
    category: ControlCategory;
    description: string;
    icon: string;
  };

  // Runtime Metadata
  runtime: {
    renderer: string; // Identifier for resolving the React component
    defaultConfig: any; // Default configuration JSON
    capabilities: {
      supportedDataTypes: string[];
      supportedDataSources: string[];
      isSearchable: boolean;
      isSortable: boolean;
    };
  };
}

const controls: FieldControlDefinition[] = [
  // Text Category
  {
    id: "TEXT_INPUT",
    name: "Text Input",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Text", description: "Single line text field", icon: "Type" },
    runtime: {
      renderer: "core.textInput",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC", "SYSTEM"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "TEXTAREA",
    name: "Text Area",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Text", description: "Multi-line text field", icon: "FileText" },
    runtime: {
      renderer: "core.textArea",
      defaultConfig: { rows: 3 },
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: false }
    }
  },
  {
    id: "PASSWORD",
    name: "Password",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Text", description: "Masked text input", icon: "Key" },
    runtime: {
      renderer: "core.password",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: false, isSortable: false }
    }
  },
  {
    id: "EMAIL_INPUT",
    name: "Email",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Text", description: "Email address format", icon: "Mail" },
    runtime: {
      renderer: "core.emailInput",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "PHONE_INPUT",
    name: "Phone",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Text", description: "Phone number format", icon: "Phone" },
    runtime: {
      renderer: "core.phoneInput",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "URL_INPUT",
    name: "URL",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Text", description: "Web link format", icon: "Link" },
    runtime: {
      renderer: "core.urlInput",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "RICH_TEXT",
    name: "Rich Text",
    version: "1.0.0",
    since: "1.0",
    status: "Preview", // Marking preview until full robust renderer added
    designer: { category: "Text", description: "Formatted text editor", icon: "AlignLeft" },
    runtime: {
      renderer: "core.richText",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING", "JSON"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: false }
    }
  },
  {
    id: "MARKDOWN",
    name: "Markdown",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Text", description: "Markdown text editor", icon: "Code" },
    runtime: {
      renderer: "core.markdown",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING", "JSON"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: false }
    }
  },

  // Number Category
  {
    id: "NUMBER_INPUT",
    name: "Integer",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Number", description: "Whole number field", icon: "Hash" },
    runtime: {
      renderer: "core.numberInput",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["INTEGER"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "DECIMAL_INPUT",
    name: "Decimal",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Number", description: "Number with fractions", icon: "CircleDot" },
    runtime: {
      renderer: "core.decimalInput",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["DECIMAL"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "CURRENCY_INPUT",
    name: "Currency",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Number", description: "Monetary amount", icon: "DollarSign" },
    runtime: {
      renderer: "core.currencyInput",
      defaultConfig: { currency: "USD" },
      capabilities: { supportedDataTypes: ["DECIMAL"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "PERCENTAGE",
    name: "Percentage",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Number", description: "Percentage value", icon: "Percent" },
    runtime: {
      renderer: "core.percentage",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["DECIMAL", "INTEGER"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },

  // Date Category
  {
    id: "DATE_PICKER",
    name: "Date",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Date", description: "Calendar selection", icon: "Calendar" },
    runtime: {
      renderer: "core.datePicker",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["DATE"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "TIME_PICKER",
    name: "Time",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Date", description: "Time selection", icon: "Clock" },
    runtime: {
      renderer: "core.timePicker",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "DATETIME_PICKER",
    name: "Date & Time",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Date", description: "Date and Time selection", icon: "CalendarClock" },
    runtime: {
      renderer: "core.dateTimePicker",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["DATE"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "DATE_RANGE",
    name: "Date Range",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Date", description: "Start and end date", icon: "CalendarRange" },
    runtime: {
      renderer: "core.dateRange",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON", "STRING"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: false }
    }
  },

  // Selection Category
  {
    id: "CHECKBOX",
    name: "Checkbox",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "Single checkbox", icon: "CheckSquare" },
    runtime: {
      renderer: "core.checkbox",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["BOOLEAN"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "SWITCH",
    name: "Switch",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "Toggle switch", icon: "ToggleRight" },
    runtime: {
      renderer: "core.switch",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["BOOLEAN"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "TOGGLE",
    name: "Toggle",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "On/Off Toggle button", icon: "Play" },
    runtime: {
      renderer: "core.toggle",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["BOOLEAN"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "SELECT",
    name: "Dropdown",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "Single choice from a list", icon: "List" },
    runtime: {
      renderer: "core.select",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING", "INTEGER", "UUID"], supportedDataSources: ["STATIC", "LOOKUP_ENTITY", "LOOKUP_VIEW", "SQL_VIEW", "INTEGRATION", "API", "SYSTEM"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "MULTI_SELECT",
    name: "Multi Select",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "Multiple choice from a list", icon: "ListChecks" },
    runtime: {
      renderer: "core.multiSelect",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON"], supportedDataSources: ["STATIC", "LOOKUP_ENTITY", "LOOKUP_VIEW", "SQL_VIEW", "INTEGRATION", "API", "SYSTEM"], isSearchable: true, isSortable: false }
    }
  },
  {
    id: "RADIO_GROUP",
    name: "Radio Group",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "Radio button choices", icon: "CircleDot" },
    runtime: {
      renderer: "core.radioGroup",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING", "INTEGER"], supportedDataSources: ["STATIC", "SYSTEM"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "CHECKBOX_GROUP",
    name: "Checkbox Group",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "Multiple checkbox choices", icon: "CheckSquare" },
    runtime: {
      renderer: "core.checkboxGroup",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON"], supportedDataSources: ["STATIC", "SYSTEM"], isSearchable: true, isSortable: false }
    }
  },
  {
    id: "TAG_SELECTOR",
    name: "Tag Selector",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Selection", description: "Create or select tags", icon: "Tags" },
    runtime: {
      renderer: "core.tagSelector",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON", "STRING"], supportedDataSources: ["STATIC", "LOOKUP_ENTITY", "SYSTEM"], isSearchable: true, isSortable: false }
    }
  },

  // Reference Category
  {
    id: "LOOKUP",
    name: "Lookup",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Reference", description: "Reference to another entity", icon: "Search" },
    runtime: {
      renderer: "core.lookup",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["UUID"], supportedDataSources: ["LOOKUP_ENTITY", "LOOKUP_VIEW", "INTEGRATION"], isSearchable: true, isSortable: true }
    }
  },
  {
    id: "MULTI_LOOKUP",
    name: "Multi Lookup",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Reference", description: "Multiple references", icon: "Database" },
    runtime: {
      renderer: "core.multiLookup",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON"], supportedDataSources: ["LOOKUP_ENTITY", "LOOKUP_VIEW", "INTEGRATION"], isSearchable: true, isSortable: false }
    }
  },

  // Media Category
  {
    id: "FILE_UPLOAD",
    name: "File Upload",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Media", description: "Upload documents", icon: "Paperclip" },
    runtime: {
      renderer: "core.fileUpload",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON"], supportedDataSources: ["STATIC"], isSearchable: false, isSortable: false }
    }
  },
  {
    id: "IMAGE_UPLOAD",
    name: "Image Upload",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Media", description: "Upload images", icon: "Image" },
    runtime: {
      renderer: "core.imageUpload",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON"], supportedDataSources: ["STATIC"], isSearchable: false, isSortable: false }
    }
  },
  {
    id: "COLOR_PICKER",
    name: "Color Picker",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Media", description: "Select a color", icon: "Palette" },
    runtime: {
      renderer: "core.colorPicker",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: false, isSortable: false }
    }
  },

  // Advanced Category
  {
    id: "FORMULA",
    name: "Formula Display",
    version: "1.0.0",
    since: "1.0",
    status: "Stable",
    designer: { category: "Advanced", description: "Computed value read-only display", icon: "Sigma" },
    runtime: {
      renderer: "core.formula",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING", "INTEGER", "DECIMAL"], supportedDataSources: ["SCRIPT", "SYSTEM"], isSearchable: false, isSortable: true }
    }
  },

  // Future / Planned
  {
    id: "SIGNATURE",
    name: "Signature",
    version: "1.2.0",
    since: "1.2",
    status: "Planned",
    designer: { category: "Advanced", description: "Digital signature capture", icon: "PenTool" },
    runtime: {
      renderer: "core.signature",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["JSON"], supportedDataSources: ["STATIC"], isSearchable: false, isSortable: false }
    }
  },
  {
    id: "BARCODE",
    name: "Barcode",
    version: "1.3.0",
    since: "1.3",
    status: "Planned",
    designer: { category: "Advanced", description: "Barcode scanner/generator", icon: "Barcode" },
    runtime: {
      renderer: "core.barcode",
      defaultConfig: {},
      capabilities: { supportedDataTypes: ["STRING"], supportedDataSources: ["STATIC"], isSearchable: true, isSortable: false }
    }
  }
];

export class FieldControlRegistry {
  private static controlMap = new Map<string, FieldControlDefinition>(
    controls.map(c => [c.id, c])
  );

  static getControls(): FieldControlDefinition[] {
    return Array.from(this.controlMap.values());
  }

  static getControl(id: string): FieldControlDefinition | undefined {
    return this.controlMap.get(id);
  }

  static getCompatibleControls(dataType: string, dataSource: string): FieldControlDefinition[] {
    return this.getControls().filter(c => {
      const matchesType = c.runtime.capabilities.supportedDataTypes.includes(dataType);
      const matchesSource = dataSource 
        ? c.runtime.capabilities.supportedDataSources.includes(dataSource)
        : true;
      return matchesType && matchesSource;
    });
  }
}
