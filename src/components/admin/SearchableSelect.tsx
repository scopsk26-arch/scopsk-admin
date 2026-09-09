import { useMemo, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

/** Keep wheel events inside nested popovers (Dialog steals scroll otherwise). */
function stopWheelPropagation(e: WheelEvent) {
  e.stopPropagation();
}

function parseMultiValue(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return String(value)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search and select…",
  emptyLabel = "No results",
  allowClear = true,
  disabled = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  allowClear?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((o) => o.value === value || o.label === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="mt-1 w-full justify-between font-normal h-10"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0 ml-2">
            {allowClear && selected && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
                className="inline-flex"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                }}
              >
                <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[60]"
        align="start"
        onWheel={stopWheelPropagation}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter>
          <CommandInput placeholder="Search…" />
          <CommandList
            className="max-h-[240px] overflow-y-auto overscroll-contain"
            onWheel={stopWheelPropagation}
          >
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.value}`}
                  onSelect={() => {
                    onChange(o.value === value ? "" : o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected?.value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Multi-select searchable dropdown — keeps popover open while toggling. */
export function SearchableMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyLabel = "No results",
  disabled = false,
}: {
  value?: string | string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = useMemo(() => {
    const tokens = parseMultiValue(value);
    return tokens
      .map((token) => {
        const byId = options.find((o) => o.value === token);
        if (byId) return byId.value;
        const byLabel = options.find((o) => o.label.toLowerCase() === token.toLowerCase());
        return byLabel?.value ?? null;
      })
      .filter((id): id is string => Boolean(id));
  }, [value, options]);

  const selectedOptions = useMemo(
    () => options.filter((o) => selectedIds.includes(o.value)),
    [options, selectedIds],
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  /** Stop PopoverTrigger from opening before click; remove on pointerdown. */
  const stopTriggerAndRemove = (id: string, e: PointerEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    remove(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="mt-1 w-full justify-between font-normal h-auto min-h-10 py-1.5"
        >
          <div className="flex flex-1 flex-wrap gap-1.5 min-w-0 text-left">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            ) : (
              selectedOptions.map((o) => (
                <span
                  key={o.value}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium max-w-full"
                >
                  <span className="truncate">{o.label}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${o.label}`}
                    className="inline-flex shrink-0 rounded-sm opacity-60 hover:opacity-100 cursor-pointer"
                    onPointerDown={(e) => stopTriggerAndRemove(o.value, e)}
                    onClick={(e) => stopTriggerAndRemove(o.value, e)}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[60]"
        align="start"
        onWheel={stopWheelPropagation}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter>
          <CommandInput placeholder="Search…" />
          <CommandList
            className="max-h-[240px] overflow-y-auto overscroll-contain"
            onWheel={stopWheelPropagation}
          >
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = selectedIds.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.value}`}
                    onSelect={() => toggle(o.value)}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{o.label}</span>
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
