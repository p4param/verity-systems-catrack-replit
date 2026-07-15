"use client";

import React from "react";
import { LayoutColumn } from "@/modules/platform/configuration/validations/layout-validation";
import { EntityFieldDefinition } from "../types/framework";
import { FieldRenderer } from "./FieldRenderer";
import { RuntimeControlProps } from "../controls/types";
import { useRuntimeContext } from "../context/use-runtime-context";
import { useRecordContext } from "../context/use-record-context";

interface FormColumnProps {
  column: LayoutColumn;
  fieldMap: Map<string, EntityFieldDefinition>;
  onChange: (fieldCode: string, value: any) => void;
  mode: any;
}

function spanToClasses(span?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }): string {
  if (!span) return "col-span-12 md:col-span-6";
  const classes: string[] = [];
  if (span.xs) classes.push(`col-span-${span.xs}`);
  if (span.sm) classes.push(`sm:col-span-${span.sm}`);
  if (span.md) classes.push(`md:col-span-${span.md}`);
  if (span.lg) classes.push(`lg:col-span-${span.lg}`);
  if (span.xl) classes.push(`xl:col-span-${span.xl}`);
  return classes.join(" ") || "col-span-12";
}

export const FormColumn: React.FC<FormColumnProps> = ({
  column,
  fieldMap,
  onChange,
  mode,
}) => {
  const runtimeContext = useRuntimeContext();
  const recordContext = useRecordContext();

  if (column.visible === false) return null;

  const visiblePlacements = (column.placements || []).filter((placement) => {
    if (placement.visible === false || placement.hiddenOverride === true) return false;
    const field = fieldMap.get(placement.fieldId);
    return !!field;
  });

  if (visiblePlacements.length === 0) return null;

  return (
    <div className={spanToClasses(column.span)}>
      <div className="space-y-4">
        {visiblePlacements
          .slice()
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map((placement) => {
            const field = fieldMap.get(placement.fieldId)!;

            const controlProps: RuntimeControlProps = {
              field,
              fieldMetadata: field.metadata || {},
              layoutMetadata: placement,
              appearance: placement.metadata || {},
              permissions: {
                canView: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
              },
              runtimeContext,
              recordContext,
              value: recordContext.currentValues[field.code],
              onChange: (val) => onChange(field.code, val),
              mode,
            };

            return (
              <FieldRenderer 
                key={placement.id} 
                props={controlProps} 
              />
            );
          })}
      </div>
    </div>
  );
};

export default FormColumn;
