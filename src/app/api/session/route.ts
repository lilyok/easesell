import { NextResponse } from "next/server";
import { ensureUser, readAccount } from "@/server/db";
import { HttpError } from "@/server/http";
import { signSession, userIdFromSignIn } from "@/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identityToken?: unknown;
      devUser?: unknown;
    };
    const userId = await userIdFromSignIn(body);
    ensureUser(userId);
    const token = await signSession(userId);
    return NextResponse.json({ token, account: readAccount(userId) });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
  }
  console.error("[session]", error instanceof Error ? error.message : "sign-in failed");
  return NextResponse.json({ error: "Sign-in failed." }, { status: 500 });
}
