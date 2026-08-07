'use client';

import React, { useEffect, useState } from 'react';
import { inputClass } from '@/modules/cat/event/components/EventListEditing';

interface VendorOption {
  id: string;
  name: string;
  vendorCode: string;
}

interface VendorSelectProps {
  value: string;
  onChange: (vendorId: string) => void;
  disabled?: boolean;
}

// PM-WP03B — Purchase Order Review + Overview. Only ACTIVE Vendors are
// selectable, both at creation and for a Draft-only Vendor change (PM-
// WP03A §1: "Only ACTIVE Vendors are selectable when creating a new PO").
// A plain <select> is deliberately sufficient here — Vendor Master's
// realistic scale doesn't warrant a bespoke search-and-pick component the
// way Ingredient Master (hundreds of rows) does.
export function VendorSelect({ value, onChange, disabled }: VendorSelectProps) {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cat/vendors?status=ACTIVE&sort=name_asc')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setVendors(data.items || []);
      })
      .catch((err) => console.error('Failed to load Vendors:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || loading} className={inputClass}>
      <option value="">{loading ? 'Loading Vendors...' : 'Select a Vendor...'}</option>
      {vendors.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name} ({v.vendorCode})
        </option>
      ))}
    </select>
  );
}
