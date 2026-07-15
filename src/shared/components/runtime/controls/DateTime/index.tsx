import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const DateTimeControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly,
}) => {
  const isEditable = !disabled && !readonly;
  // Normalize ISO string or datetime-local value
  const inputValue = value ? String(value).slice(0, 16) : "";

  return (
    <Input
      type="datetime-local"
      aria-label={field.label || field.code}
      disabled={!isEditable}
      value={inputValue}
      onChange={(e) => onChange(e.target.value || null)}
      onBlur={onBlur}
      onFocus={onFocus}
      className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
};

export default DateTimeControl;
