# EaseSell

Photograph an item on an iPhone. EaseSell asks Google Cloud Vision what it is, then you set the price. Two listings a month are free. EaseSell Plus removes that cap.

Photos, titles, descriptions, and prices stay on the phone. The service keeps the Apple account, the monthly count, and whether Plus is active. It does not keep the photo.

## iPhone app

Open `ios/EaseSell.xcodeproj` in Xcode and run it on a simulator or a phone.

The app talks to `http://127.0.0.1:43127`. A simulator can reach the service on your Mac at that address. Sign in with Apple needs the Sign in with Apple capability on your Apple developer team. Until that is set up, run the service with `EASESELL_DEV_AUTH=1` and use **Continue on this simulator**.

The shared scheme loads `ios/EaseSell/Products.storekit`. That file is only for local purchases. Its test price is $4.99 a month. The price customers pay is the one you set in App Store Connect for `app.easesell.plus.monthly`.

## Service

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `GOOGLE_CLOUD_VISION_API_KEY` to a Cloud Vision API key. Vision’s own free tier is 1,000 images a month, then about $3.50 per 1,000. The app still allows only two free listings a month per account.

`VISION_STUB=1` names every photo “Sample item” when the key is empty, so the screens can be tried before Google billing is on.

| Route | Purpose |
|---|---|
| `POST /api/session` | Exchange a Sign in with Apple identity token for a session |
| `GET /api/account` | Free listings used this month, and whether Plus is active |
| `POST /api/identify` | Name one photo. Same draft can be tried again without using another free listing |
| `POST /api/subscription` | Store an App Store subscription receipt |

A third new photo in a calendar month returns HTTP 402 until Plus is active. Plus is an auto-renewable subscription sold with StoreKit. The service checks Apple’s signature on the receipt. Local StoreKit receipts are accepted only when `EASESELL_DEV_AUTH=1`.

## Stack

- SwiftUI iPhone app, iOS 18
- Next.js service for Vision, accounts, and the monthly count
- SQLite in `data/` on the service machine
