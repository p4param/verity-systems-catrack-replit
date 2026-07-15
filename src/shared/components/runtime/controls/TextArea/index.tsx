import React, { useRef, useEffect } from "react";
import { RuntimeControlProps } from "../types";

export const TextAreaControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
  layoutMetadata,
}) => {
  const isEditable = !disabled && !readonly;
  const placeholder = layoutMetadata?.placeholder || (field.metadata?.placeholder as string) || `Enter ${field.label || field.code}`;
  
  // Resolve properties from metadata config
  const properties = field.properties || (field.metadata?.properties as Record<string, any>) || {};
  const rows = properties.rows ?? 4;
  const autoResize = properties.autoResize ?? false;
  const characterLimit = properties.characterLimit ?? null;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize logic
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, autoResize]);

  const valStr = value || "";
  const currentLength = valStr.length;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let textVal = e.target.value;
    if (characterLimit && textVal.length > characterLimit) {
      textVal = textVal.slice(0, characterLimit);
    }
    onChange(textVal);
  };

  return (
    <div className="space-y-1 w-full">
      <textarea
        ref={textareaRef}
        aria-label={field.label || field.code}
        placeholder={placeholder}
        disabled={!isEditable}
        value={valStr}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        rows={rows}
        maxLength={characterLimit || undefined}
        className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
      />
      {characterLimit && (
        <div className="text-right text-[10px] text-muted-foreground tracking-wide font-medium">
          {currentLength} / {characterLimit} characters
        </div>
      )}
    </div>
  );
};

export default TextAreaControl;
