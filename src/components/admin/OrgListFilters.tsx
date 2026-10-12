import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ORG_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
] as const;

export function ListFilters({
  sort,
  status,
  statusOptions,
  onSortChange,
  onStatusChange,
}: {
  sort: string;
  status: string;
  statusOptions?: { value: string; label: string }[];
  onSortChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}) {
  return (
    <>
      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="h-9 w-[140px] bg-card" aria-label="Sort">
          <SelectValue placeholder="Newest" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
        </SelectContent>
      </Select>
      {statusOptions?.length ? (
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 w-[168px] bg-card" aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </>
  );
}

export function OrgListFilters({
  sort,
  status,
  onSortChange,
  onStatusChange,
}: {
  sort: string;
  status: string;
  onSortChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}) {
  return (
    <ListFilters
      sort={sort}
      status={status}
      statusOptions={ORG_STATUS_FILTERS.map((option) => ({ ...option }))}
      onSortChange={onSortChange}
      onStatusChange={onStatusChange}
    />
  );
}
