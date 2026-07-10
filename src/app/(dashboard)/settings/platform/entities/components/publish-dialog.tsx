"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePublishEntity, useValidatePublishEntity } from "@/modules/platform/configuration/hooks/use-entities";
import { Loader2, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { ValidationResult } from "@/modules/platform/configuration/services/validation/types";
import { toast } from "sonner";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
}

export function PublishDialog({ open, onOpenChange, entityId, entityName, onSuccess }: PublishDialogProps) {
  const validateMutation = useValidatePublishEntity();
  const publishMutation = usePublishEntity();
  
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (open) {
      setValidationResult(null);
      validateMutation.mutateAsync(entityId)
        .then((res) => setValidationResult(res))
        .catch((err) => {
          toast.error(err.message || "Failed to validate publish");
          onOpenChange(false);
        });
    }
  }, [open, entityId]);

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync(entityId);
      toast.success(`${entityName} published successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish entity");
    }
  };

  const getIcon = (level: string) => {
    if (level === "ERROR") return <XCircle className="w-5 h-5 text-rose-500" />;
    if (level === "WARNING") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    if (level === "INFO") return <Info className="w-5 h-5 text-blue-500" />;
    return null;
  };

  const getBgClass = (level: string) => {
    if (level === "ERROR") return "bg-rose-500/10 border-rose-500/20";
    if (level === "WARNING") return "bg-amber-500/10 border-amber-500/20";
    if (level === "INFO") return "bg-blue-500/10 border-blue-500/20";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-border bg-card shadow-2xl shadow-black/40">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Publish Entity: <span className="text-primary">{entityName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {!validationResult && validateMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Running Progressive Validation Engine...</p>
            </div>
          )}

          {validationResult && (
            <div className="space-y-4">
              <div className="mb-4">
                {validationResult.isValid ? (
                  <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-3 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Entity is ready for publishing.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-lg border border-rose-500/20">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Entity failed validation. Please resolve errors to publish.</span>
                  </div>
                )}
              </div>

              {validationResult.messages.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {validationResult.messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${getBgClass(msg.level)}`}>
                      <div className="mt-0.5">{getIcon(msg.level)}</div>
                      <div>
                        <p className="text-sm font-semibold text-foreground/90">{msg.code}</p>
                        <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No warnings or information found. Everything looks perfect!</p>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!validationResult.isValid || publishMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Publish
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
