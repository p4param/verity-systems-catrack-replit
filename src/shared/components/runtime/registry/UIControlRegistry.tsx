import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getOptionProvider, OptionItem } from "../providers/option-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface BaseControlProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  recordData?: any;
}

export function TextControl({ field, value, onChange, disabled }: BaseControlProps) {
  return (
    <Input
      type="text"
      placeholder={`Enter ${field.label?.toLowerCase() || field.code}`}
      disabled={disabled}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberControl({ field, value, onChange, disabled }: BaseControlProps) {
  return (
    <Input
      type="number"
      step="any"
      placeholder={`Enter ${field.label?.toLowerCase() || field.code}`}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
    />
  );
}

export function BooleanControl({ field, value, onChange, disabled }: BaseControlProps) {
  return (
    <Switch
      checked={!!value}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
  );
}

export function DateControl({ field, value, onChange, disabled }: BaseControlProps) {
  return (
    <Input
      type="date"
      disabled={disabled}
      value={value ? String(value).split("T")[0] : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SelectControl({ field, value, onChange, disabled }: BaseControlProps) {
  const isStatic = !field.dataSource || field.dataSource === "STATIC";
  const initialStaticOptions = isStatic ? (field.options || []).map((opt: any) => ({
    id: opt.code,
    label: opt.label,
    ...opt
  })) : [];
  
  const [options, setOptions] = useState<OptionItem[]>(initialStaticOptions);
  const [loading, setLoading] = useState(!isStatic);

  useEffect(() => {
    if (isStatic) return;
    
    const provider = getOptionProvider(field.dataSource || "STATIC");
    provider.fetchOptions(field).then(opts => {
      setOptions(opts);
      setLoading(false);
    });
  }, [field, isStatic]);

  const selectedLabel = value ? (options.find(o => o.id === value || o.code === value)?.label || value) : "";

  return (
    <Select value={value || ""} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={loading ? "Loading..." : "Select an option"}>
          {value ? selectedLabel : (loading ? "Loading..." : "Select an option")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id || opt.code}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LookupControl({ field, value, onChange, disabled, recordData }: BaseControlProps) {
  const { fetchWithAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  
  // Initialize with hydrated label if available
  const initialLabel = recordData && recordData[`${field.code}_label`] ? recordData[`${field.code}_label`] : "";
  const [selectedLabel, setSelectedLabel] = useState<string>(initialLabel);

  const fetchOpts = async (q?: string) => {
    setLoading(true);
    try {
      const provider = getOptionProvider("LOOKUP");
      const res = await provider.fetchOptions(field, q || "", fetchWithAuth);
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
      fetchOpts("").then((opts: any[]) => {
        if (value && opts) {
          const selected = opts.find(o => o.id === value);
          if (selected) setSelectedLabel(selected.label);
        }
      });
    } else {
      // Just fetch to populate list
      fetchOpts("");
    }
  }, [field, value, initialLabel]);

  useEffect(() => {
    if (!open) return;
    const provider = getOptionProvider("LOOKUP");
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      provider.fetchOptions(field, query, fetchWithAuth).then(opts => {
        setOptions(opts);
        setLoading(false);
      });
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query, open, field]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value ? selectedLabel || value : "Select record..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search..." 
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
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
                        "mr-2 h-4 w-4",
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
}

export function MultiSelectControl({ field, value, onChange, disabled }: BaseControlProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedValues = Array.isArray(value) ? value : [];

  useEffect(() => {
    const provider = getOptionProvider(field.dataSource || "STATIC");
    provider.fetchOptions(field).then(opts => {
      setOptions(opts);
      setLoading(false);
    });
  }, [field]);

  const handleUnselect = (item: string) => {
    onChange(selectedValues.filter((i) => i !== item));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between h-auto min-h-10 font-normal px-3 py-2"
        >
          <div className="flex flex-wrap gap-1">
            {selectedValues.length === 0 && <span className="text-muted-foreground">Select options...</span>}
            {selectedValues.map((val) => {
              const opt = options.find((o) => o.id === val);
              return (
                <Badge variant="secondary" key={val} className="mr-1 mb-1">
                  {opt ? opt.label : val}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(val);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(val)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(selectedValues.filter((v) => v !== option.id));
                      } else {
                        onChange([...selectedValues, option.id]);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// The UI Control Registry matches uiControl strings to these React components
export const ControlRegistry: Record<string, React.FC<BaseControlProps>> = {
  TEXT_INPUT: TextControl,
  NUMBER_INPUT: NumberControl,
  DECIMAL_INPUT: NumberControl,
  SWITCH: BooleanControl,
  DATE_PICKER: DateControl,
  SELECT: SelectControl,
  MULTI_SELECT: MultiSelectControl,
  LOOKUP: LookupControl,
  // Add fallback
  DEFAULT: TextControl,
};
