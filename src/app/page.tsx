import Link from "next/link";
import { ArrowRight, Camera, Search, Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <section className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-8 -z-10 mx-auto h-[55vh] max-w-5xl overflow-hidden rounded-[2.5rem]">
          <div className="es-drift absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(31,138,112,0.35),transparent_55%),radial-gradient(circle_at_75%_30%,rgba(227,178,60,0.28),transparent_45%),linear-gradient(135deg,#1a4f42_0%,#0f2e28_55%,#243d36_100%)]" />
          <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23ffffff%27 fill-opacity=%270.08%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        </div>

        <div className="relative grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div className="space-y-6 text-[color:var(--es-paper)] lg:pb-8 lg:pt-16 lg:pl-4 lg:pr-2">
            <p className="es-rise text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--es-amber)]">
              EaseSell
            </p>
            <h1 className="es-rise es-rise-delay-1 font-[family-name:var(--font-display)] text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Turn closet clutter into Marketplace listings.
            </h1>
            <p className="es-rise es-rise-delay-2 max-w-xl text-base text-white/80 sm:text-lg">
              Photograph what you’re selling. EaseSell finds the product,
              drafts the listing at a fair used price, and sends it to Facebook
              Marketplace.
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
              <Link
                href="/settings"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                )}
              >
                Pricing settings
              </Link>
            </div>
          </div>

          <div className="es-rise es-rise-delay-2 relative mt-2 rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] backdrop-blur-md sm:p-6 lg:mt-24">
            <ol className="space-y-5">
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--es-teal)]/80">
                  <Camera className="size-4" />
                </span>
                <div>
                  <p className="font-medium">Snap or upload photos</p>
                  <p className="text-sm text-white/70">
                    One draft per photo — keep the flow simple.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--es-teal)]/80">
                  <Search className="size-4" />
                </span>
                <div>
                  <p className="font-medium">Reverse image search</p>
                  <p className="text-sm text-white/70">
                    Prefer Amazon matches for title, description, and original
                    price.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--es-teal)]/80">
                  <Share2 className="size-4" />
                </span>
                <div>
                  <p className="font-medium">Send to Marketplace</p>
                  <p className="text-sm text-white/70">
                    Edit anything, then post ready drafts to Facebook.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
