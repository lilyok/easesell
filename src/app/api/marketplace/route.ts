import { NextResponse } from "next/server";
import type { ListingDraft } from "@/lib/types";
import { getMarketplaceProvider } from "@/providers/marketplace";

export async function GET() {
  const provider = getMarketplaceProvider();
  const auth = await provider.getAuthState();
  return NextResponse.json({
    provider: provider.id,
    ...auth,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string | undefined;
    const provider = getMarketplaceProvider();

    if (action === "login") {
      const auth = await provider.login();
      return NextResponse.json({ provider: provider.id, ...auth });
    }

    if (action === "logout") {
      await provider.logout();
      return NextResponse.json({ ok: true });
    }

    if (action === "post") {
      const drafts = (body?.drafts as ListingDraft[] | undefined) || [];
      const ready = drafts.filter((d) => d.status === "ready");
      if (ready.length === 0) {
        return NextResponse.json(
          { error: "No ready drafts to post" },
          { status: 400 }
        );
      }
      const auth = await provider.getAuthState();
      if (!auth.connected) {
        return NextResponse.json(
          { error: "Connect Facebook before posting" },
          { status: 401 }
        );
      }
      const results = await provider.postListings(ready);
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
