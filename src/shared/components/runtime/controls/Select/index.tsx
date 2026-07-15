import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RuntimeControlProps } from "../types";

export const SelectControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
}) => {
  const isEditable = !disabled && !readonly;
  const options = field.options || [];

  return (
    <Select
      value={value || ""}
      onValueChange={onChange}
      disabled={!isEditable}
    >
      <SelectTrigger className="w-full" onBlur={onBlur} onFocus={onFocus}>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt: any) => (
          <SelectItem key={opt.code} value={opt.code}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SelectControl;
