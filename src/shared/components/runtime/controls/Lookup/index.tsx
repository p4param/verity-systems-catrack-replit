import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Loader2, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { RuntimeControlProps } from "../types";
import { lookupService } from "../../services/RuntimeServices";

export const LookupControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
  recordContext,
}) => {
  const { fetchWithAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const recordValues = recordContext?.currentValues || {};
  const initialLabel = recordValues[`${field.code}_label`] ? String(recordValues[`${field.code}_label`]) : "";
  const [selectedLabel, setSelectedLabel] = useState<string>(initialLabel);

  const isEditable = !disabled && !readonly;

  const fetchOpts = async (q: string) => {
    setLoading(true);
    try {
      const res = await lookupService.fetchOptions(field, q, fetchWithAuth);
      setOptions(res);
      return res;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLabel && value) {
      fetchOpts("").then((opts) => {
        if (value && opts) {
          const selected = opts.find((o) => o.id === value);
          if (selected) setSelectedLabel(selected.label);
        }
      });
    } else {
      fetchOpts("");
    }
  }, [field, value, initialLabel]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchOpts(query);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Lookup for ${field.label || field.code}`}
          disabled={!isEditable}
          className="w-full justify-between font-normal focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onBlur={onBlur}
          onFocus={onFocus}
        >
          <span className="truncate">
            {value ? selectedLabel || value : "Select record..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 popover-content" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>No records found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onChange(option.id === value ? "" : option.id);
                      setSelectedLabel(option.label);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-primary",
                        value === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LookupControl;
