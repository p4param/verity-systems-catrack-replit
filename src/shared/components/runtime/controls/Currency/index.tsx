import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const CurrencyControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
  runtimeContext,
}) => {
  const isEditable = !disabled && !readonly;
  const culture = runtimeContext?.culture;
  
  // Dynamic currency symbol mapping based on culture or metadata
  const currencyCode = String(field.metadata?.currencyCode || culture.currencyCode);
  
  const getSymbol = (code: string) => {
    try {
      return (0).toLocaleString(culture.locale, {
        style: "currency",
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).replace(/\d/g, "").trim();
    } catch {
      return culture.currencySymbol || "$";
    }
  };

  const symbol = getSymbol(currencyCode);

  return (
    <div className="relative flex items-center w-full">
      <span 
        className="absolute left-3 text-sm text-muted-foreground select-none pointer-events-none"
        aria-hidden="true"
      >
        {symbol}
      </span>
      <Input
        type="number"
        step="any"
        aria-label={field.label || field.code}
        disabled={!isEditable}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        onBlur={onBlur}
        onFocus={onFocus}
        className="pl-8 w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
};

export default CurrencyControl;
