"use client";

import { useId, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoPickerProps {
  onPick: (files: File[]) => Promise<void>;
  compact?: boolean;
}

export function PhotoPicker({ onPick, compact = false }: PhotoPickerProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await onPick(Array.from(fileList));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The photos could not be read."
      );
    } finally {
      setBusy(false);
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      if (input) input.value = "";
    }
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed transition-all duration-300",
        compact ? "p-5" : "p-8 sm:p-12",
        dragging
          ? "border-[color:var(--es-teal)] bg-[color:var(--es-teal)]/8 scale-[1.01]"
          : "border-[color:var(--es-ink)]/15 bg-[color:var(--es-paper)]/60 hover:border-[color:var(--es-teal)]/50"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[color:var(--es-amber)]/20 blur-3xl transition-opacity",
          dragging ? "opacity-100" : "opacity-60"
        )}
      />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--es-teal)]/10 text-[color:var(--es-teal)]">
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="size-5" />
          )}
        </div>
        <div className="space-y-1">
          <p className="font-[family-name:var(--font-display)] text-lg text-[color:var(--es-ink)] sm:text-xl">
            {busy ? "Creating drafts…" : "Drop photos of what you’re selling"}
          </p>
          <p className="max-w-md text-sm text-[color:var(--es-ink-soft)]">
            One draft per photo. We’ll reverse-search each image, prefer Amazon
            matches, and prefill title, description, and price.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={busy}
          nativeButton={false}
          className="mt-1 bg-[color:var(--es-teal)] text-white hover:bg-[color:var(--es-teal-deep)]"
          render={<label htmlFor={inputId} />}
        >
          {busy ? "Working…" : "Choose photos"}
        </Button>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
