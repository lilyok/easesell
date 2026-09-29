import { NextResponse } from "next/server";
import { readAccount } from "@/server/db";
import { HttpError } from "@/server/http";
import { userIdFromAuthorization } from "@/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await userIdFromAuthorization(request.headers.get("authorization"));
    return NextResponse.json(readAccount(userId));
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account]", error instanceof Error ? error.message : "account failed");
    return NextResponse.json({ error: "The account could not be loaded." }, { status: 500 });
  }
}
