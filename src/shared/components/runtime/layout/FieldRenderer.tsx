"use client";

import React, { useEffect, useCallback } from "react";
import { RuntimeControlProps } from "../controls/types";
import { resolveControl, getControlDefinition } from "../registry/UIControlRegistry";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { cn } from "@/lib/utils";
import { runtimeEventBus } from "../services/EventBus";
import { RuntimeEventType } from "../types/framework";

interface FieldRendererProps {
  props: RuntimeControlProps;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ props }) => {
  const { field, layoutMetadata, value, runtimeContext, recordContext, required, readonly, disabled, onChange } = props;

  const error = recordContext.validation.errors?.[field.code];
  const isRequired = required || layoutMetadata?.requiredOverride || field.required;
  const isReadOnly = !!(readonly || layoutMetadata?.readOnlyOverride || field.metadata?.isReadOnly);
  const isDisabled = !!(disabled || isReadOnly);
  const label = field.label || field.code;

  // ─── Resolve control definition + lifecycle ────────────────────────────────
  const definition = getControlDefinition(field.uiControl);
  const lifecycle = definition?.lifecycle;

  useEffect(() => {
    lifecycle?.onInitialize?.(field.code, value);
    runtimeEventBus.publish({
      type: RuntimeEventType.INITIALIZE,
      source: field.code,
      timestamp: Date.now(),
      payload: { fieldCode: field.code, value },
    });
    return () => {
      lifecycle?.onDestroy?.(field.code);
      runtimeEventBus.publish({
        type: RuntimeEventType.DESTROY,
        source: field.code,
        timestamp: Date.now(),
        payload: { fieldCode: field.code },
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.code]);

  // Lifecycle-aware onChange
  const handleChange = useCallback((next: unknown) => {
    // onValueChanging can cancel the change by returning false
    if (lifecycle?.onValueChanging) {
      const allowed = lifecycle.onValueChanging(field.code, value, next);
      if (allowed === false) return;
    }
    onChange(next as any);
    lifecycle?.onValueChanged?.(field.code, next);
  }, [field.code, value, onChange, lifecycle]);

  // Lifecycle-aware onFocus
  const handleFocus = useCallback(() => {
    lifecycle?.onFocus?.(field.code);
    runtimeEventBus.publish({
      type: RuntimeEventType.FOCUS,
      source: field.code,
      timestamp: Date.now(),
      payload: { fieldCode: field.code },
    });
  }, [field.code, lifecycle]);

  // Lifecycle-aware onBlur
  const handleBlur = useCallback(() => {
    lifecycle?.onBlur?.(field.code, value);
    // Custom validation
    const customError = lifecycle?.onValidate?.(field.code, value);
    runtimeEventBus.publish({
      type: RuntimeEventType.BLUR,
      source: field.code,
      timestamp: Date.now(),
      payload: { fieldCode: field.code, value, customError },
    });
  }, [field.code, value, lifecycle]);

  if (layoutMetadata?.visible === false || layoutMetadata?.hiddenOverride === true) {
    return null;
  }

  // Resolve the actual control component from the Registry.
  // NOTE: field.version is the database record version of the field definition — it has
  // NOTHING to do with the control's semver version. Always resolve against "1.0.0"
  // (the current Core control version). When multi-version control packages are released,
  // a separate `controlVersion` manifest field will carry the control's declared version.
  const ControlComponent = resolveControl(field.uiControl, "1.0.0");

  const labelPosition = layoutMetadata?.labelPosition || "TOP";

  const renderLabel = () => {
    if (labelPosition === "HIDDEN") return null;
    return (
      <label
        htmlFor={`control-${field.id}`}
        className={cn(
          RuntimeDesignSystem.typography.fieldLabel,
          labelPosition === "LEFT" && "w-1/3 text-right pr-4 pt-2",
          labelPosition === "RIGHT" && "w-1/3 text-left pl-4 pt-2"
        )}
      >
        {label}
        {isRequired && (
          <span 
            className="text-rose-500 font-medium ml-1 text-[10px]" 
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
    );
  };

  return (
    <div 
      className={cn(
        RuntimeDesignSystem.spacing.fieldGap,
        "w-full",
        (labelPosition === "LEFT" || labelPosition === "RIGHT") && "flex items-start"
      )}
    >
      {labelPosition !== "RIGHT" && renderLabel()}

      <div className={cn("flex-1 w-full flex flex-col gap-1")}>
        <div className="relative w-full">
          <ControlComponent
            {...props}
            disabled={isDisabled}
            required={isRequired}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {isReadOnly && (
            <div 
              className="absolute inset-0 bg-muted/5 opacity-50 cursor-not-allowed" 
              title="Read-only field"
            />
          )}
        </div>

        {/* Localized Help Text */}
        {layoutMetadata?.helpText && (
          <span className={RuntimeDesignSystem.typography.fieldHelp}>
            {layoutMetadata.helpText}
          </span>
        )}

        {/* Localized Error message */}
        {error && (
          <span 
            className={RuntimeDesignSystem.typography.fieldError}
            role="alert"
          >
            {error}
          </span>
        )}
      </div>

      {labelPosition === "RIGHT" && renderLabel()}
    </div>
  );
};

export default FieldRenderer;
