import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMarketplaceProvider } from "@/providers/marketplace";
import type { MarketplaceListingInput } from "@/providers/marketplace";

const MOCK_SESSION_COOKIE = "easesell-marketplace-session";
const MAX_BODY_BYTES = 256 * 1024;

async function hasMockSession() {
  return (await cookies()).get(MOCK_SESSION_COOKIE)?.value === "connected";
}

function readListings(value: unknown): MarketplaceListingInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }
  const valid = value.every(
    (listing) =>
      listing &&
      typeof listing.id === "string" &&
      listing.id.length <= 100 &&
      typeof listing.title === "string" &&
      listing.title.trim().length > 0 &&
      listing.title.length <= 200 &&
      typeof listing.description === "string" &&
      listing.description.length <= 5000 &&
      typeof listing.price === "number" &&
      Number.isFinite(listing.price) &&
      listing.price >= 0 &&
      typeof listing.currency === "string" &&
      listing.currency.length <= 10
  );
  if (!valid) return null;
  return value.map(({ id, title, description, price, currency }) => ({
    id,
    title,
    description,
    price,
    currency,
  }));
}

export async function GET() {
  const provider = getMarketplaceProvider();
  const mockConnected =
    provider.mode === "mock" ? await hasMockSession() : false;
  const auth =
    provider.mode === "mock"
      ? {
          connected: mockConnected,
          displayName: mockConnected ? "Demo Seller" : null,
          mode: provider.mode,
        }
      : await provider.getAuthState();
  return NextResponse.json({
    provider: provider.id,
    ...auth,
  });
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Marketplace request is too large" },
        { status: 413 }
      );
    }
    const body = await request.json();
    const action = body?.action as string | undefined;
    const provider = getMarketplaceProvider();

    if (action === "login") {
      const auth = await provider.login();
      const response = NextResponse.json({ provider: provider.id, ...auth });
      if (provider.mode === "mock") {
        response.cookies.set(MOCK_SESSION_COOKIE, "connected", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24,
        });
      }
      return response;
    }

    if (action === "logout") {
      await provider.logout();
      const response = NextResponse.json({ ok: true });
      response.cookies.set(MOCK_SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    if (action === "post") {
      const listings = readListings(body?.listings);
      if (!listings) {
        return NextResponse.json(
          { error: "Provide 1–50 valid listings to post" },
          { status: 400 }
        );
      }
      const connected =
        provider.mode === "mock"
          ? await hasMockSession()
          : (await provider.getAuthState()).connected;
      if (!connected) {
        return NextResponse.json(
          { error: "Connect Facebook before posting" },
          { status: 401 }
        );
      }
      const results = await provider.postListings(listings);
      return NextResponse.json({
        provider: provider.id,
        mode: provider.mode,
        results,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[marketplace]", error);
    return NextResponse.json(
      { error: "Marketplace request failed" },
      { status: 500 }
    );
  }
}
