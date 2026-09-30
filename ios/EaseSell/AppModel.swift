import Foundation
import UIKit

@MainActor
@Observable
final class AppModel {
    private(set) var allowance = Allowance(used: 0, limit: Allowance.freeLimit, subscribed: false)
    private(set) var drafts: [ListingDraft] = []
    var visionKey = ""
    var busy = false
    var alert: String?
    var paywall = false
    var showSettings = false

    let purchases = PurchaseManager()
    private let store = DraftStore()
    private var watchingPurchases = false

    init() {
        visionKey = KeychainStore.loadVisionKey() ?? ""
        drafts = store.load()
        Task { await watchPurchases() }
    }

    func refresh() async {
        let subscribed = await purchases.hasActiveSubscription()
        allowance = QuotaStore.allowance(subscribed: subscribed)
    }

    func saveVisionKey() {
        let trimmed = visionKey.trimmingCharacters(in: .whitespacesAndNewlines)
        visionKey = trimmed
        KeychainStore.saveVisionKey(trimmed)
        showSettings = false
    }

    func addPhoto(_ image: UIImage) async {
        guard let data = ImageEncoding.jpeg(from: image) else {
            alert = "That photo could not be prepared."
            return
        }
        let draft = store.create(imageData: data)
        drafts = store.load()
        await identify(draft)
    }

    func identify(_ draft: ListingDraft) async {
        guard let data = store.imageData(for: draft) else {
            alert = "The saved photo could not be read."
            return
        }
        let subscribed = await purchases.hasActiveSubscription()
        let reservation = QuotaStore.prepare(draftID: draft.id, subscribed: subscribed)
        if reservation == .needsPayment {
            allowance = QuotaStore.allowance(subscribed: subscribed)
            paywall = true
            return
        }
        busy = true
        defer { busy = false }
        do {
            let result = try await VisionClient.identify(image: data, apiKey: visionKey)
            store.update(id: draft.id) { item in
                if !result.title.isEmpty { item.title = result.title }
                item.details = result.details
                item.sourceURL = result.sourceURL
                item.sourceTitle = result.sourceTitle
                item.errorMessage = nil
            }
            drafts = store.load()
            allowance = QuotaStore.allowance(subscribed: subscribed)
        } catch {
            if reservation == .reserved {
                QuotaStore.release(draftID: draft.id)
            }
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

    func subscribe() async {
        let unlocked = await purchases.purchase()
        await refresh()
        if unlocked { paywall = false }
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
