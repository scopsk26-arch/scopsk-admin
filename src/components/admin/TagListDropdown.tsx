import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function normalizeItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v && v !== "—");
  }
  if (value == null || value === "" || value === "—") return [];
  return String(value)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Compact table cell: first item + dropdown for the rest (keeps row height stable). */
export function TagListDropdown({
  value,
  empty = "—",
  previewCount = 1,
  className,
}: {
  value: unknown;
  empty?: string;
  previewCount?: number;
  className?: string;
}) {
  const items = normalizeItems(value);
  if (!items.length) {
    return <span className="text-muted-foreground">{empty}</span>;
  }

  const preview = items.slice(0, Math.max(1, previewCount));
  const rest = items.length - preview.length;

  if (rest <= 0) {
    return (
      <span className={cn("text-sm truncate max-w-[160px] inline-block align-middle", className)} title={items.join(", ")}>
        {preview.join(", ")}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-8 max-w-[200px] justify-between gap-1.5 px-2 font-normal text-xs",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">{preview.join(", ")}</span>
          <span className="shrink-0 inline-flex items-center gap-0.5 text-muted-foreground">
            +{rest}
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" onClick={(e) => e.stopPropagation()}>
        <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
          {items.length} selected
        </p>
        <ul className="max-h-56 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              {item}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
