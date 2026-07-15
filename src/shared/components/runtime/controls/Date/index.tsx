import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const DateControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
}) => {
  const isEditable = !disabled && !readonly;

  // Render standardized date input format
  const dateVal = value ? String(value).split("T")[0] : "";

  return (
    <Input
      type="date"
      aria-label={field.label || field.code}
      disabled={!isEditable}
      value={dateVal}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
};

export default DateControl;
