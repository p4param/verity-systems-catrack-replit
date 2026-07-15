import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const UrlControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly, layoutMetadata,
}) => {
  const isEditable = !disabled && !readonly;
  const properties = (field.properties || field.metadata?.properties || {}) as Record<string, any>;
  const openInNewTab = properties.openInNewTab !== false;
  const placeholder = layoutMetadata?.placeholder || (field.metadata?.placeholder as string) || "https://example.com";

  if (readonly && value) {
    return (
      <a
        href={String(value)}
        target={openInNewTab ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
      >
        {String(value)}
        <svg className="h-3 w-3 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15,3 21,3 21,9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    );
  }

  return (
    <Input
      type="url"
      aria-label={field.label || field.code}
      placeholder={placeholder}
      disabled={!isEditable}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      autoComplete="url"
      className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
};

export default UrlControl;
