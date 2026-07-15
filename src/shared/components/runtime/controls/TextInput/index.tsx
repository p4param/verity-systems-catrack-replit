import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const TextInputControl: React.FC<RuntimeControlProps> = ({
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
  const placeholder = layoutMetadata?.placeholder || (field.metadata?.placeholder as string) || `Enter ${field.label || field.code}`;

  return (
    <Input
      type="text"
      aria-label={field.label || field.code}
      placeholder={placeholder}
      disabled={!isEditable}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
};

export default TextInputControl;
