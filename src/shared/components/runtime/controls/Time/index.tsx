import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const TimeControl: React.FC<RuntimeControlProps> = ({
  field, value, onChange, onBlur, onFocus, disabled, readonly,
}) => {
  const isEditable = !disabled && !readonly;

  return (
    <Input
      type="time"
      aria-label={field.label || field.code}
      disabled={!isEditable}
      value={value ? String(value) : ""}
      onChange={(e) => onChange(e.target.value || null)}
      onBlur={onBlur}
      onFocus={onFocus}
      className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
};

export default TimeControl;
