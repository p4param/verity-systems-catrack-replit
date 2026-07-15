import React from "react";
import { AlertCircle } from "lucide-react";
import { localizationService } from "../services/RuntimeServices";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { cn } from "@/lib/utils";

import { RuntimeCulture } from "../types/framework";

interface ValidationSummaryProps {
  errors: Record<string, string>;
  culture: RuntimeCulture;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({ errors, culture }) => {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return null;

  const singularText = localizationService.translate("platform.requiredAttentionOne", culture, "field requires attention.");
  const pluralText = localizationService.translate("platform.requiredAttention", culture, "fields require attention.");
  const warningText = errorKeys.length === 1 ? `${errorKeys.length} ${singularText}` : `${errorKeys.length} ${pluralText}`;

  return (
    <div 
      className={cn(
        "p-4 border rounded-lg flex items-start gap-3 shadow-sm",
        RuntimeDesignSystem.colors.validationSummaryBg
      )}
      role="alert"
      aria-labelledby="validation-summary-title"
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <h5 id="validation-summary-title" className="text-sm font-bold leading-none tracking-tight">
          {warningText}
        </h5>
        <ul className="text-xs list-disc list-inside opacity-90 space-y-0.5">
          {errorKeys.map((key) => (
            <li key={key}>
              <span className="font-semibold">{key}</span>: {errors[key]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ValidationSummary;
