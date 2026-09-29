import { NextResponse } from "next/server";
import { readAccount, saveSubscription } from "@/server/db";
import { HttpError, devAuthEnabled } from "@/server/http";
import { userIdFromAuthorization } from "@/server/session";
import { readStoreSubscription } from "@/server/subscription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await userIdFromAuthorization(request.headers.get("authorization"));
    const body = (await request.json()) as { signedTransaction?: unknown };
    if (typeof body.signedTransaction !== "string" || body.signedTransaction.length === 0) {
      throw new HttpError("The App Store receipt is missing.", 400);
    }
    const subscription = readStoreSubscription(body.signedTransaction, {
      allowXcode: devAuthEnabled(),
    });
    saveSubscription({ userId, ...subscription });
    return NextResponse.json(readAccount(userId));
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(
      "[subscription]",
      error instanceof Error ? error.message : "subscription failed"
    );
    return NextResponse.json({ error: "The subscription could not be saved." }, { status: 500 });
  }
}
