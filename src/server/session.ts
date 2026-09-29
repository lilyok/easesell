import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { bundleId } from "./quota";
import { HttpError, devAuthEnabled } from "./http";

const appleKeys = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

function sessionSecret(): Uint8Array {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return new TextEncoder().encode(fromEnv);
  if (process.env.NODE_ENV === "production") {
    throw new HttpError("SESSION_SECRET is required in production.", 500);
  }
  const file = path.join(process.cwd(), "data", "session.secret");
  mkdirSync(path.dirname(file), { recursive: true });
  if (!existsSync(file)) {
    writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return new TextEncoder().encode(readFileSync(file, "utf8").trim());
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ typ: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecret());
}

export async function userIdFromSession(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (payload.typ !== "session" || typeof payload.sub !== "string") {
      throw new Error("wrong token");
    }
    return payload.sub;
  } catch {
    throw new HttpError("Sign in again to continue.", 401);
  }
}

export async function userIdFromAuthorization(
  header: string | null
): Promise<string> {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  if (!match) throw new HttpError("Sign in again to continue.", 401);
  return userIdFromSession(match[1]);
}

export async function userIdFromSignIn(body: {
  identityToken?: unknown;
  devUser?: unknown;
}): Promise<string> {
  if (typeof body.identityToken === "string" && body.identityToken.length > 0) {
    try {
      const { payload } = await jwtVerify(body.identityToken, appleKeys, {
        issuer: "https://appleid.apple.com",
        audience: bundleId(),
      });
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new Error("missing subject");
      }
      return payload.sub;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError("Apple did not accept that sign-in.", 401);
    }
  }

  if (
    devAuthEnabled() &&
    typeof body.devUser === "string" &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(body.devUser)
  ) {
    return `dev:${body.devUser}`;
  }

  throw new HttpError("Sign in with Apple to continue.", 401);
}
