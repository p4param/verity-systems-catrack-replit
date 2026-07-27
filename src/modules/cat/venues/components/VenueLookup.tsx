"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronRight, MapPin, Plus, RefreshCw, Search } from "lucide-react";
import {
  CatVenueType,
  VenueLookupItem,
  VENUE_TYPE_OPTIONS,
  venueTypeLabel,
} from "@/modules/cat/venues/types";

interface VenueLookupProps {
  value?: VenueLookupItem | null;
  onChange: (venue: VenueLookupItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowQuickCreate?: boolean;
  onRequestCreate?: (searchName: string) => void;
}

export default function VenueLookup({
  value,
  onChange,
  placeholder = "Search existing venues",
  disabled,
  allowQuickCreate = true,
  onRequestCreate,
}: VenueLookupProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<VenueLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [quickCreateType, setQuickCreateType] = useState<CatVenueType>("OTHER");
  const [creating, setCreating] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState<{ city?: string; venueType?: CatVenueType } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const valueId = value?.id;
  const valueCity = value?.city;
  const valueType = value?.venueType;

  useEffect(() => {
    if (valueId && (!valueCity || !valueType)) {
      let active = true;
      fetch(`/api/cat/venues/${valueId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data?.venue) {
            setFetchedDetails({
              city: data.venue.city || undefined,
              venueType: data.venue.venueType || undefined,
            });
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    } else {
      setFetchedDetails(null);
    }
  }, [valueId, valueCity, valueType]);

  useEffect(() => {
    const run = async () => {
      if (disabled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/venues/lookup?query=${encodeURIComponent(query.trim())}`);
        const json = res.ok ? await res.json().catch(() => ({})) : {};
        if (json?.success && Array.isArray(json.items)) {
          const matches = (json.items || []).slice(0, 15);
          setOptions(matches);
          setHighlightedIndex(matches.length > 0 ? 0 : -1);
          setOpen(true);
        }
      } catch (err) {
        console.error("Venue lookup load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 250);
    return () => clearTimeout(timer);
  }, [query, disabled]);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const noResults = useMemo(
    () => !loading && query.trim().length > 0 && options.length === 0,
    [loading, query, options.length],
  );

  const handleQuickCreate = async () => {
    const venueName = query.trim();
    if (!venueName) return;

    if (onRequestCreate) {
      setOpen(false);
      onRequestCreate(venueName);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/cat/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName,
          venueType: quickCreateType,
          status: "DRAFT",
          creationSource: "INQUIRY_DISCOVERY",
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success || !json?.venue?.id) {
        alert(json?.error || "Unable to quick create venue.");
        return;
      }

      onChange({
        id: json.venue.id,
        name: json.venue.venueName || venueName,
        venueType: json.venue.venueType || quickCreateType,
        city: json.venue.city || undefined,
      });
      setOpen(false);
      setQuery("");
    } catch (err) {
      console.error("Venue quick create failed:", err);
      alert("Unable to quick create venue.");
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!open || options.length === 0) {
      if (event.key === "ArrowDown" && options.length > 0) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        onChange(options[highlightedIndex]);
        setOpen(false);
        setQuery("");
      }
    }
  };

  const displayVenueType = value?.venueType || fetchedDetails?.venueType;
  const displayCity = value?.city || fetchedDetails?.city;

  if (value?.name) {
    return (
      <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-foreground truncate">{value.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
              <span className="font-semibold">{displayVenueType ? venueTypeLabel(displayVenueType) : "Venue"}</span>
              {displayCity ? (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  {displayCity}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground/60 italic">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  Location not specified
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-bold text-primary hover:underline shrink-0 cursor-pointer px-3 py-1.5 hover:bg-primary/10 rounded-lg transition"
          disabled={disabled}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="space-y-2 relative">
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (options.length > 0 || query.trim().length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full text-xs bg-background border border-border/60 rounded-xl py-2.5 pl-9 pr-9"
          disabled={disabled}
        />
        {loading && (
          <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border/60 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-border/30">
          {loading ? (
            <div className="p-3 text-[11px] text-muted-foreground">Loading venues...</div>
          ) : noResults ? (
            <div className="p-3 text-[11px] text-muted-foreground space-y-2">
              <div>No matching venues found.</div>
              {allowQuickCreate && query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (onRequestCreate) {
                      onRequestCreate(query.trim());
                    } else {
                      handleQuickCreate();
                    }
                  }}
                  className="w-full text-left inline-flex items-center justify-between gap-1 text-[11px] font-bold px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Create New Venue &quot;{query.trim()}&quot;</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </div>
          ) : (
            <>
              {options.map((item, index) => {
                const highlighted = index === highlightedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                      setQuery("");
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3 py-2 transition ${
                      highlighted
                        ? "bg-primary/10 border-l-4 border-l-primary text-primary"
                        : "bg-card text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{item.venueType ? venueTypeLabel(item.venueType) : "Venue"}</span>
                      {item.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.city}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {allowQuickCreate && query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (onRequestCreate) {
                      onRequestCreate(query.trim());
                    } else {
                      handleQuickCreate();
                    }
                  }}
                  className="w-full text-left px-3 py-2.5 bg-primary/5 hover:bg-primary/10 text-primary border-t border-border/40 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Create New Venue &quot;{query.trim()}&quot;</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
