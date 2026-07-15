"use client";

import React from "react";
import { LayoutTab } from "@/modules/platform/configuration/validations/layout-validation";
import { EntityFieldDefinition } from "../types/framework";
import { FormSection } from "./FormSection";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface FormTabProps {
  tabs: LayoutTab[];
  fieldMap: Map<string, EntityFieldDefinition>;
  onChange: (fieldCode: string, value: any) => void;
  mode: any;
}

export const FormTab: React.FC<FormTabProps> = ({
  tabs,
  fieldMap,
  onChange,
  mode,
}) => {
  const visibleTabs = (tabs || []).filter((tab) => {
    if (tab.visible === false) return false;
    // Check if tab has at least one visible section containing fields
    const visibleSections = (tab.sections || []).filter((sec) => {
      if (sec.visible === false) return false;
      const visibleGrps = (sec.groups || []).filter((grp) => {
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
      return visibleGrps.length > 0;
    });
    return visibleSections.length > 0;
  });

  if (visibleTabs.length === 0) return null;

  const sortedTabs = visibleTabs.slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const showTabsList = sortedTabs.length > 1;

  return (
    <Tabs defaultValue={sortedTabs[0]?.code} className="w-full">
      {showTabsList && (
        <TabsList className={cn(RuntimeDesignSystem.spacing.tabListPadding, "mb-4")}>
          {sortedTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.code}
              className={cn(RuntimeDesignSystem.typography.tabLabel)}
            >
              {tab.title || tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
      )}

      {sortedTabs.map((tab) => {
        const visibleSections = (tab.sections || []).filter((sec) => {
          if (sec.visible === false) return false;
          const visibleGrps = (sec.groups || []).filter((grp) => {
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
          return visibleGrps.length > 0;
        });

        return (
          <TabsContent key={tab.id} value={tab.code} className="space-y-6">
            {visibleSections
              .slice()
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((section) => (
                <FormSection
                  key={section.id}
                  section={section}
                  fieldMap={fieldMap}
                  onChange={onChange}
                  mode={mode}
                />
              ))}
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default FormTab;
