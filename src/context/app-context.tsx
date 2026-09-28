"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
const DRAFTS_DB = "easesell";
const DRAFTS_STORE = "drafts";
const DRAFTS_RECORD = "all";

interface AppContextValue {
  settings: AppSettings;
  drafts: ListingDraft[];
  hydrated: boolean;
  persistenceError: string | null;
  updateSettings: (patch: Partial<AppSettings>) => void;
  createDraftsFromFiles: (files: File[]) => Promise<void>;
  updateDraft: (id: string, patch: Partial<ListingDraft>) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  retrySearch: (id: string) => Promise<void>;
  markDraftsPosted: (ids: string[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return hydrated;
}

function readSettings(): AppSettings {
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

function normalizeDrafts(drafts: ListingDraft[]): ListingDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    priceInput: draft.priceInput ?? null,
    priceManuallyEdited: draft.priceManuallyEdited ?? false,
  }));
}

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFTS_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DRAFTS_STORE)) {
        request.result.createObjectStore(DRAFTS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDrafts(): Promise<ListingDraft[]> {
  const db = await openDraftDatabase();
  const stored = await new Promise<ListingDraft[] | undefined>(
    (resolve, reject) => {
      const transaction = db.transaction(DRAFTS_STORE, "readonly");
      const request = transaction.objectStore(DRAFTS_STORE).get(DRAFTS_RECORD);
      request.onsuccess = () => resolve(request.result as ListingDraft[]);
      request.onerror = () => reject(request.error);
    }
  );
  db.close();

  if (stored) return normalizeDrafts(stored);

  // Migrate drafts written by the first localStorage-based version.
  const legacy = localStorage.getItem(DRAFTS_KEY);
  if (!legacy) return [];
  const drafts = normalizeDrafts(JSON.parse(legacy) as ListingDraft[]);
  await writeDrafts(drafts);
  localStorage.removeItem(DRAFTS_KEY);
  return drafts;
}

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

async function writeDrafts(next: ListingDraft[]): Promise<void> {
  const db = await openDraftDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DRAFTS_STORE, "readwrite");
    transaction.objectStore(DRAFTS_STORE).put(next, DRAFTS_RECORD);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

function writeSettings(next: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [drafts, setDrafts] = useState<ListingDraft[]>([]);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [persistEnabled, setPersistEnabled] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const draftWriteChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void Promise.all([Promise.resolve().then(readSettings), readDrafts()])
      .then(([storedSettings, storedDrafts]) => {
        if (cancelled) return;
        setSettings(storedSettings);
        setDrafts(storedDrafts);
        setPersistEnabled(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPersistenceError(
            "Saved drafts could not be loaded. New drafts may not persist."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapped(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!persistEnabled) return;
    writeSettings(settings);
  }, [settings, persistEnabled]);

  useEffect(() => {
    if (!persistEnabled) return;
    draftWriteChain.current = draftWriteChain.current
      .catch(() => undefined)
      .then(() => writeDrafts(drafts))
      .then(
        () => setPersistenceError(null),
        () =>
          setPersistenceError(
            "Drafts could not be saved. Free some browser storage before refreshing."
          )
      );
  }, [drafts, persistEnabled]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    if (typeof patch.discountPercent === "number") {
      setDrafts((current) =>
        current.map((draft) => {
          if (
            draft.originalPrice == null ||
            draft.status !== "ready" ||
            draft.priceManuallyEdited
          ) {
            return draft;
          }
          return {
            ...draft,
            price: listingPriceFromOriginal(
              draft.originalPrice,
              patch.discountPercent!
            ),
            priceInput: null,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const runSearchForDraft = useCallback(
    async (draft: ListingDraft, discountPercent: number) => {
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draft.id
            ? {
                ...d,
                status: "searching",
                errorMessage: null,
                updatedAt: new Date().toISOString(),
              }
            : d
        )
      );

      try {
        const result = await searchImage(draft.imageDataUrl, draft.imageName);
        setDrafts((prev) =>
          prev.map((d) => {
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
              priceInput: null,
              priceManuallyEdited: false,
              currency: match.currency,
              source: match.source,
              sourceUrl: match.sourceUrl,
              errorMessage: null,
              updatedAt: new Date().toISOString(),
            };
          })
        );
      } catch {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draft.id
              ? {
                  ...d,
                  status: "failed",
                  errorMessage:
                    "Search failed. Check your connection and retry.",
                  updatedAt: new Date().toISOString(),
                }
              : d
          )
        );
      }
    },
    []
  );

  const createDraftsFromFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      const prepared = await Promise.allSettled(
        imageFiles.map(async (file) => ({
          file,
          imageDataUrl: await compressImageFile(file),
        }))
      );
      const created: ListingDraft[] = [];
      for (const result of prepared) {
        if (result.status === "rejected") continue;
        const { file, imageDataUrl } = result.value;
        const now = new Date().toISOString();
        created.push({
          id: crypto.randomUUID(),
          imageDataUrl,
          imageName: file.name,
          status: "pending",
          title: "",
          description: "",
          price: 0,
          priceInput: null,
          priceManuallyEdited: false,
          originalPrice: null,
          currency: "USD",
          source: null,
          sourceUrl: null,
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        });
      }

      setDrafts((prev) => [...created, ...prev]);

      const discount = settings.discountPercent;
      void (async () => {
        let nextIndex = 0;
        const workers = Array.from(
          { length: Math.min(3, created.length) },
          async () => {
            while (nextIndex < created.length) {
              const draft = created[nextIndex++];
              await runSearchForDraft(draft, discount);
            }
          }
        );
        await Promise.all(workers);
      })();

      const failedCount = prepared.length - created.length;
      if (failedCount > 0) {
        throw new Error(
          `${failedCount} photo${failedCount === 1 ? "" : "s"} could not be read.`
        );
      }
    },
    [runSearchForDraft, settings.discountPercent]
  );

  const updateDraft = useCallback((id: string, patch: Partial<ListingDraft>) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...patch,
              priceManuallyEdited:
                typeof patch.price === "number"
                  ? true
                  : d.priceManuallyEdited,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDrafts = useCallback(() => {
    setDrafts([]);
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
    const idSet = new Set(ids);
    setDrafts((prev) =>
      prev.map((d) =>
        idSet.has(d.id)
          ? {
              ...d,
              status: "posted",
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );
  }, []);

  const ready = hydrated && bootstrapped;

  const value = useMemo(
    () => ({
      settings,
      drafts,
      hydrated: ready,
      persistenceError,
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
      ready,
      persistenceError,
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
