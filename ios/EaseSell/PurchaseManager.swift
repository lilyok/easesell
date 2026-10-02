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
            message = product == nil ? "EaseSell Plus is not available in this build." : nil
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
                message = nil
                return isActive(transaction)
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

    func restore() async -> Bool {
        do {
            try await AppStore.sync()
        } catch is CancellationError {
            return false
        } catch StoreKitError.userCancelled {
            return false
        } catch {
            message = error.localizedDescription
            return false
        }
        let active = await hasActiveSubscription()
        message = active ? nil : "No active EaseSell Plus subscription was found."
        return active
    }

    func hasActiveSubscription() async -> Bool {
        if let result = await Transaction.latest(for: productID),
           let transaction = try? Self.verified(result),
           isActive(transaction) {
            return true
        }
        for await result in Transaction.currentEntitlements {
            guard let transaction = try? Self.verified(result), isActive(transaction) else { continue }
            return true
        }
        return false
    }

    private func isActive(_ transaction: Transaction) -> Bool {
        guard transaction.productID == productID, transaction.revocationDate == nil else { return false }
        if let expiration = transaction.expirationDate, expiration < Date() { return false }
        return true
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
