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

Google Lens / reverse image search and Facebook Marketplace posting do not have simple public APIs for this flow. EaseSell ships a **pluggable provider layer** with **realistic mock/demo providers** when live credentials are missing:

| Capability | Current provider | Reserved live configuration |
|---|---|---|
| Reverse image search | Mock catalog (Amazon-preferred ranking) | `SERPAPI_KEY` or `GOOGLE_LENS_API_KEY` |
| Facebook Marketplace | Mock login + post | `NEXT_PUBLIC_FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |

**Demo tips**

- Upload any product-style photos to get ready drafts from the mock catalog.
- Name a file with `fail`, `unknown`, or `blank` (e.g. `fail-chair.jpg`) to force the **not found** path.
- Settings → change the discount %; ready drafts reprice automatically.
- Send to Marketplace uses a simulated Facebook login until a live adapter is wired.

## Environment variables

Copy `.env.example` to `.env.local` when you are ready to plug in live providers:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `SERPAPI_KEY` / `GOOGLE_LENS_API_KEY` | Live reverse image search (adapter stub ready) |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook Login / Graph app id |
| `FACEBOOK_APP_SECRET` | Server-side Facebook secret (never expose to the client) |
| `FACEBOOK_REDIRECT_URI` | OAuth redirect for live posting flows |

These variables are reserved for the live adapters. Setting them alone does
not enable a live provider: until adapters are implemented behind the provider
interfaces, the app keeps using mocks so local demos never block on
credentials.

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
