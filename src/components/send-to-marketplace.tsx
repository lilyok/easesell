"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, LogOut, Share2 } from "lucide-react";
import type { ListingDraft } from "@/lib/types";
import { useApp } from "@/context/app-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M14 8h2.5V4.5H14c-2.3 0-4 1.8-4 4.2V11H7.5v3.5H10V20h3.5v-5.5H16L16.5 11H13.5V8.8c0-.5.3-.8.9-.8Z" />
    </svg>
  );
}

interface AuthInfo {
  connected: boolean;
  displayName: string | null;
  mode: "mock" | "live";
  provider?: string;
}

export function SendToMarketplace({ drafts }: { drafts: ListingDraft[] }) {
  const { markDraftsPosted } = useApp();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postedCount, setPostedCount] = useState(0);

  const readyDrafts = useMemo(
    () => drafts.filter((d) => d.status === "ready"),
    [drafts]
  );
  const failedCount = drafts.filter((d) => d.status === "failed").length;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/marketplace")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAuth(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load Facebook connection status.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAuth(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLoadingAuth(true);
      setError(null);
      setPostedCount(0);
    }
  }

  async function connect() {
    setLoadingAuth(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setAuth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoadingAuth(false);
    }
  }

  async function disconnect() {
    setLoadingAuth(true);
    try {
      await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      setAuth({ connected: false, displayName: null, mode: "mock" });
    } finally {
      setLoadingAuth(false);
    }
  }

  async function post() {
    if (readyDrafts.length === 0) return;
    setPosting(true);
    setError(null);
    setPostedCount(0);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post", drafts: readyDrafts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Posting failed");
      const okIds = (data.results || [])
        .filter((r: { success: boolean }) => r.success)
        .map((r: { draftId: string }) => r.draftId);
      markDraftsPosted(okIds);
      setPostedCount(okIds.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Posting failed");
    } finally {
      setPosting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            disabled={readyDrafts.length === 0}
            className="bg-[color:var(--es-ink)] text-[color:var(--es-paper)] hover:bg-[color:var(--es-teal-deep)]"
          />
        }
      >
        <Share2 className="size-4" />
        Send to Facebook Marketplace
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Facebook Marketplace</DialogTitle>
          <DialogDescription>
            Connect with Facebook, then post ready drafts. Failed drafts are
            skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{readyDrafts.length} ready</Badge>
            {failedCount > 0 && (
              <Badge variant="outline">{failedCount} failed (ignored)</Badge>
            )}
            <Badge variant="outline">
              {(auth?.mode || "mock") === "mock" ? "Demo provider" : "Live"}
            </Badge>
          </div>

          {loadingAuth && !auth ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking Facebook connection…
            </div>
          ) : auth?.connected ? (
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  Connected as {auth.displayName || "Facebook user"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mock login — no real Facebook account used
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Disconnect"
                onClick={() => void disconnect()}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full bg-[#1877F2] text-white hover:bg-[#166FE5]"
              disabled={loadingAuth}
              onClick={() => void connect()}
            >
              {loadingAuth ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FacebookGlyph className="size-4" />
              )}
              Continue with Facebook
            </Button>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {postedCount > 0 && (
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>Posted {postedCount} listing(s)</AlertTitle>
              <AlertDescription>
                Demo mode simulated Marketplace drafts. Wire live Facebook
                credentials to post for real.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={
              !auth?.connected || readyDrafts.length === 0 || posting
            }
            onClick={() => void post()}
            className="bg-[color:var(--es-teal)] text-white hover:bg-[color:var(--es-teal-deep)]"
          >
            {posting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Posting…
              </>
            ) : (
              `Post ${readyDrafts.length} listing${readyDrafts.length === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
