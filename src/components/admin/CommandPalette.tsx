import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "@tanstack/react-router";
import { groupedNav } from "./nav-config";
import { Plus, FileText, Truck, Store } from "lucide-react";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const go = (to: string) => { onOpenChange(false); navigate({ to }); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go("/rfqs")}><Plus className="h-4 w-4 mr-2" /> New RFQ</CommandItem>
          <CommandItem onSelect={() => go("/suppliers")}><Truck className="h-4 w-4 mr-2" /> Add Supplier</CommandItem>
          <CommandItem onSelect={() => go("/restaurants")}><Store className="h-4 w-4 mr-2" /> Add Restaurant</CommandItem>
          <CommandItem onSelect={() => go("/reports")}><FileText className="h-4 w-4 mr-2" /> Generate Report</CommandItem>
        </CommandGroup>

        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group}>
            <CommandSeparator />
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem key={item.to} onSelect={() => go(item.to)}>
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
