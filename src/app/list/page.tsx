"use client";

import { useMemo } from "react";
import { Inbox, Trash2 } from "lucide-react";
import { useApp } from "@/context/app-context";
import { PhotoPicker } from "@/components/photo-picker";
import { DraftCard } from "@/components/draft-card";
import { SendToMarketplace } from "@/components/send-to-marketplace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ListPage() {
  const {
    drafts,
    settings,
    hydrated,
    createDraftsFromFiles,
    updateDraft,
    removeDraft,
    clearDrafts,
    retrySearch,
  } = useApp();

  const counts = useMemo(() => {
    return {
      ready: drafts.filter((d) => d.status === "ready").length,
      searching: drafts.filter(
        (d) => d.status === "searching" || d.status === "pending"
      ).length,
      failed: drafts.filter((d) => d.status === "failed").length,
      posted: drafts.filter((d) => d.status === "posted").length,
    };
  }, [drafts]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--es-teal)]">
            List items
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[color:var(--es-ink)] sm:text-4xl">
            Draft listings from photos
          </h1>
          <p className="max-w-xl text-sm text-[color:var(--es-ink-soft)] sm:text-base">
            Upload item photos, review auto-filled drafts priced at{" "}
            <strong className="font-semibold text-[color:var(--es-ink)]">
              {settings.discountPercent}%
            </strong>{" "}
            of the original, then send ready ones to Facebook Marketplace.
          </p>
        </div>
        <SendToMarketplace drafts={drafts} />
      </div>

      <PhotoPicker onPick={createDraftsFromFiles} compact={drafts.length > 0} />

      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[color:var(--es-ink)]">
              Drafts
            </h2>
            {hydrated && drafts.length > 0 && (
              <>
                <Badge variant="secondary">{counts.ready} ready</Badge>
                {counts.searching > 0 && (
                  <Badge variant="outline">{counts.searching} searching</Badge>
                )}
                {counts.failed > 0 && (
                  <Badge variant="outline">{counts.failed} failed</Badge>
                )}
                {counts.posted > 0 && (
                  <Badge variant="outline">{counts.posted} posted</Badge>
                )}
              </>
            )}
          </div>
          {drafts.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearDrafts}
            >
              <Trash2 className="size-4" />
              Clear all
            </Button>
          )}
        </div>

        {!hydrated && (
          <div className="rounded-2xl border border-dashed border-[color:var(--es-ink)]/15 bg-[color:var(--es-paper)]/50 px-6 py-16 text-center text-sm text-[color:var(--es-ink-soft)]">
            Loading drafts…
          </div>
        )}

        {hydrated && drafts.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--es-ink)]/15 bg-[color:var(--es-paper)]/50 px-6 py-16 text-center">
            <Inbox className="size-8 text-[color:var(--es-teal)]/70" />
            <div className="space-y-1">
              <p className="font-[family-name:var(--font-display)] text-lg text-[color:var(--es-ink)]">
                No drafts yet
              </p>
              <p className="max-w-sm text-sm text-[color:var(--es-ink-soft)]">
                Choose photos above to create drafts. Tip: name a file with
                “fail” to demo the not-found path.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              discountPercent={settings.discountPercent}
              onChange={updateDraft}
              onRemove={removeDraft}
              onRetry={(id) => void retrySearch(id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
