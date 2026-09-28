import { NextResponse } from "next/server";
import { getImageSearchProvider } from "@/providers/image-search";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageDataUrl = body?.imageDataUrl as string | undefined;
    const imageName = (body?.imageName as string | undefined) || "photo.jpg";

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "imageDataUrl is required" },
        { status: 400 }
      );
    }

    const provider = getImageSearchProvider();
    const result = await provider.searchByImage({ imageDataUrl, imageName });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[image-search]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Image search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
