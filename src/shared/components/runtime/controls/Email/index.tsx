import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const EmailControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly, layoutMetadata,
}) => {
  const isEditable = !disabled && !readonly;
  const placeholder = layoutMetadata?.placeholder || (field.metadata?.placeholder as string) || "name@example.com";
  const properties = (field.properties || field.metadata?.properties || {}) as Record<string, any>;
  const showMailtoLink = properties.showMailtoLink === true;

  if (readonly && value && showMailtoLink) {
    return (
      <a
        href={`mailto:${value}`}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {String(value)}
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </a>
    );
  }

  return (
    <Input
      type="email"
      aria-label={field.label || field.code}
      placeholder={placeholder}
      disabled={!isEditable}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      autoComplete="email"
      className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
};

export default EmailControl;
