import type { ProductMatch } from "@/lib/types";
import { MOCK_CATALOG } from "./catalog";
import type {
  ImageSearchProvider,
  ImageSearchRequest,
  ImageSearchResult,
} from "./types";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rankPreferAmazon(matches: ProductMatch[]): ProductMatch[] {
  return [...matches].sort((a, b) => {
    if (a.source === "amazon" && b.source !== "amazon") return -1;
    if (b.source === "amazon" && a.source !== "amazon") return 1;
    return b.confidence - a.confidence;
  });
}

/**
 * Realistic demo provider: hashes the image name/data to pick a catalog
 * product (preferring Amazon). Filenames containing "fail" or "unknown"
 * intentionally return not-found so the failed-draft path is easy to demo.
 */
export class MockImageSearchProvider implements ImageSearchProvider {
  readonly id = "mock-google-lens";
  readonly mode = "mock" as const;

  async searchByImage(
    request: ImageSearchRequest
  ): Promise<ImageSearchResult> {
    const latency = 900 + (hashString(request.imageName) % 1200);
    await delay(latency);

    const key = `${request.imageName}:${request.imageDataUrl.length}`;
    const lowerName = request.imageName.toLowerCase();

    if (
      lowerName.includes("fail") ||
      lowerName.includes("unknown") ||
      lowerName.includes("blank")
    ) {
      return {
        found: false,
        provider: this.id,
        mode: this.mode,
      };
    }

    const ranked = rankPreferAmazon(MOCK_CATALOG);
    const amazon = ranked.filter((match) => match.source === "amazon");
    const other = ranked.filter((match) => match.source !== "amazon");
    const hash = hashString(key);
    // Keep non-Amazon results in the demo while preferring Amazon 90% of the time.
    const pool = hash % 10 === 0 && other.length > 0 ? other : amazon;
    const index = hashString(`${key}:match`) % pool.length;
    const match = { ...pool[index] };

    return {
      found: true,
      match,
      provider: this.id,
      mode: this.mode,
    };
  }
}
