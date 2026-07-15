"use client";

import React from "react";
import { LayoutGroup } from "@/modules/platform/configuration/validations/layout-validation";
import { EntityFieldDefinition } from "../types/framework";
import { FormRow } from "./FormRow";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { cn } from "@/lib/utils";

interface FormGroupProps {
  group: LayoutGroup;
  fieldMap: Map<string, EntityFieldDefinition>;
  onChange: (fieldCode: string, value: any) => void;
  mode: any;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  group,
  fieldMap,
  onChange,
  mode,
}) => {
  if (group.visible === false) return null;

  const visibleRows = (group.rows || []).filter((row) => {
    if (row.visible === false) return false;
    const visibleCols = (row.columns || []).filter((col) => {
      if (col.visible === false) return false;
      const visiblePls = (col.placements || []).filter((placement) => {
        if (placement.visible === false || placement.hiddenOverride === true) return false;
        const field = fieldMap.get(placement.fieldId);
        return !!field;
      });
      return visiblePls.length > 0;
    });
    return visibleCols.length > 0;
  });

  if (visibleRows.length === 0) return null;

  return (
    <div className={RuntimeDesignSystem.spacing.groupSpacing}>
      {group.title && (
        <h4 className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground")}>
          {group.title}
        </h4>
      )}
      {visibleRows
        .slice()
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map((row) => (
          <FormRow
            key={row.id}
            row={row}
            fieldMap={fieldMap}
            onChange={onChange}
            mode={mode}
          />
        ))}
    </div>
  );
};

export default FormGroup;
