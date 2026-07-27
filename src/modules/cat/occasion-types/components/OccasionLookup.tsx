"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ChevronRight, Plus, RefreshCw, Search } from "lucide-react";
import { OccasionTypeLookupItem } from "@/modules/cat/occasion-types/types";

interface OccasionLookupProps {
  value?: OccasionTypeLookupItem | string | null;
  onChange: (occasion: OccasionTypeLookupItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowQuickCreate?: boolean;
  onRequestCreate?: (searchName: string) => void;
}

export default function OccasionLookup({
  value,
  onChange,
  placeholder = "Search event occasions...",
  disabled,
  allowQuickCreate = true,
  onRequestCreate,
}: OccasionLookupProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<OccasionTypeLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedName = typeof value === "string" ? value : value?.name || "";

  useEffect(() => {
    const run = async () => {
      if (disabled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/occasion-types/lookup?query=${encodeURIComponent(query.trim())}`);
        const json = res.ok ? await res.json().catch(() => ({})) : {};
        if (json?.success && Array.isArray(json.items)) {
          const matches = (json.items || []).slice(0, 15);
          setOptions(matches);
          setHighlightedIndex(matches.length > 0 ? 0 : -1);
          setOpen(true);
        }
      } catch (err) {
        console.error("Event occasion lookup load failed:", err);
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
    [loading, query, options.length]
  );

  const handleQuickCreate = async () => {
    const occasionName = query.trim();
    if (!occasionName) return;

    if (onRequestCreate) {
      setOpen(false);
      onRequestCreate(occasionName);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/cat/occasion-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: occasionName,
          isActive: true,
          showInDiscoveryQuickSelect: false,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Unable to create event occasion.");
        return;
      }

      const created = json.occasionType || { id: json.id, name: occasionName };
      onChange({
        id: created.id,
        name: created.name || occasionName,
        code: created.code || "",
        showInDiscoveryQuickSelect: false,
        displayOrder: created.displayOrder || 99,
      });
      setOpen(false);
      setQuery("");
    } catch (err) {
      console.error("Event occasion quick create failed:", err);
      alert("Unable to create event occasion.");
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

  if (selectedName) {
    return (
      <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-foreground truncate">{selectedName}</div>
            <div className="text-[10px] text-muted-foreground">Event Occasion</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-bold text-primary hover:underline shrink-0 cursor-pointer px-2.5 py-1 hover:bg-primary/10 rounded-lg transition"
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
            <div className="p-3 text-[11px] text-muted-foreground">Loading event occasions...</div>
          ) : noResults ? (
            <div className="p-3 text-[11px] text-muted-foreground space-y-2">
              <div>No matching event occasions found.</div>
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
                    <span>Create Event Occasion &quot;{query.trim()}&quot;</span>
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
                    className={`w-full text-left px-3 py-2 transition flex items-center justify-between ${
                      highlighted
                        ? "bg-primary/10 border-l-4 border-l-primary text-primary"
                        : "bg-card text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.name}</div>
                    {item.showInDiscoveryQuickSelect && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                        QUICK SELECT
                      </span>
                    )}
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
                    <span>Create Event Occasion &quot;{query.trim()}&quot;</span>
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
