# EaseSell

Photograph an item on an iPhone. EaseSell asks Google Cloud Vision what it is, then suggests an asking price from the similar page. You can add as many listings as you want. Two Vision lookups a week are free. EaseSell Plus removes that limit.

The app runs on the phone. Photos, titles, descriptions, prices, and the weekly lookup count stay there. There is no Mac service to start.

## Run it

Open `ios/EaseSell.xcodeproj` in Xcode. Choose your iPhone and press Run. The Google Cloud Vision key is compiled into the app, and the photo is sent to Google only to name the item.

The shared scheme loads `ios/EaseSell/Products.storekit` for local subscription tests. Its test price is $4.99 a month. The price customers pay is the one you set in App Store Connect for `app.easesell.plus.monthly`.

## Stack

- SwiftUI iPhone app, iOS 18
