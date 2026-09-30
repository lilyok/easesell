import Foundation
import StoreKit

@MainActor
@Observable
final class PurchaseManager {
    private(set) var product: Product?
    var message: String?
    private let productID = "app.easesell.plus.monthly"

    func load() async {
        do {
            product = try await Product.products(for: [productID]).first
            if product == nil {
                message = "EaseSell Plus is not available in this build."
            }
        } catch {
            message = "The subscription could not be loaded."
        }
    }

    func purchase() async -> Bool {
        guard let product else {
            message = "EaseSell Plus is not available in this build."
            return false
        }
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try Self.verified(verification)
                await transaction.finish()
                return await hasActiveSubscription()
            case .userCancelled, .pending:
                return false
            @unknown default:
                return false
            }
        } catch {
            message = error.localizedDescription
            return false
        }
    }

    func hasActiveSubscription() async -> Bool {
        for await result in Transaction.currentEntitlements {
            guard let transaction = try? Self.verified(result) else { continue }
            guard transaction.productID == productID, transaction.revocationDate == nil else { continue }
            if let expiration = transaction.expirationDate, expiration < Date() { continue }
            return true
        }
        return false
    }

    func watch(onChange: @escaping () async -> Void) async {
        for await update in Transaction.updates {
            guard let transaction = try? Self.verified(update) else { continue }
            await transaction.finish()
            await onChange()
        }
    }

    private static func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }
}
