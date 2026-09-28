import { GoogleLensImageSearchProvider } from "./google-lens";
import { MockImageSearchProvider } from "./mock";
import type { ImageSearchProvider } from "./types";

export type { ImageSearchProvider, ImageSearchResult } from "./types";

/**
 * Google Lens via SerpAPI when SERPAPI_KEY is set.
 * GOOGLE_LENS_API_KEY is accepted as an alias for the same SerpAPI key.
 * Without a key, the mock catalog runs.
 */
export function getImageSearchProvider(): ImageSearchProvider {
  const apiKey = process.env.SERPAPI_KEY || process.env.GOOGLE_LENS_API_KEY;

  if (apiKey) {
    return new GoogleLensImageSearchProvider(apiKey);
  }

  return new MockImageSearchProvider();
}
