import type { ProductMatch } from "@/lib/types";

export interface ImageSearchRequest {
  imageDataUrl: string;
  imageName: string;
}

export interface ImageSearchResult {
  found: boolean;
  match?: ProductMatch;
  provider: string;
  mode: "mock" | "live";
}

export interface ImageSearchProvider {
  readonly id: string;
  readonly mode: "mock" | "live";
  searchByImage(request: ImageSearchRequest): Promise<ImageSearchResult>;
}
