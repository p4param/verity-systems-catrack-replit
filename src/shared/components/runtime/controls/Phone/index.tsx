import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const PhoneControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly, layoutMetadata,
}) => {
  const isEditable = !disabled && !readonly;
  const properties = (field.properties || field.metadata?.properties || {}) as Record<string, any>;
  const countryPrefix: string = properties.countryPrefix || "";
  const placeholder = layoutMetadata?.placeholder || (field.metadata?.placeholder as string) || "+1 (555) 000-0000";

  if (readonly && value) {
    return (
      <a
        href={`tel:${countryPrefix}${value}`}
        className="text-sm text-primary hover:underline"
      >
        {countryPrefix ? `${countryPrefix} ${value}` : String(value)}
      </a>
    );
  }

  return (
    <div className="flex w-full">
      {countryPrefix && (
        <span className="inline-flex items-center px-3 text-sm text-muted-foreground border border-r-0 border-border rounded-l-lg bg-muted/30 select-none shrink-0">
          {countryPrefix}
        </span>
      )}
      <Input
        type="tel"
        aria-label={field.label || field.code}
        placeholder={placeholder}
        disabled={!isEditable}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        autoComplete="tel"
        className={`w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${countryPrefix ? "rounded-l-none" : ""}`}
      />
    </div>
  );
};

export default PhoneControl;
