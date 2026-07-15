"use client";

import React, { useState } from "react";
import { LayoutSection } from "@/modules/platform/configuration/validations/layout-validation";
import { EntityFieldDefinition } from "../types/framework";
import { FormGroup } from "./FormGroup";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface FormSectionProps {
  section: LayoutSection;
  fieldMap: Map<string, EntityFieldDefinition>;
  onChange: (fieldCode: string, value: any) => void;
  mode: any;
}

const DynamicIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

export const FormSection: React.FC<FormSectionProps> = ({
  section,
  fieldMap,
  onChange,
  mode,
}) => {
  const [isExpanded, setIsExpanded] = useState(section.initiallyExpanded !== false);

  if (section.visible === false) return null;

  const visibleGroups = (section.groups || []).filter((grp) => {
    if (grp.visible === false) return false;
    const visibleRows = (grp.rows || []).filter((row) => {
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
    return visibleRows.length > 0;
  });

  if (visibleGroups.length === 0) return null;

  return (
    <div className={RuntimeDesignSystem.colors.cardBg}>
      {section.title && (
        <div
          className={cn(
            RuntimeDesignSystem.spacing.sectionHeaderPadding,
            RuntimeDesignSystem.colors.sectionHeaderBg,
            "flex items-center justify-between select-none rounded-t-xl",
            section.collapsible && "cursor-pointer hover:bg-muted/20 transition-colors"
          )}
          onClick={() => section.collapsible && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            {section.icon && (
              <DynamicIcon name={section.icon} className="w-4 h-4 text-primary" />
            )}
            <h3 className={RuntimeDesignSystem.typography.sectionTitle}>{section.title}</h3>
          </div>
          {section.collapsible && (
            <ChevronDown
              size={16}
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                !isExpanded && "-rotate-90"
              )}
            />
          )}
        </div>
      )}

      {isExpanded && (
        <div className={RuntimeDesignSystem.spacing.sectionPadding}>
          <div className="space-y-6">
            {visibleGroups
              .slice()
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((grp) => (
                <FormGroup
                  key={grp.id}
                  group={grp}
                  fieldMap={fieldMap}
                  onChange={onChange}
                  mode={mode}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormSection;
