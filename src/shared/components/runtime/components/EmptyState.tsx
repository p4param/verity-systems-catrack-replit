import React from "react";
import { AlertCircle } from "lucide-react";
import { localizationService } from "../services/RuntimeServices";

import { RuntimeCulture } from "../types/framework";

interface EmptyStateProps {
  culture: RuntimeCulture;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ culture }) => {
  const title = localizationService.translate("platform.emptyState", culture, "No Layout Published");
  const desc = localizationService.translate("platform.emptyStateDesc", culture, "Publish an entity layout to render this form.");

  return (
    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-muted rounded-xl bg-card text-center space-y-4">
      <div className="p-3 bg-muted/50 rounded-full text-muted-foreground">
        <AlertCircle size={32} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground max-w-sm">{desc}</p>
      </div>
    </div>
  );
};

export default EmptyState;
