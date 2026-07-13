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
    if (!field.lookupDefinition?.referencedEntityId) return [];
    
    try {
      const referencedEntityId = field.lookupDefinition.referencedEntityId;
      const url = `/api/runtime/platform/${referencedEntityId}/lookup${query ? `?q=${encodeURIComponent(query)}` : ''}`;
      
      let data;
      if (fetchWithAuth) {
        data = await fetchWithAuth(url);
      } else {
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          console.error("Lookup fetch failed:", res.status, text);
          throw new Error("Failed to fetch lookup data");
        }
        data = await res.json();
      }
      
      // Since fetchWithAuth might return the array directly if it doesn't wrap it, let's handle both
      return Array.isArray(data) ? data : (data?.data || []);
    } catch (error) {
      console.error("Lookup error:", error);
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
