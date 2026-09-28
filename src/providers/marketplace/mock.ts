import type { ListingDraft } from "@/lib/types";
import type {
  MarketplaceAuthState,
  MarketplacePostResult,
  MarketplaceProvider,
} from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Demo Facebook Marketplace provider.
 * Simulates Facebook Login and posting without real Graph API credentials.
 */
export class MockFacebookMarketplaceProvider implements MarketplaceProvider {
  readonly id = "mock-facebook-marketplace";
  readonly mode = "mock" as const;

  private connected = false;
  private displayName: string | null = null;

  async getAuthState(): Promise<MarketplaceAuthState> {
    return {
      connected: this.connected,
      displayName: this.displayName,
      mode: this.mode,
    };
  }

  async login(): Promise<MarketplaceAuthState> {
    await delay(1100);
    this.connected = true;
    this.displayName = "Demo Seller";
    return this.getAuthState();
  }

  async logout(): Promise<void> {
    await delay(300);
    this.connected = false;
    this.displayName = null;
  }

  async postListings(
    drafts: ListingDraft[]
  ): Promise<MarketplacePostResult[]> {
    if (!this.connected) {
      return drafts.map((draft) => ({
        draftId: draft.id,
        success: false,
        errorMessage: "Not connected to Facebook",
      }));
    }

    const results: MarketplacePostResult[] = [];
    for (const draft of drafts) {
      await delay(700 + Math.floor(Math.random() * 500));
      results.push({
        draftId: draft.id,
        success: true,
        marketplaceListingId: `fb-mock-${draft.id.slice(0, 8)}`,
      });
    }
    return results;
  }
}
