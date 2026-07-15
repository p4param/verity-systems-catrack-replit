import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const DecimalInputControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly, layoutMetadata,
}) => {
  const isEditable = !disabled && !readonly;
  const properties = (field.properties || field.metadata?.properties || {}) as Record<string, any>;
  const decimalPlaces: number = properties.decimalPlaces ?? 2;
  const min = properties.min ?? undefined;
  const max = properties.max ?? undefined;
  const step = 1 / Math.pow(10, decimalPlaces);
  const placeholder = layoutMetadata?.placeholder || (field.metadata?.placeholder as string) || `0.${"0".repeat(decimalPlaces)}`;

  return (
    <Input
      type="number"
      step={step}
      min={min}
      max={max}
      aria-label={field.label || field.code}
      placeholder={placeholder}
      disabled={!isEditable}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || raw === "-") { onChange(null); return; }
        const parsed = parseFloat(raw);
        onChange(isNaN(parsed) ? null : parseFloat(parsed.toFixed(decimalPlaces)));
      }}
      onBlur={onBlur}
      onFocus={onFocus}
      className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
};

export default DecimalInputControl;
