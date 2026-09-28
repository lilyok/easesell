"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { ListingDraft } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DraftCardProps {
  draft: ListingDraft;
  discountPercent: number;
  onChange: (id: string, patch: Partial<ListingDraft>) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

function statusLabel(status: ListingDraft["status"]) {
  switch (status) {
    case "pending":
      return "Queued";
    case "searching":
      return "Searching";
    case "ready":
      return "Ready";
    case "failed":
      return "Not found";
    case "posting":
      return "Posting";
    case "posted":
      return "Posted";
  }
}

export function DraftCard({
  draft,
  discountPercent,
  onChange,
  onRemove,
  onRetry,
}: DraftCardProps) {
  const isBusy = draft.status === "searching" || draft.status === "pending";
  const isEditable = draft.status === "ready" || draft.status === "posted";

  return (
    <article
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 grid gap-4 overflow-hidden rounded-2xl border border-[color:var(--es-ink)]/10 bg-[color:var(--es-paper)]/80 p-4 shadow-[0_12px_40px_-28px_rgba(18,42,36,0.45)] duration-500 sm:grid-cols-[140px_1fr] sm:p-5",
        draft.status === "failed" && "border-destructive/30 bg-destructive/5",
        draft.status === "posted" && "border-[color:var(--es-teal)]/30"
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[color:var(--es-mist)] sm:aspect-auto sm:min-h-[140px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={draft.imageDataUrl}
          alt={draft.imageName}
          className="h-full w-full object-cover"
        />
        {isBusy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color:var(--es-ink)]/45 text-white backdrop-blur-[2px]">
            <Loader2 className="size-6 animate-spin" />
            <span className="text-xs font-medium tracking-wide">
              Searching…
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "font-medium",
                  draft.status === "ready" &&
                    "bg-[color:var(--es-teal)]/15 text-[color:var(--es-teal-deep)]",
                  draft.status === "failed" &&
                    "bg-destructive/15 text-destructive",
                  draft.status === "posted" &&
                    "bg-[color:var(--es-amber)]/25 text-[color:var(--es-ink)]"
                )}
              >
                {draft.status === "ready" && (
                  <CheckCircle2 className="mr-1 size-3" />
                )}
                {draft.status === "failed" && (
                  <AlertCircle className="mr-1 size-3" />
                )}
                {statusLabel(draft.status)}
              </Badge>
              {draft.source && (
                <span className="text-xs text-[color:var(--es-ink-soft)]">
                  via {draft.source === "amazon" ? "Amazon" : "web"} ·{" "}
                  {discountPercent}% of original
                </span>
              )}
            </div>
            <p className="truncate text-xs text-[color:var(--es-ink-soft)]">
              {draft.imageName}
            </p>
          </div>
          <div className="flex gap-1">
            {draft.status === "failed" && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Retry search"
                onClick={() => onRetry(draft.id)}
              >
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Remove draft"
              onClick={() => onRemove(draft.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {draft.status === "failed" && (
          <p className="text-sm text-destructive">
            {draft.errorMessage || "Product not found."}
          </p>
        )}

        {isEditable && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`title-${draft.id}`}>Title</Label>
              <Input
                id={`title-${draft.id}`}
                value={draft.title}
                onChange={(e) =>
                  onChange(draft.id, { title: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`desc-${draft.id}`}>Description</Label>
              <Textarea
                id={`desc-${draft.id}`}
                value={draft.description}
                rows={3}
                onChange={(e) =>
                  onChange(draft.id, { description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`price-${draft.id}`}>Listing price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id={`price-${draft.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className="pl-7"
                    value={draft.price}
                    onChange={(e) =>
                      onChange(draft.id, {
                        price: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Original price</Label>
                <p className="flex h-8 items-center text-sm text-[color:var(--es-ink-soft)]">
                  {draft.originalPrice != null
                    ? `$${draft.originalPrice.toFixed(2)}`
                    : "—"}
                </p>
              </div>
            </div>
            {draft.sourceUrl && (
              <a
                href={draft.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[color:var(--es-teal)] underline-offset-2 hover:underline"
              >
                View source match
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
