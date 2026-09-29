import { NextResponse } from "next/server";
import { readAccount, releaseListing, reserveListing } from "@/server/db";
import { HttpError } from "@/server/http";
import { userIdFromAuthorization } from "@/server/session";
import { identifyPhoto } from "@/server/vision";

export const runtime = "nodejs";

const DRAFT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let reserved: { userId: string; draftId: string; already: boolean } | null = null;
  try {
    const userId = await userIdFromAuthorization(request.headers.get("authorization"));
    const body = (await request.json()) as { imageBase64?: unknown; draftId?: unknown };
    if (typeof body.draftId !== "string" || !DRAFT_ID.test(body.draftId)) {
      throw new HttpError("The listing id is missing.", 400);
    }
    if (typeof body.imageBase64 !== "string" || body.imageBase64.length === 0) {
      throw new HttpError("The photo is missing.", 400);
    }

    const reservation = reserveListing(userId, body.draftId);
    if (!reservation.ok) {
      throw new HttpError("The two free listings for this month are used.", 402, {
        code: "payment_required",
        ...reservation.account,
      });
    }
    reserved = { userId, draftId: body.draftId, already: reservation.already };

    const match = await identifyPhoto(body.imageBase64);
    return NextResponse.json({ ...match, account: readAccount(userId) });
  } catch (error) {
    if (reserved && !reserved.already) releaseListing(reserved.userId, reserved.draftId);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message, ...error.extra },
        { status: error.status }
      );
    }
    console.error("[identify]", error instanceof Error ? error.message : "identify failed");
    return NextResponse.json({ error: "The photo could not be named." }, { status: 500 });
  }
}
