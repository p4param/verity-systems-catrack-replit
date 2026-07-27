"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { UtensilsCrossed, ChevronRight, Plus, RefreshCw, Search } from "lucide-react";
import { CuisineLookupItem } from "@/modules/cat/cuisines/types";

interface CuisineLookupProps {
  value?: CuisineLookupItem | string | null;
  onChange: (cuisine: CuisineLookupItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowQuickCreate?: boolean;
  onRequestCreate?: (searchName: string) => void;
}

export default function CuisineLookup({
  value,
  onChange,
  placeholder = "Search cuisines (e.g. North Indian, Pan-Asian, Italian)...",
  disabled,
  allowQuickCreate = true,
  onRequestCreate,
}: CuisineLookupProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CuisineLookupItem[]>([]);
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
        const res = await fetch(`/api/cat/cuisines/lookup?query=${encodeURIComponent(query.trim())}`);
        const json = res.ok ? await res.json().catch(() => ({})) : {};
        if (json?.success && Array.isArray(json.items)) {
          const matches = (json.items || []).slice(0, 15);
          setOptions(matches);
          setHighlightedIndex(matches.length > 0 ? 0 : -1);
          setOpen(true);
        }
      } catch (err) {
        console.error("Cuisine lookup load failed:", err);
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
    const cuisineName = query.trim();
    if (!cuisineName) return;

    if (onRequestCreate) {
      setOpen(false);
      onRequestCreate(cuisineName);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/cat/cuisines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cuisineName,
          isActive: true,
          showInDiscoveryQuickSelect: false,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Unable to create cuisine master.");
        return;
      }

      const created = json.cuisine || { id: json.id, name: cuisineName };
      onChange({
        id: created.id,
        name: created.name || cuisineName,
        code: created.code || "",
        showInDiscoveryQuickSelect: false,
        displayOrder: created.displayOrder || 99,
      });
      setOpen(false);
      setQuery("");
    } catch (err) {
      console.error("Cuisine quick create failed:", err);
      alert("Unable to create cuisine master.");
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
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs transition hover:border-primary/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-foreground truncate flex items-center gap-2">
              <span>{selectedName}</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                SELECTED CUISINE
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">Primary Event Cuisine Master</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-extrabold text-primary hover:bg-primary/15 border border-primary/20 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0"
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
            <div className="p-3 text-[11px] text-muted-foreground">Loading cuisines...</div>
          ) : noResults ? (
            <div className="p-3 text-[11px] text-muted-foreground space-y-2">
              <div>No matching cuisines found.</div>
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
                    <span>Create Cuisine &quot;{query.trim()}&quot;</span>
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
                    <span>Create Cuisine &quot;{query.trim()}&quot;</span>
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
