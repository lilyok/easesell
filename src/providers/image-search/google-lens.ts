import type { ProductMatch } from "@/lib/types";
import type {
  ImageSearchProvider,
  ImageSearchRequest,
  ImageSearchResult,
} from "./types";

const MAX_IMAGE_BYTES = 500 * 1024;

interface LensPrice {
  value?: string;
  extracted_value?: number | string;
  currency?: string;
}

interface LensVisualMatch {
  position?: number;
  title?: string;
  link?: string;
  source?: string;
  price?: LensPrice;
  exact_matches?: boolean;
}

interface LensResponse {
  error?: string;
  visual_matches?: LensVisualMatch[];
  products?: LensVisualMatch[];
}

interface DecodedImage {
  bytes: Uint8Array<ArrayBuffer>;
  mime: string;
  filename: string;
}

/**
 * Google Lens through SerpAPI. The image is uploaded to SerpAPI, then searched
 * with engine=google_lens. Amazon results with a price are preferred.
 */
export class GoogleLensImageSearchProvider implements ImageSearchProvider {
  readonly id = "google-lens";
  readonly mode = "live" as const;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchByImage(
    request: ImageSearchRequest
  ): Promise<ImageSearchResult> {
    const image = decodeImage(request.imageDataUrl, request.imageName);
    if (image.bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(
        "Photo is over 500 KB, which Google Lens upload rejects. Try a smaller image."
      );
    }

    const imageId = await uploadImage(this.apiKey, image);
    const products = await searchLens(this.apiKey, imageId, "products").catch(
      () => ({}) as LensResponse
    );
    const visual =
      pickMatch(products) ??
      pickMatch(await searchLens(this.apiKey, imageId, "visual_matches"));

    if (!visual) {
      return { found: false, provider: this.id, mode: this.mode };
    }

    return {
      found: true,
      match: toProductMatch(visual),
      provider: this.id,
      mode: this.mode,
    };
  }
}

export function decodeImage(dataUrl: string, imageName: string): DecodedImage {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(
    dataUrl.trim()
  );
  if (!match) {
    throw new Error("Photo could not be read for Google Lens.");
  }

  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const encoded = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  const bytes = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  bytes.set(encoded);
  const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const base = imageName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-") || "photo";

  return { bytes, mime, filename: `${base}.${extension}` };
}

export function pickMatch(payload: LensResponse): LensVisualMatch | null {
  const matches = [...(payload.visual_matches ?? []), ...(payload.products ?? [])].filter(
    (match) => typeof match.title === "string" && match.title.trim().length > 0 && typeof match.link === "string"
  );
  if (matches.length === 0) return null;

  return [...matches].sort((a, b) => scoreMatch(b) - scoreMatch(a))[0];
}

function scoreMatch(match: LensVisualMatch): number {
  const amazon = isAmazon(match) ? 50 : 0;
  const priced = priceAmount(match) != null ? 30 : 0;
  const exact = match.exact_matches ? 10 : 0;
  const rank = Math.max(0, 20 - (match.position ?? 20));
  return amazon + priced + exact + rank;
}

function isAmazon(match: LensVisualMatch): boolean {
  return /amazon\./i.test(match.link ?? "") || /amazon/i.test(match.source ?? "");
}

function priceAmount(match: LensVisualMatch): number | null {
  const raw = match.price?.extracted_value;
  const amount = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (Number.isFinite(amount) && amount > 0) return amount;
  return null;
}

function toProductMatch(match: LensVisualMatch): ProductMatch {
  const amount = priceAmount(match);
  const sourceName = match.source?.trim();
  const priceText = match.price?.value?.trim();
  const description = [
    sourceName ? `Google Lens match from ${sourceName}.` : "Google Lens match.",
    amount != null && priceText
      ? `Similar listings are around ${priceText}.`
      : "No price came back, so set the listing price yourself.",
    "Describe the condition of your item before posting.",
  ].join(" ");

  return {
    title: match.title!.trim().slice(0, 180),
    description,
    originalPrice: amount != null ? Math.round(amount * 100) / 100 : 0,
    currency: currencyCode(match.price?.currency),
    source: isAmazon(match) ? "amazon" : "other",
    sourceUrl: match.link!,
    confidence: match.exact_matches ? 0.9 : 0.7,
  };
}

function currencyCode(currency: string | undefined): string {
  const value = currency?.trim() ?? "";
  if (value === "$" || value.toUpperCase() === "USD") return "USD";
  if (value === "£" || value.toUpperCase() === "GBP") return "GBP";
  if (value === "€" || value.toUpperCase() === "EUR") return "EUR";
  if (/^[A-Za-z]{3}$/.test(value)) return value.toUpperCase();
  return "USD";
}

async function uploadImage(apiKey: string, image: DecodedImage): Promise<string> {
  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("image", new File([image.bytes], image.filename, { type: image.mime }));

  const response = await fetch("https://serpapi.com/image", {
    method: "POST",
    body: form,
  });
  const payload = await readJson<{ image_id?: string; error?: string }>(response);
  if (!response.ok || !payload.image_id) {
    throw new Error(safeMessage(payload.error || "Google Lens could not accept the photo."));
  }
  return payload.image_id;
}

async function searchLens(
  apiKey: string,
  imageId: string,
  type: "products" | "visual_matches"
): Promise<LensResponse> {
  const params = new URLSearchParams({
    engine: "google_lens",
    image_id: imageId,
    type,
    hl: "en",
    country: "us",
    api_key: apiKey,
  });
  const response = await fetch(`https://serpapi.com/search.json?${params}`);
  const payload = await readJson<LensResponse>(response);
  if (!response.ok || payload.error) {
    throw new Error(safeMessage(payload.error || "Google Lens search failed."));
  }
  return payload;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Google Lens returned an unexpected response.");
  }
}

function safeMessage(message: string): string {
  return message.replace(/api_key=[^&\s]+/gi, "api_key=***");
}
