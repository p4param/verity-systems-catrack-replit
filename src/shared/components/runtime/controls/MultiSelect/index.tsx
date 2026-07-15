import React, { useState } from "react";
import { RuntimeControlProps } from "../types";

export const MultiSelectControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly,
}) => {
  const isEditable = !disabled && !readonly;
  const options: Array<{ code: string; label: string }> =
    field.options || (field.metadata?.options as Array<{ code: string; label: string }>) || [];
  const properties = (field.properties || field.metadata?.properties || {}) as Record<string, any>;
  const displayMode: "chips" | "dropdown" | "token" | "listbox" = properties.displayMode || "chips";
  const maxSelections: number | null = properties.maxSelections ?? null;
  const searchable: boolean = properties.searchable !== false;
  const placeholder: string = properties.placeholder || "Select options...";

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selected: string[] = Array.isArray(value)
    ? value
    : typeof value === "string" && value
    ? value.split(",").map((s: string) => s.trim())
    : [];

  const toggle = (code: string) => {
    if (!isEditable) return;
    const next = selected.includes(code)
      ? selected.filter((s) => s !== code)
      : maxSelections && selected.length >= maxSelections
      ? selected
      : [...selected, code];
    onChange(next);
  };

  const remove = (code: string) => {
    if (!isEditable) return;
    onChange(selected.filter((s) => s !== code));
  };

  const getLabel = (code: string) => options.find((o) => o.code === code)?.label || code;

  const filtered = searchable && search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // ── CHIPS (default) ───────────────────────────────────────────────────────
  if (displayMode === "chips") {
    return (
      <div className="space-y-2" onFocus={onFocus} onBlur={onBlur}>
        {isEditable && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((p) => !p)}
              className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm bg-background hover:border-primary/50 transition-colors"
            >
              <span className="text-muted-foreground">{placeholder}</span>
              <span className="text-muted-foreground text-xs">▾</span>
            </button>
            {open && (
              <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {searchable && (
                  <div className="p-2 border-b border-border">
                    <input
                      autoFocus
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-background border border-border rounded outline-none"
                    />
                  </div>
                )}
                <ul className="max-h-52 overflow-y-auto py-1">
                  {filtered.map((opt) => (
                    <li key={opt.code}>
                      <button
                        type="button"
                        onClick={() => toggle(opt.code)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${selected.includes(opt.code) ? "text-primary font-medium" : ""}`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(opt.code) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                          {selected.includes(opt.code) && <span className="text-[10px]">✓</span>}
                        </span>
                        {opt.label}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No options</li>}
                </ul>
              </div>
            )}
          </div>
        )}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((code) => (
              <span key={code} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {getLabel(code)}
                {isEditable && (
                  <button type="button" onClick={() => remove(code)} className="hover:text-destructive ml-0.5 leading-none">×</button>
                )}
              </span>
            ))}
          </div>
        )}
        {selected.length === 0 && !isEditable && (
          <span className="text-sm text-muted-foreground">—</span>
        )}
        {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      </div>
    );
  }

  // ── TOKEN ─────────────────────────────────────────────────────────────────
  if (displayMode === "token") {
    return (
      <div className="flex flex-wrap gap-1 min-h-[38px] px-2 py-1.5 border border-border rounded-lg bg-background" onFocus={onFocus} onBlur={onBlur}>
        {selected.map((code) => (
          <span key={code} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-foreground rounded text-xs border border-border">
            {getLabel(code)}
            {isEditable && (
              <button type="button" onClick={() => remove(code)} className="text-muted-foreground hover:text-destructive leading-none">×</button>
            )}
          </span>
        ))}
        {isEditable && (
          <select
            multiple
            value={selected}
            onChange={(e) => {
              const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
              onChange(vals);
            }}
            className="sr-only"
            aria-label={field.label}
          >
            {options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        )}
        {selected.length === 0 && <span className="text-xs text-muted-foreground self-center">{placeholder}</span>}
      </div>
    );
  }

  // ── LISTBOX ───────────────────────────────────────────────────────────────
  if (displayMode === "listbox") {
    return (
      <div className="border border-border rounded-lg overflow-hidden" onFocus={onFocus} onBlur={onBlur}>
        {searchable && (
          <div className="p-2 border-b border-border bg-muted/30">
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!isEditable}
              className="w-full px-2 py-1 text-sm bg-background border border-border rounded outline-none"
            />
          </div>
        )}
        <ul className="max-h-44 overflow-y-auto divide-y divide-border">
          {filtered.map((opt) => (
            <li key={opt.code}>
              <label className={`flex items-center gap-2 px-3 py-2 text-sm ${isEditable ? "cursor-pointer hover:bg-accent" : "cursor-default"} ${selected.includes(opt.code) ? "bg-primary/5" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt.code)}
                  onChange={() => toggle(opt.code)}
                  disabled={!isEditable}
                  className="h-3.5 w-3.5 rounded border-input text-primary"
                />
                <span>{opt.label}</span>
              </label>
            </li>
          ))}
        </ul>
        {selected.length > 0 && (
          <div className="px-3 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {selected.length} selected
          </div>
        )}
      </div>
    );
  }

  // ── DROPDOWN (multi-select native) ────────────────────────────────────────
  return (
    <select
      multiple
      value={selected}
      disabled={!isEditable}
      onChange={(e) => {
        const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
        onChange(vals);
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label || field.code}
      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background min-h-[120px]"
    >
      {options.map((o) => (
        <option key={o.code} value={o.code}>{o.label}</option>
      ))}
    </select>
  );
};

export default MultiSelectControl;
