import { MockImageSearchProvider } from "./mock";
import type { ImageSearchProvider } from "./types";

export type { ImageSearchProvider, ImageSearchResult } from "./types";

/**
 * Pluggable reverse-image search.
 * When live API keys are present (SERPAPI_KEY / GOOGLE_LENS_API_KEY),
 * a live provider can be wired here. Until then, the mock provider runs.
 */
export function getImageSearchProvider(): ImageSearchProvider {
  const liveKey =
    process.env.SERPAPI_KEY ||
    process.env.GOOGLE_LENS_API_KEY ||
    process.env.NEXT_PUBLIC_SERPAPI_KEY;

  if (liveKey) {
    // Live Google Lens / SerpAPI adapter can be plugged in here.
    // Falling back to mock until a concrete adapter is configured.
    console.info(
      "[easesell] Live image-search key detected; mock provider still active until a live adapter is configured."
    );
  }

  return new MockImageSearchProvider();
}
