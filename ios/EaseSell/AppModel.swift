import Foundation
import UIKit

@MainActor
@Observable
final class AppModel {
    private(set) var allowance = Allowance(used: 0, limit: Allowance.freeLimit, subscribed: false)
    private(set) var drafts: [ListingDraft] = []
    var busy = false
    var alert: String?
    var paywall = false
    var showSettings = false
    var purchasing = false
    var openPaywallAfterSettings = false
    private var pendingLookup: UUID?
    var priceCoefficientText = PriceSettings.display
    var currencyChoice = PriceSettings.currencyChoice

    let purchases = PurchaseManager()
    private let store = DraftStore()
    private var watchingPurchases = false

    init() {
        drafts = store.load()
        Task { await watchPurchases() }
    }

    func refresh() async {
        let subscribed = await purchases.hasActiveSubscription()
        allowance = QuotaStore.allowance(subscribed: subscribed)
    }

    func addPhoto(_ image: UIImage) async {
        guard let data = ImageEncoding.jpeg(from: image) else {
            alert = "That photo could not be prepared."
            return
        }
        let draft = store.create(imageData: data)
        drafts = store.load()
        let subscribed = await purchases.hasActiveSubscription()
        allowance = QuotaStore.allowance(subscribed: subscribed)
        if QuotaStore.canRequest(subscribed: subscribed) {
            await identify(draft)
        }
    }

    func identify(_ draft: ListingDraft) async {
        guard let data = store.imageData(for: draft) else {
            alert = "The saved photo could not be read."
            return
        }
        let subscribed = await purchases.hasActiveSubscription()
        allowance = QuotaStore.allowance(subscribed: subscribed)
        if !QuotaStore.canRequest(subscribed: subscribed) {
            pendingLookup = draft.id
            paywall = true
            return
        }
        busy = true
        defer { busy = false }
        do {
            let result = try await VisionClient.identify(image: data)
            if !subscribed { QuotaStore.record() }
            let suggestion = await suggestedPrice(for: result.sourceURL)
            store.update(id: draft.id) { item in
                if !result.title.isEmpty { item.title = result.title }
                item.details = result.details
                item.sourceURL = result.sourceURL
                item.sourceTitle = result.sourceTitle
                if let suggestion {
                    item.price = suggestion.amount
                    item.currency = suggestion.currency
                }
                item.errorMessage = nil
            }
            drafts = store.load()
            allowance = QuotaStore.allowance(subscribed: subscribed)
            if result.sourceURL != nil && suggestion == nil {
                alert = "EaseSell could not read a \(PriceSettings.currencyCode) price from the similar page."
            }
        } catch {
            store.update(id: draft.id) { $0.errorMessage = error.localizedDescription }
            drafts = store.load()
            allowance = QuotaStore.allowance(subscribed: subscribed)
            alert = error.localizedDescription
        }
    }

    func update(id: UUID, title: String? = nil, details: String? = nil, price: String? = nil) {
        store.update(id: id) { draft in
            if let title { draft.title = title }
            if let details { draft.details = details }
            if let price { draft.price = price }
        }
        drafts = store.load()
    }

    func remove(id: UUID) {
        store.remove(id: id)
        drafts = store.load()
    }

    func image(for draft: ListingDraft) -> UIImage? {
        store.image(for: draft)
    }

    func savePriceCoefficient() {
        let saved = PriceSettings.save(priceCoefficientText)
        priceCoefficientText = PriceSettings.display
        if saved {
            PriceSettings.saveCurrency(currencyChoice)
            showSettings = false
        } else {
            alert = "Enter a coefficient greater than 0, such as 0.3."
        }
    }

    private func suggestedPrice(for sourceURL: String?) async -> SuggestedPrice? {
        guard let sourceURL, let url = URL(string: sourceURL) else { return nil }
        guard let shop = await PagePrice.fetch(from: url, currency: PriceSettings.currencyCode) else { return nil }
        let coefficient = Decimal(PriceSettings.coefficient)
        let asked = shop.amount * coefficient
        guard asked > 0 else { return nil }
        return SuggestedPrice(amount: PriceSettings.formatMoney(asked), currency: shop.currency)
    }

    func subscribe() async {
        await unlock(using: purchases.purchase)
    }

    func restorePurchases() async {
        await unlock(using: purchases.restore)
    }

    private func unlock(using action: () async -> Bool) async {
        purchasing = true
        defer { purchasing = false }
        let unlocked = await action()
        await refresh()
        guard unlocked else { return }
        paywall = false
        guard let id = pendingLookup else { return }
        pendingLookup = nil
        guard let draft = drafts.first(where: { $0.id == id }) else { return }
        await identify(draft)
    }

    private func watchPurchases() async {
        guard !watchingPurchases else { return }
        watchingPurchases = true
        await purchases.load()
        await refresh()
        await purchases.watch { [weak self] in
            await self?.refresh()
        }
    }
}
