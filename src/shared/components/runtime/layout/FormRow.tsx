"use client";

import React from "react";
import { LayoutRow } from "@/modules/platform/configuration/validations/layout-validation";
import { EntityFieldDefinition } from "../types/framework";
import { FormColumn } from "./FormColumn";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { cn } from "@/lib/utils";

interface FormRowProps {
  row: LayoutRow;
  fieldMap: Map<string, EntityFieldDefinition>;
  onChange: (fieldCode: string, value: any) => void;
  mode: any;
}

export const FormRow: React.FC<FormRowProps> = ({
  row,
  fieldMap,
  onChange,
  mode,
}) => {
  if (row.visible === false) return null;

  const visibleColumns = (row.columns || []).filter((col) => {
    if (col.visible === false) return false;
    const visiblePlacements = (col.placements || []).filter((placement) => {
      if (placement.visible === false || placement.hiddenOverride === true) return false;
      const field = fieldMap.get(placement.fieldId);
      return !!field;
    });
    return visiblePlacements.length > 0;
  });

  if (visibleColumns.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-12", RuntimeDesignSystem.spacing.rowGap)}>
      {visibleColumns
        .slice()
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map((col) => (
          <FormColumn
            key={col.id}
            column={col}
            fieldMap={fieldMap}
            onChange={onChange}
            mode={mode}
          />
        ))}
    </div>
  );
};

export default FormRow;
