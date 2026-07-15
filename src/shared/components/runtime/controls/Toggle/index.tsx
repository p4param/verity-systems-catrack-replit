import React from "react";
import { Switch } from "@/components/ui/switch";
import { RuntimeControlProps } from "../types";

export const ToggleControl: React.FC<RuntimeControlProps> = ({
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
    <Switch
      checked={!!value}
      onChange={(e: any) => onChange(e.target.checked)}
      disabled={!isEditable}
      onBlur={onBlur}
      onFocus={onFocus}
    />
  );
};

export default ToggleControl;
