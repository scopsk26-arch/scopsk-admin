import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/DataPage";
import { api } from "@/lib/api/client";

function reviewReason(reason: string) {
  const known: Record<string, string> = {
    "The name looks non-Halal, or it names alcohol.":
      "The product name indicates a non-Halal item or an alcoholic product.",
    "It is marked Halal, but the name does not match.":
      "The product is marked Halal, but the name indicates a non-Halal item.",
    "Meat or poultry must be marked Halal before it can go live.":
      "Meat or poultry must be marked Halal before the product can go live.",
    "The name looks like spam, a link, or a phone number.":
      "The product name includes a link, a phone number, or other text that cannot be published.",
  };
  return known[reason] || reason;
}

function approvalBlocked(row: ProductReviewRow | null): boolean {
  if (!row) return false;
  if (row.aiHalal === false) return true;
  return (row.reasons || []).some((line) => /non-?\s*halal|alcohol|pork/i.test(line));
}

export type ProductReviewRow = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  halal?: boolean;
  aiHalal?: boolean | null;
  reasons?: string[];
  variants?: Array<{ name: string; unitPrice?: number | null }>;
};

export function ProductReviewDialog({
  row,
  open,
  onOpenChange,
  onDone,
}: {
  row: ProductReviewRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<void> | void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const blocked = approvalBlocked(row);

  const decide = async (decision: "approve" | "reject") => {
    if (!row) return;
    const note = reason.trim();
    if (decision === "reject" && note.length < 3) {
      toast.error("Write a reason before you reject");
      return;
    }
    setBusy(decision);
    try {
      await api.post(`/catalog/products/${row.id}/review`, { decision, reason: note });
      toast.success(decision === "approve" ? "Product is live" : "Product rejected");
      setReason("");
      onOpenChange(false);
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the review");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{row?.name || "Product review"}</DialogTitle>
          <DialogDescription>
            This product is pending. Approve puts it on the live list. Reject keeps it hidden.
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {row.category || "No category"} · {row.halal ? "Marked Halal" : "Not marked Halal"}
                {row.sku ? ` · ${row.sku}` : ""}
              </span>
              <StatusBadge status="pending" />
            </div>
            {(row.reasons || []).length ? (
              <ul className="text-sm text-destructive list-disc pl-4">
                {(row.reasons || []).map((line) => <li key={line}>{reviewReason(line)}</li>)}
              </ul>
            ) : null}
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason, only needed if you reject"
            />
            {blocked ? (
              <p className="text-sm text-destructive">
                Flagged non-Halal. Approve is disabled. Reject this product.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" disabled={Boolean(busy) || blocked} onClick={() => decide("approve")}>
                {busy === "approve" ? "Approving…" : "Approve"}
              </Button>
              <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => decide("reject")}>
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
