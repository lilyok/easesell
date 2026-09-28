import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-10 sm:px-6 sm:pb-20 lg:justify-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(72vh,640px)] overflow-hidden sm:rounded-b-[2.5rem]">
          <div className="es-drift absolute inset-0 bg-[radial-gradient(circle_at_28%_38%,rgba(31,138,112,0.42),transparent_55%),radial-gradient(circle_at_78%_28%,rgba(227,178,60,0.3),transparent_48%),linear-gradient(145deg,#163f36_0%,#0d2621_52%,#1f4038_100%)]" />
          <div className="absolute inset-0 opacity-35 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23ffffff%27 fill-opacity=%270.08%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        </div>

        <div className="relative max-w-2xl space-y-6 text-[color:var(--es-paper)] lg:pb-8">
          <p className="es-rise font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
            EaseSell
          </p>
          <h1 className="es-rise es-rise-delay-1 font-[family-name:var(--font-display)] text-3xl leading-[1.12] font-medium tracking-tight text-white/95 sm:text-4xl lg:text-5xl">
            Turn closet clutter into Marketplace listings.
          </h1>
          <p className="es-rise es-rise-delay-2 max-w-lg text-base text-white/75 sm:text-lg">
            Photograph what you’re selling. We draft the listing at a fair used
            price and send it to Facebook Marketplace.
          </p>
          <div className="es-rise es-rise-delay-2 flex flex-wrap gap-3 pt-1">
            <Link
              href="/list"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-[color:var(--es-amber)] text-[color:var(--es-ink)] hover:bg-[#efc457]"
              )}
            >
              List items
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-8 border-t border-[color:var(--es-ink)]/10 pt-12 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--es-teal)]">
              01
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[color:var(--es-ink)]">
              Snap photos
            </h2>
            <p className="text-sm text-[color:var(--es-ink-soft)]">
              One draft per photo keeps the queue simple and reviewable.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--es-teal)]">
              02
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[color:var(--es-ink)]">
              Auto-fill from search
            </h2>
            <p className="text-sm text-[color:var(--es-ink-soft)]">
              Reverse image search prefers Amazon matches for title, description,
              and original price.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--es-teal)]">
              03
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[color:var(--es-ink)]">
              Send to Marketplace
            </h2>
            <p className="text-sm text-[color:var(--es-ink-soft)]">
              Edit anything, skip failures, then post ready drafts to Facebook.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
