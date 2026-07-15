export interface OptionItem {
  id: string;
  label: string;
  [key: string]: any;
}

export interface OptionProvider {
  fetchOptions(field: any, query?: string, fetchWithAuth?: (url: string, options?: any) => Promise<any>): Promise<OptionItem[]>;
}

export class StaticOptionProvider implements OptionProvider {
  async fetchOptions(field: any, query?: string, fetchWithAuth?: any): Promise<OptionItem[]> {
    let options = field.options || [];
    
    // Map to id/label for consistency
    let results = options.map((opt: any) => ({
      id: opt.code,
      label: opt.label,
      ...opt
    }));

    if (query) {
      results = results.filter((r: any) => r.label.toLowerCase().includes(query.toLowerCase()));
    }
    
    return results;
  }
}

export class LookupOptionProvider implements OptionProvider {
  async fetchOptions(field: any, query?: string, fetchWithAuth?: any): Promise<OptionItem[]> {
    const lookupDef = field.lookupDefinition;
    if (!lookupDef?.referencedEntityId) return [];

    try {
      const referencedEntityId = lookupDef.referencedEntityId;

      // Build URL: use the entity-UUID route which resolves moduleCode/entityCode internally.
      // ?q= for search, ?display= for display field override, ?view= for view-scoped lookup
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (lookupDef.viewCode) params.set("view", lookupDef.viewCode);
      if (lookupDef.displayFieldCode) params.set("display", lookupDef.displayFieldCode);

      const url = `/api/runtime/lookup/${referencedEntityId}${params.size > 0 ? `?${params.toString()}` : ""}`;

      let raw: any;
      if (fetchWithAuth) {
        raw = await fetchWithAuth(url);
      } else {
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          console.error("[LookupOptionProvider] HTTP error:", res.status, text);
          throw new Error(`Lookup fetch failed: HTTP ${res.status}`);
        }
        raw = await res.json();
      }

      // Unwrap { success: true, data: [...] } envelope OR plain array
      if (Array.isArray(raw)) return raw;
      if (raw?.data && Array.isArray(raw.data)) return raw.data;
      if (raw?.success === false) {
        console.error("[LookupOptionProvider] API error:", raw.error);
        return [];
      }
      return [];
    } catch (error) {
      console.error("[LookupOptionProvider] Failed to fetch options for field:", field.code, error);
      return [];
    }
  }
}

export function getOptionProvider(dataSource: string): OptionProvider {
  if (dataSource === "LOOKUP" || dataSource === "LOOKUP_ENTITY" || dataSource === "LOOKUP_VIEW") {
    return new LookupOptionProvider();
  }
  return new StaticOptionProvider();
}
