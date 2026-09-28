# EaseSell

Sell used things online with less busywork. **EaseSell** turns item photos into ready-to-post marketplace drafts — starting with **Facebook Marketplace**.

## What it does

1. Click **List items** and choose photos (one draft per photo).
2. EaseSell reverse-searches each image (Google Lens–style), **preferring Amazon matches**.
3. If a product is found, it fills **title**, **description**, and a listing price at a configurable **% of the original** (default **30%**).
4. If nothing is found, the draft is marked **failed** (removable; ignored when posting).
5. Edit any field, then **Send to Facebook Marketplace**.

## Quick start

```bash
npm install
npm run dev -- --port 43127
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

Other scripts:

```bash
npm run build
npm run start -- --port 43127
npm run lint
```

## Demo without API keys

Image search uses Google Lens when `SERPAPI_KEY` is set. Facebook Marketplace stays on a demo login and post. Without the image-search key, EaseSell fills drafts from a demo catalog so the app still runs:

| Capability | Without a key | With a key |
|---|---|---|
| Reverse image search | Mock catalog (the photo is not inspected) | Google Lens via `SERPAPI_KEY` |
| Facebook Marketplace | Mock login + post | Still mock |

**Demo tips**

- Add `SERPAPI_KEY` to `.env.local` and restart the dev server to search the actual photo with Google Lens.
- Without that key, any photo is filled from a demo catalog. Name a file with `fail`, `unknown`, or `blank` (e.g. `fail-chair.jpg`) to force the **not found** path.
- Settings → change the discount %; ready drafts reprice automatically.
- Send to Marketplace uses a simulated Facebook login until a live adapter is wired.

## Environment variables

Copy `.env.example` to `.env.local` when you are ready to plug in live providers:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `SERPAPI_KEY` | Google Lens reverse image search. A SerpAPI private key from [serpapi.com](https://serpapi.com/manage-api-key). |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook Login / Graph app id |
| `FACEBOOK_APP_SECRET` | Server-side Facebook secret (never expose to the client) |
| `FACEBOOK_REDIRECT_URI` | OAuth redirect for live posting flows |

`SERPAPI_KEY` turns on Google Lens. Facebook stays on the mock provider. Without
the image-search key, local demos keep using the catalog so the app still runs.

Provider entry points:

- `src/providers/image-search/` — reverse image search
- `src/providers/marketplace/` — Facebook Marketplace auth + posting

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Client-side draft persistence (IndexedDB) and settings persistence
  (`localStorage`) for the first slice

## Project layout

```
src/app/                 # pages + API routes
src/components/          # UI for drafts, picker, marketplace send
src/context/             # drafts + settings state
src/providers/           # pluggable image search + marketplace
```

## License

Private / unpublished unless you choose otherwise.
