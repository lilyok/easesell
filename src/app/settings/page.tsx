"use client";

import { useApp } from "@/context/app-context";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
  const { settings, updateSettings, hydrated } = useApp();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--es-teal)]">
          Settings
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[color:var(--es-ink)] sm:text-4xl">
          Listing defaults
        </h1>
        <p className="text-sm text-[color:var(--es-ink-soft)] sm:text-base">
          Control how EaseSell prices used items from the original match price.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-[color:var(--es-ink)]/10 bg-[color:var(--es-paper)]/80 p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Label htmlFor="discount">Discount of original price</Label>
              <p className="mt-1 text-sm text-[color:var(--es-ink-soft)]">
                Default is 30%. Ready drafts reprice when you change this.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Input
                id="discount"
                type="number"
                min={1}
                max={100}
                className="w-20 text-right"
                disabled={!hydrated}
                value={String(settings.discountPercent)}
                onValueChange={(raw) => {
                  const value = Number.parseInt(raw, 10);
                  if (Number.isNaN(value)) return;
                  updateSettings({
                    discountPercent: Math.min(100, Math.max(1, value)),
                  });
                }}
              />
              <span className="text-sm text-[color:var(--es-ink-soft)]">%</span>
            </div>
          </div>
          <Slider
            min={1}
            max={100}
            step={1}
            disabled={!hydrated}
            value={[settings.discountPercent]}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (typeof next === "number") {
                updateSettings({ discountPercent: next });
              }
            }}
          />
          <p className="text-sm text-[color:var(--es-ink-soft)]">
            Example: a $100 Amazon match lists at{" "}
            <strong className="text-[color:var(--es-ink)]">
              ${((100 * settings.discountPercent) / 100).toFixed(2)}
            </strong>
            .
          </p>
        </div>

        <Alert>
          <AlertTitle>Providers</AlertTitle>
          <AlertDescription>
            Image search and Facebook posting currently use mock/demo
            providers. The environment variables documented in the README are
            reserved for future live adapters; setting them alone does not
            enable live posting. See the README for{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              SERPAPI_KEY
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_FACEBOOK_APP_ID
            </code>
            .
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
