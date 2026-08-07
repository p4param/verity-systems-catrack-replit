'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

export interface IngredientMasterOption {
  id: string;
  ingredientCode: string;
  name: string;
  ingredientType?: string;
  baseUnit?: string;
}

interface IngredientMasterPickerProps {
  onSelect: (item: IngredientMasterOption) => void;
  excludeIds?: string[];
  placeholder?: string;
  // PM-WP03B — Purchase Order Items. When provided, results are scoped
  // to only the Ingredients this Vendor's Supply Portfolio actually
  // lists (fetched once via the existing Vendor Supply Portfolio GET
  // endpoint, then filtered client-side on every keystroke) instead of
  // searching all of Ingredient Master — a Purchase Order Item must be
  // something the selected Vendor can supply. Omit for the original
  // Vendor Supply Portfolio use (search all of Ingredient Master).
  vendorId?: string;
}

// PM-WP01 — Vendor Master, Supply Portfolio tab. A search-and-add picker
// (mirrors InquiryPicker/RelationshipPicker's search-input -> dropdown
// structure) but fires onSelect and clears, rather than holding a
// persistent single value — adding an Ingredient to a Vendor's Supply
// Portfolio is an "add to a list" action, not "choose one field's value."
export function IngredientMasterPicker({ onSelect, excludeIds = [], placeholder, vendorId }: IngredientMasterPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<IngredientMasterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [vendorPortfolio, setVendorPortfolio] = useState<IngredientMasterOption[] | null>(null);

  // Fetch the Vendor's Supply Portfolio once per vendorId — the list is
  // small (a Supply Portfolio, not all of Ingredient Master), so
  // filtering it client-side on every keystroke needs no debounce and no
  // repeated round trips.
  useEffect(() => {
    if (!vendorId) {
      setVendorPortfolio(null);
      return;
    }
    fetch(`/api/cat/vendors/${vendorId}/ingredients`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVendorPortfolio(
            (data.items || []).map((i: any) => ({ id: i.ingredientId, ingredientCode: i.ingredientCode, name: i.ingredientName, baseUnit: i.baseUnit })),
          );
        }
      })
      .catch((err) => console.error('Vendor Supply Portfolio fetch error:', err));
  }, [vendorId]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setHighlightedIndex(-1);
      return;
    }

    if (vendorId) {
      const q = searchTerm.trim().toLowerCase();
      const items = (vendorPortfolio || [])
        .filter((i) => !excludeIds.includes(i.id))
        .filter((i) => i.name.toLowerCase().includes(q) || i.ingredientCode.toLowerCase().includes(q));
      setResults(items);
      setHighlightedIndex(items.length > 0 ? 0 : -1);
      setIsOpen(true);
      return;
    }

    setLoading(true);
    const handler = setTimeout(() => {
      fetch(`/api/cat/ingredient-master?query=${encodeURIComponent(searchTerm)}&status=ACTIVE`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const items = (data.items || [])
              .filter((i: any) => !excludeIds.includes(i.id))
              .map((i: any) => ({ id: i.id, ingredientCode: i.ingredientCode, name: i.name, ingredientType: i.ingredientType, baseUnit: i.baseUnit }));
            setResults(items);
            setHighlightedIndex(items.length > 0 ? 0 : -1);
            setIsOpen(true);
          }
        })
        .catch((err) => console.error('Ingredient Master search error:', err))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, vendorId, vendorPortfolio]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) handleSelect(results[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: IngredientMasterOption) => {
    onSelect(item);
    setSearchTerm('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder || 'Type to search Ingredient Master by name or code...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="w-full bg-muted/30 border border-border/40 rounded-lg pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        {loading && <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border/60 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-border/30">
          {results.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">No matching Ingredients found.</div>
          ) : (
            results.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full p-3 text-left transition flex items-start justify-between gap-3 text-xs cursor-pointer group ${
                    isHighlighted ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm transition truncate ${isHighlighted ? 'text-primary' : 'text-foreground'}`}>{item.name}</span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-muted text-muted-foreground rounded shrink-0">{item.ingredientCode}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {item.ingredientType && <span>{item.ingredientType}</span>}
                      {item.baseUnit && <span>• {item.baseUnit}</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
