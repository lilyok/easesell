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

    func purchase(submit: (String) async throws -> Void) async -> Bool {
        guard let product else {
            message = "EaseSell Plus is not available in this build."
            return false
        }
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try Self.verified(verification)
                try await submit(verification.jwsRepresentation)
                await transaction.finish()
                return true
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

    func watch(submit: @escaping (String) async throws -> Void) async {
        for await update in Transaction.updates {
            guard let transaction = try? Self.verified(update) else { continue }
            do {
                try await submit(update.jwsRepresentation)
                await transaction.finish()
            } catch {
                message = error.localizedDescription
            }
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
