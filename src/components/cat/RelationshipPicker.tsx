'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Users, Check, X, RefreshCw, UserCheck } from 'lucide-react';

export interface RelationshipItemOption {
  id: string;
  relationshipNumber: string;
  name: string;
  type: string;
  status: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
}

interface RelationshipPickerProps {
  value: string; // Selected relationshipId
  onChange: (id: string, selectedRelationship?: RelationshipItemOption) => void;
  required?: boolean;
}

export function RelationshipPicker({ value, onChange, required = false }: RelationshipPickerProps) {
  const [selectedItem, setSelectedItem] = useState<RelationshipItemOption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<RelationshipItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load initially selected record if value is provided
  useEffect(() => {
    if (!value) {
      setSelectedItem(null);
      return;
    }

    // Fetch record details if not already loaded into selectedItem
    if (!selectedItem || selectedItem.id !== value) {
      fetch(`/api/cat/relationships/${value}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.relationship) {
            const rel = data.relationship;
            const primaryContact = rel.contacts?.find((c: any) => c.isPrimary) || rel.contacts?.[0];
            setSelectedItem({
              id: rel.id,
              relationshipNumber: rel.relationshipNumber,
              name: rel.name,
              type: rel.type,
              status: rel.status,
              primaryContactName: primaryContact?.name,
              primaryContactPhone: primaryContact?.phone || primaryContact?.mobile,
              primaryContactEmail: primaryContact?.email,
            });
          }
        })
        .catch((err) => console.error('Failed to load selected relationship:', err));
    }
  }, [value]);

  // Server-side debounced search (PR-IM-001 / PR-IM-002)
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setHighlightedIndex(-1);
      return;
    }

    setLoading(true);
    const handler = setTimeout(() => {
      fetch(`/api/cat/relationships?query=${encodeURIComponent(searchTerm)}&limit=15`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const items = (data.items || []).map((r: any) => {
              const pc = r.contacts?.find((c: any) => c.isPrimary) || r.contacts?.[0];
              return {
                id: r.id,
                relationshipNumber: r.relationshipNumber,
                name: r.name,
                type: r.type,
                status: r.status,
                primaryContactName: pc?.name,
                primaryContactPhone: pc?.phone || pc?.mobile,
                primaryContactEmail: pc?.email,
              };
            });
            setResults(items);
            setHighlightedIndex(items.length > 0 ? 0 : -1);
            setIsOpen(true);
          }
        })
        .catch((err) => console.error('Server search error:', err))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation handler (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: RelationshipItemOption) => {
    setSelectedItem(item);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    onChange(item.id, item);
  };

  const handleClear = () => {
    setSelectedItem(null);
    setSearchTerm('');
    setResults([]);
    setHighlightedIndex(-1);
    onChange('', undefined);
  };

  // PR-IM-002 Item 2: Compact Selected CRM Card with Name, Number, Status, Contact info, and "Change" action
  if (selectedItem) {
    return (
      <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5">
            {selectedItem.type === 'ORGANIZATION' ? (
              <Building2 className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Users className="w-4 h-4 text-primary shrink-0" />
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground truncate">{selectedItem.name}</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-primary/10 text-primary rounded shrink-0">
                {selectedItem.relationshipNumber}
              </span>
              <span
                className={`text-[9px] px-2 py-0.2 font-bold rounded-full border shrink-0 ${
                  selectedItem.status === 'CUSTOMER'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : selectedItem.status === 'QUALIFIED'
                    ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}
              >
                {selectedItem.status}
              </span>
            </div>

            {selectedItem.primaryContactName && (
              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                  {selectedItem.primaryContactName}
                </span>
                {selectedItem.primaryContactPhone && <span>• {selectedItem.primaryContactPhone}</span>}
                {selectedItem.primaryContactEmail && <span>• {selectedItem.primaryContactEmail}</span>}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-bold text-primary hover:underline shrink-0 cursor-pointer px-2.5 py-1.5 hover:bg-primary/10 rounded-lg transition"
        >
          Change
        </button>
      </div>
    );
  }

  // PR-IM-002 Item 1: Searchable Lookup Input with Richer CRM-Style Presentation Dropdown
  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          required={required && !value}
          placeholder="Type to search relationship name or REL number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="w-full bg-muted/30 border border-border/40 rounded-lg pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        {loading && (
          <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Floating Rich CRM Search Results Dropdown (PR-IM-002 Item 1) */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border/60 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-border/30"
        >
          {results.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No matching relationships found.
            </div>
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
                    {/* Primary Emphasis: Relationship Name */}
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm transition truncate ${isHighlighted ? 'text-primary' : 'text-foreground'}`}>
                        {item.name}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-muted text-muted-foreground rounded shrink-0">
                        {item.relationshipNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="capitalize font-medium">{item.type.toLowerCase()}</span>
                      {item.primaryContactName && (
                        <span>• Contact: <strong className="text-foreground">{item.primaryContactName}</strong></span>
                      )}
                      {item.primaryContactPhone && <span>• {item.primaryContactPhone}</span>}
                      {item.primaryContactEmail && <span>• {item.primaryContactEmail}</span>}
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-2 py-0.5 font-bold rounded-full border shrink-0 ${
                      item.status === 'CUSTOMER'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : item.status === 'QUALIFIED'
                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
