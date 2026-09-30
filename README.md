# EaseSell

Photograph an item on an iPhone. EaseSell asks Google Cloud Vision what it is, then you set the price. Two listings a month are free. EaseSell Plus removes that cap.

The app runs on the phone. Photos, titles, descriptions, prices, and the monthly count stay there. There is no Mac service to start.

## Run it

Open `ios/EaseSell.xcodeproj` in Xcode. Choose your iPhone and press Run. The first time, open Settings in the app and save your Google Cloud Vision key. That key stays on the phone, and the photo is sent to Google only to name the item.

The shared scheme loads `ios/EaseSell/Products.storekit` for local subscription tests. Its test price is $4.99 a month. The price customers pay is the one you set in App Store Connect for `app.easesell.plus.monthly`.

## Stack

- SwiftUI iPhone app, iOS 18
