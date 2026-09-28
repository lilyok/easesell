export type DraftStatus =
  | "pending"
  | "searching"
  | "ready"
  | "failed"
  | "posting"
  | "posted";

export type ProductSource = "amazon" | "other";

export interface ProductMatch {
  title: string;
  description: string;
  originalPrice: number;
  currency: string;
  source: ProductSource;
  sourceUrl: string;
  confidence: number;
}

export interface ListingDraft {
  id: string;
  imageDataUrl: string;
  imageName: string;
  status: DraftStatus;
  title: string;
  description: string;
  price: number;
  priceInput: string | null;
  priceManuallyEdited: boolean;
  originalPrice: number | null;
  currency: string;
  source: ProductSource | null;
  sourceUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  discountPercent: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  discountPercent: 30,
};

export function listingPriceFromOriginal(
  originalPrice: number,
  discountPercent: number
): number {
  const price = originalPrice * (discountPercent / 100);
  return Math.round(price * 100) / 100;
}
