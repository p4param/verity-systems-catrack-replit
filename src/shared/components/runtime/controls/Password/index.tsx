import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const PasswordControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly, layoutMetadata,
}) => {
  const isEditable = !disabled && !readonly;
  const [show, setShow] = useState(false);
  const properties = (field.properties || field.metadata?.properties || {}) as Record<string, any>;
  const showToggle = properties.showToggle !== false;
  const placeholder = layoutMetadata?.placeholder || "••••••••";

  return (
    <div className="relative w-full">
      <Input
        type={show ? "text" : "password"}
        aria-label={field.label || field.code}
        placeholder={placeholder}
        disabled={!isEditable}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        className="w-full pr-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {showToggle && !readonly && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((p) => !p)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default PasswordControl;
