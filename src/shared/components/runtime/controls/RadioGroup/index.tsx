import React from "react";
import { RuntimeControlProps } from "../types";

export const RadioGroupControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
  layoutMetadata,
}) => {
  const isEditable = !disabled && !readonly;
  
  // Resolve options from field metadata, options array or default fallback
  const options = field.options || (field.metadata?.options as Array<{ code: string; label: string }>) || [
    { code: "TRUE", label: "Yes" },
    { code: "FALSE", label: "No" }
  ];
  
  // Get orientation (default: vertical)
  const properties = field.properties || (field.metadata?.properties as Record<string, unknown>) || {};
  const orientation = properties.orientation || "vertical";
  
  return (
    <div 
      role="radiogroup"
      aria-label={field.label || field.code}
      className={`flex ${orientation === "horizontal" ? "flex-row gap-6 flex-wrap" : "flex-col gap-2"}`}
      onBlur={onBlur}
      onFocus={onFocus}
    >
      {options.map((opt) => {
        const isChecked = String(value) === String(opt.code);
        return (
          <label 
            key={opt.code} 
            className={`flex items-center space-x-2 text-sm cursor-pointer select-none ${
              !isEditable ? "opacity-60 cursor-not-allowed" : "hover:text-foreground/80"
            }`}
          >
            <input
              type="radio"
              name={field.code}
              value={opt.code}
              checked={isChecked}
              disabled={!isEditable}
              onChange={() => isEditable && onChange(opt.code)}
              className="h-4 w-4 border-input text-primary focus:ring-ring focus:ring-offset-2"
            />
            <span className="text-foreground/90 font-medium">{opt.label || opt.code}</span>
          </label>
        );
      })}
    </div>
  );
};

export default RadioGroupControl;
