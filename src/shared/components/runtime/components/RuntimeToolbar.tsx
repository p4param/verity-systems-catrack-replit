import React from "react";
import { Button } from "@/components/ui/button";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { RefreshCw, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface RuntimeToolbarProps {
  onRefresh?: () => void;
  onExecuteWorkflow?: () => void;
  workflowState?: string;
  actions?: React.ReactNode;
}

export const RuntimeToolbar: React.FC<RuntimeToolbarProps> = ({
  onRefresh,
  onExecuteWorkflow,
  workflowState,
  actions,
}) => {
  return (
    <div className={cn(RuntimeDesignSystem.spacing.toolbarPadding, "flex items-center justify-between")}>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            title="Refresh record"
            aria-label="Refresh record"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        )}
        {onExecuteWorkflow && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExecuteWorkflow}
            title="Trigger state transition"
            aria-label="Trigger state transition"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Workflow
            {workflowState && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">
                {workflowState}
              </span>
            )}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  );
};

export default RuntimeToolbar;
