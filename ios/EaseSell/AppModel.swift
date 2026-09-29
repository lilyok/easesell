import Foundation
import UIKit

@MainActor
@Observable
final class AppModel {
    private(set) var account: Account?
    private(set) var drafts: [ListingDraft] = []
    var busy = false
    var alert: String?
    var paywall = false
    var signedIn: Bool { sessionToken != nil }

    let purchases = PurchaseManager()
    private let api = APIClient()
    private let store = DraftStore()
    private var sessionToken: String?
    private var watchingPurchases = false

    init() {
        sessionToken = KeychainStore.load()
        drafts = store.load()
        Task { await watchPurchases() }
    }

    func refresh() async {
        guard let sessionToken else { return }
        do {
            account = try await api.account(token: sessionToken)
        } catch let error as ServiceError where error.status == 401 {
            signOut()
        } catch {
            alert = error.localizedDescription
        }
    }

    func signIn(identityToken: String) async {
        await openSession { try await api.signIn(identityToken: identityToken) }
    }

    func signInDev() async {
        await openSession { try await api.signInDev() }
    }

    func signOut() {
        sessionToken = nil
        account = nil
        KeychainStore.clear()
    }

    func addPhoto(_ image: UIImage) async {
        guard signedIn else { return }
        guard let data = ImageEncoding.jpeg(from: image) else {
            alert = "That photo could not be prepared."
            return
        }
        let draft = store.create(imageData: data)
        drafts = store.load()
        await identify(draft)
    }

    func identify(_ draft: ListingDraft) async {
        guard let sessionToken else { return }
        guard let data = store.imageData(for: draft) else {
            alert = "The saved photo could not be read."
            return
        }
        busy = true
        defer { busy = false }
        do {
            let result = try await api.identify(token: sessionToken, draftID: draft.id, image: data)
            store.update(id: draft.id) { item in
                if !result.title.isEmpty { item.title = result.title }
                item.details = result.details
                item.sourceURL = result.sourceUrl
                item.sourceTitle = result.sourceTitle
                item.errorMessage = nil
            }
            account = result.account
            drafts = store.load()
        } catch let error as ServiceError where error.code == "payment_required" {
            paywall = true
        } catch let error as ServiceError where error.status == 401 {
            signOut()
        } catch {
            store.update(id: draft.id) { $0.errorMessage = error.localizedDescription }
            drafts = store.load()
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
        let unlocked = await purchases.purchase { [weak self] jws in
            guard let self else { return }
            try await self.submitSubscription(jws)
        }
        if unlocked {
            paywall = false
            await refresh()
        }
    }

    private func openSession(_ request: () async throws -> SessionResponse) async {
        busy = true
        defer { busy = false }
        do {
            let session = try await request()
            sessionToken = session.token
            account = session.account
            KeychainStore.save(session.token)
        } catch {
            alert = error.localizedDescription
        }
    }

    private func submitSubscription(_ jws: String) async throws {
        guard let sessionToken else { return }
        account = try await api.submitSubscription(token: sessionToken, signedTransaction: jws)
    }

    private func watchPurchases() async {
        guard !watchingPurchases else { return }
        watchingPurchases = true
        await purchases.load()
        await purchases.watch { [weak self] jws in
            guard let self else { return }
            try await self.submitSubscription(jws)
        }
    }
}
