import type {
  MarketplaceAuthState,
  MarketplaceListingInput,
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

  async getAuthState(): Promise<MarketplaceAuthState> {
    return {
      connected: false,
      displayName: null,
      mode: this.mode,
    };
  }

  async login(): Promise<MarketplaceAuthState> {
    await delay(1100);
    return {
      connected: true,
      displayName: "Demo Seller",
      mode: this.mode,
    };
  }

  async logout(): Promise<void> {
    await delay(300);
  }

  async postListings(
    listings: MarketplaceListingInput[]
  ): Promise<MarketplacePostResult[]> {
    const results: MarketplacePostResult[] = [];
    for (const listing of listings) {
      await delay(700 + Math.floor(Math.random() * 500));
      results.push({
        draftId: listing.id,
        success: true,
        marketplaceListingId: `fb-mock-${listing.id.slice(0, 8)}`,
      });
    }
    return results;
  }
}
