import { matchFromWebDetection, type PhotoMatch, type VisionWebDetection } from "./match";
import { HttpError } from "./http";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function decodeImage(imageBase64: string): Buffer {
  const payload = imageBase64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  const bytes = Buffer.from(payload, "base64");
  if (bytes.length === 0) {
    throw new HttpError("The photo could not be read.", 400);
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new HttpError("The photo is larger than 4 MB. Try again.", 400);
  }
  return bytes;
}

export async function identifyPhoto(imageBase64: string): Promise<PhotoMatch> {
  const bytes = decodeImage(imageBase64);
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.VISION_STUB === "1") {
      return {
        found: true,
        title: "Sample item",
        details:
          "Vision is in local stub mode, so this name is not from Google. Set the price you want to ask.",
        sourceUrl: null,
        sourceTitle: null,
      };
    }
    throw new HttpError(
      "Google Cloud Vision is not configured. Set GOOGLE_CLOUD_VISION_API_KEY.",
      503
    );
  }

  const url = new URL("https://vision.googleapis.com/v1/images:annotate");
  url.searchParams.set("key", apiKey);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: bytes.toString("base64") },
            features: [{ type: "WEB_DETECTION", maxResults: 5 }],
          },
        ],
      }),
    });
  } catch {
    throw new HttpError("Google Vision could not be reached.", 502);
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    responses?: { webDetection?: VisionWebDetection; error?: { message?: string } }[];
  } | null;
  const message = payload?.error?.message || payload?.responses?.[0]?.error?.message;
  if (!response.ok || message) {
    throw new HttpError(safeVisionMessage(message || "Google Vision could not name this photo."), 502);
  }
  return matchFromWebDetection(payload?.responses?.[0]?.webDetection);
}

function safeVisionMessage(message: string): string {
  return message.replace(/key=[^&\s]+/gi, "key=***");
}
