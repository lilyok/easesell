import type { ListingDraft } from "@/lib/types";

export interface MarketplaceAuthState {
  connected: boolean;
  displayName: string | null;
  mode: "mock" | "live";
}

export interface MarketplacePostResult {
  draftId: string;
  success: boolean;
  marketplaceListingId?: string;
  errorMessage?: string;
}

export interface MarketplaceProvider {
  readonly id: string;
  readonly mode: "mock" | "live";
  getAuthState(): Promise<MarketplaceAuthState>;
  login(): Promise<MarketplaceAuthState>;
  logout(): Promise<void>;
  postListings(drafts: ListingDraft[]): Promise<MarketplacePostResult[]>;
}
