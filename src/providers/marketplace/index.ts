import { MockFacebookMarketplaceProvider } from "./mock";
import type { MarketplaceProvider } from "./types";

export type {
  MarketplaceProvider,
  MarketplaceAuthState,
  MarketplacePostResult,
} from "./types";

const globalKey = "__easesell_marketplace_provider__";

type GlobalStore = typeof globalThis & {
  [globalKey]?: MarketplaceProvider;
};

/**
 * Pluggable Facebook Marketplace provider.
 * When NEXT_PUBLIC_FACEBOOK_APP_ID (and related secrets) are set,
 * a live Graph API adapter can be wired here. Mock runs by default.
 */
export function getMarketplaceProvider(): MarketplaceProvider {
  const g = globalThis as GlobalStore;
  if (g[globalKey]) return g[globalKey]!;

  const appId =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID;

  if (appId) {
    console.info(
      "[easesell] Facebook App ID detected; mock marketplace provider still active until a live adapter is configured."
    );
  }

  g[globalKey] = new MockFacebookMarketplaceProvider();
  return g[globalKey]!;
}
