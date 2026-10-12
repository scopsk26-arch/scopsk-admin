import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, formatStatusLabel } from "@/components/admin/DataPage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateOrganization } from "@/lib/api/resources";
import { cn } from "@/lib/utils";

function pillClass(status: string) {
  const s = status.toLowerCase();
  if (/active|approved|paid|verified|published|resolved|accepted|live|open|won/.test(s)) {
    return "bg-success/15 text-success";
  }
  if (/suspend|reject|cancel|overdue|closed|expired|fail|lost/.test(s)) {
    return "bg-destructive/10 text-destructive";
  }
  if (/pending|draft|wait|review|submitted|inactive|archived/.test(s)) {
    return "bg-warning/15 text-warning";
  }
  return "bg-muted text-muted-foreground";
}

export function StatusMenu({
  status,
  options,
  disabled,
  onChange,
}: {
  status: string;
  options: string[];
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = String(status || "").trim().toLowerCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Update status"
          disabled={disabled}
          className="inline-flex items-center rounded-md disabled:opacity-60"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <StatusBadge status={status} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-60 p-0"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="px-3 py-2.5 text-sm font-semibold">Update status</div>
        <div className="border-t border-border py-1">
          {options.map((option) => {
            const selected = option.toLowerCase() === current;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60 disabled:opacity-60"
                onClick={() => {
                  setOpen(false);
                  if (!selected) onChange(option);
                }}
              >
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    pillClass(option),
                  )}
                >
                  {formatStatusLabel(option)}
                </span>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0 text-foreground" aria-label="Current" />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ORG_STATUS_OPTIONS = ["active", "pending", "suspended", "rejected"];

export function OrgStatusMenu({
  id,
  status,
  type,
}: {
  id: string;
  status: string;
  type: "restaurant" | "supplier";
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const options = type === "supplier" ? [...ORG_STATUS_OPTIONS, "verified"] : ORG_STATUS_OPTIONS;

  return (
    <StatusMenu
      status={status}
      options={options}
      disabled={saving}
      onChange={async (next) => {
        setSaving(true);
        try {
          await updateOrganization(id, { status: next }, type);
          toast.success("Status updated");
          await queryClient.invalidateQueries({ queryKey: ["organizations", type] });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update status");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
