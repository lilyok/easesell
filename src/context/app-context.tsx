"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  listingPriceFromOriginal,
  type AppSettings,
  type ListingDraft,
} from "@/lib/types";
import type { ImageSearchResult } from "@/providers/image-search";

const SETTINGS_KEY = "easesell.settings";
const DRAFTS_KEY = "easesell.drafts";

interface AppContextValue {
  settings: AppSettings;
  drafts: ListingDraft[];
  hydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  createDraftsFromFiles: (files: File[]) => Promise<void>;
  updateDraft: (id: string, patch: Partial<ListingDraft>) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  retrySearch: (id: string) => Promise<void>;
  markDraftsPosted: (ids: string[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as AppSettings;
    return {
      discountPercent:
        typeof parsed.discountPercent === "number"
          ? parsed.discountPercent
          : DEFAULT_SETTINGS.discountPercent,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadDrafts(): ListingDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ListingDraft[];
  } catch {
    return [];
  }
}

function persistSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  emit();
}

function persistDrafts(drafts: ListingDraft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  emit();
}

/** Downscale large photos so mock search payloads stay under API body limits. */
async function compressImageFile(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read image"));
    el.src = raw;
  });

  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function searchImage(
  imageDataUrl: string,
  imageName: string
): Promise<ImageSearchResult> {
  const res = await fetch("/api/image-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, imageName }),
  });
  if (!res.ok) {
    throw new Error("Image search request failed");
  }
  return res.json();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const storedSettings = useSyncExternalStore(
    subscribe,
    loadSettings,
    () => DEFAULT_SETTINGS
  );
  const storedDrafts = useSyncExternalStore(subscribe, loadDrafts, () => []);

  const [settingsOverride, setSettingsOverride] = useState<AppSettings | null>(
    null
  );
  const [draftsOverride, setDraftsOverride] = useState<ListingDraft[] | null>(
    null
  );

  const settings = settingsOverride ?? storedSettings;
  const drafts = draftsOverride ?? storedDrafts;

  useEffect(() => {
    if (settingsOverride) {
      persistSettings(settingsOverride);
    }
  }, [settingsOverride]);

  useEffect(() => {
    if (draftsOverride) {
      persistDrafts(draftsOverride);
    }
  }, [draftsOverride]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsOverride((prev) => {
      const base = prev ?? loadSettings();
      const next = { ...base, ...patch };
      if (
        typeof patch.discountPercent === "number" &&
        patch.discountPercent !== base.discountPercent
      ) {
        setDraftsOverride((current) => {
          const list = current ?? loadDrafts();
          return list.map((draft) => {
            if (draft.originalPrice == null || draft.status !== "ready") {
              return draft;
            }
            return {
              ...draft,
              price: listingPriceFromOriginal(
                draft.originalPrice,
                patch.discountPercent!
              ),
              updatedAt: new Date().toISOString(),
            };
          });
        });
      }
      return next;
    });
  }, []);

  const runSearchForDraft = useCallback(
    async (draft: ListingDraft, discountPercent: number) => {
      setDraftsOverride((prev) => {
        const list = prev ?? loadDrafts();
        return list.map((d) =>
          d.id === draft.id
            ? {
                ...d,
                status: "searching",
                errorMessage: null,
                updatedAt: new Date().toISOString(),
              }
            : d
        );
      });

      try {
        const result = await searchImage(draft.imageDataUrl, draft.imageName);
        setDraftsOverride((prev) => {
          const list = prev ?? loadDrafts();
          return list.map((d) => {
            if (d.id !== draft.id) return d;
            if (!result.found || !result.match) {
              return {
                ...d,
                status: "failed",
                errorMessage:
                  "No matching product found. Remove this draft or try a clearer photo.",
                updatedAt: new Date().toISOString(),
              };
            }
            const match = result.match;
            return {
              ...d,
              status: "ready",
              title: match.title,
              description: match.description,
              originalPrice: match.originalPrice,
              price: listingPriceFromOriginal(
                match.originalPrice,
                discountPercent
              ),
              currency: match.currency,
              source: match.source,
              sourceUrl: match.sourceUrl,
              errorMessage: null,
              updatedAt: new Date().toISOString(),
            };
          });
        });
      } catch {
        setDraftsOverride((prev) => {
          const list = prev ?? loadDrafts();
          return list.map((d) =>
            d.id === draft.id
              ? {
                  ...d,
                  status: "failed",
                  errorMessage:
                    "Search failed. Check your connection and retry.",
                  updatedAt: new Date().toISOString(),
                }
              : d
          );
        });
      }
    },
    []
  );

  const createDraftsFromFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      const created: ListingDraft[] = [];
      for (const file of imageFiles) {
        const imageDataUrl = await compressImageFile(file);
        const now = new Date().toISOString();
        created.push({
          id: crypto.randomUUID(),
          imageDataUrl,
          imageName: file.name,
          status: "pending",
          title: "",
          description: "",
          price: 0,
          originalPrice: null,
          currency: "USD",
          source: null,
          sourceUrl: null,
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        });
      }

      setDraftsOverride((prev) => [...created, ...(prev ?? loadDrafts())]);

      const discount = settings.discountPercent;
      void (async () => {
        for (const draft of created) {
          await runSearchForDraft(draft, discount);
        }
      })();
    },
    [runSearchForDraft, settings.discountPercent]
  );

  const updateDraft = useCallback((id: string, patch: Partial<ListingDraft>) => {
    setDraftsOverride((prev) => {
      const list = prev ?? loadDrafts();
      return list.map((d) =>
        d.id === id
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d
      );
    });
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDraftsOverride((prev) => {
      const list = prev ?? loadDrafts();
      return list.filter((d) => d.id !== id);
    });
  }, []);

  const clearDrafts = useCallback(() => {
    setDraftsOverride([]);
  }, []);

  const retrySearch = useCallback(
    async (id: string) => {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;
      await runSearchForDraft(draft, settings.discountPercent);
    },
    [drafts, runSearchForDraft, settings.discountPercent]
  );

  const markDraftsPosted = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setDraftsOverride((prev) => {
      const list = prev ?? loadDrafts();
      return list.map((d) =>
        set.has(d.id)
          ? {
              ...d,
              status: "posted",
              updatedAt: new Date().toISOString(),
            }
          : d
      );
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      drafts,
      hydrated,
      updateSettings,
      createDraftsFromFiles,
      updateDraft,
      removeDraft,
      clearDrafts,
      retrySearch,
      markDraftsPosted,
    }),
    [
      settings,
      drafts,
      hydrated,
      updateSettings,
      createDraftsFromFiles,
      updateDraft,
      removeDraft,
      clearDrafts,
      retrySearch,
      markDraftsPosted,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
