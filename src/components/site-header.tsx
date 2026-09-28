"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const onList = pathname.startsWith("/list");
  const onSettings = pathname.startsWith("/settings");

  return (
    <header className="relative z-20 border-b border-[color:var(--es-ink)]/8 bg-[color:var(--es-paper)]/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--es-ink)] transition-colors group-hover:text-[color:var(--es-teal)]">
            EaseSell
          </span>
          <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--es-ink-soft)] sm:inline">
            used → listed
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/list"
            className={cn(
              buttonVariants({ variant: onList ? "default" : "ghost", size: "sm" }),
              onList &&
                "bg-[color:var(--es-teal)] text-white hover:bg-[color:var(--es-teal-deep)]"
            )}
          >
            List items
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              onSettings && "bg-muted"
            )}
          >
            <Settings className="size-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
