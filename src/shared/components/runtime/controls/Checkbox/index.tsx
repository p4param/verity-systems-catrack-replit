import React from "react";
import { RuntimeControlProps } from "../types";

export const CheckboxControl: React.FC<RuntimeControlProps> = ({
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
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={`checkbox-${field.id}`}
        checked={!!value}
        disabled={!isEditable}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
        onFocus={onFocus}
        className="h-4 w-4 rounded border-input text-primary bg-background focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
};

export default CheckboxControl;
