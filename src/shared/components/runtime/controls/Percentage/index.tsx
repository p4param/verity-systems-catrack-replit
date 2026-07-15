import React from "react";
import { Input } from "@/components/ui/input";
import { RuntimeControlProps } from "../types";

export const PercentageControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
}) => {
  const isEditable = !disabled && !readonly;

  return (
    <div className="relative flex items-center w-full">
      <Input
        type="number"
        step="any"
        aria-label={field.label || field.code}
        disabled={!isEditable}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        onBlur={onBlur}
        onFocus={onFocus}
        className="pr-8 w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <span 
        className="absolute right-3 text-sm text-muted-foreground select-none pointer-events-none"
        aria-hidden="true"
      >
        %
      </span>
    </div>
  );
};

export default PercentageControl;
