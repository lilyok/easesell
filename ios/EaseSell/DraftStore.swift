import Foundation
import UIKit

struct ListingDraft: Codable, Identifiable, Equatable {
    var id: UUID
    var imageFilename: String
    var title: String
    var details: String
    var price: String
    var sourceURL: String?
    var sourceTitle: String?
    var currency: String?
    var errorMessage: String?
    var createdAt: Date

    var displayTitle: String {
        title.isEmpty ? "New item" : title
    }

    var priceLabel: String {
        if price.isEmpty { return "Price not set" }
        return "\(currencySymbol)\(price)"
    }

    private var currencySymbol: String {
        PriceSettings.symbol(for: currency ?? "")
    }
}

@MainActor
final class DraftStore {
    private let directory: URL
    private let indexURL: URL
    private let imagesURL: URL

    init() {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        directory = support.appendingPathComponent("EaseSell", isDirectory: true)
        imagesURL = directory.appendingPathComponent("images", isDirectory: true)
        indexURL = directory.appendingPathComponent("drafts.json")
        try? FileManager.default.createDirectory(at: imagesURL, withIntermediateDirectories: true)
    }

    func load() -> [ListingDraft] {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let data = try? Data(contentsOf: indexURL),
              let drafts = try? decoder.decode([ListingDraft].self, from: data)
        else { return [] }
        return drafts.sorted { $0.createdAt > $1.createdAt }
    }

    func create(imageData: Data) -> ListingDraft {
        let id = UUID()
        let draft = ListingDraft(
            id: id,
            imageFilename: "\(id.uuidString).jpg",
            title: "",
            details: "",
            price: "",
            sourceURL: nil,
            sourceTitle: nil,
            errorMessage: nil,
            createdAt: Date()
        )
        try? imageData.write(to: imagesURL.appendingPathComponent(draft.imageFilename), options: .atomic)
        var drafts = load()
        drafts.insert(draft, at: 0)
        persist(drafts)
        return draft
    }

    func update(id: UUID, _ change: (inout ListingDraft) -> Void) {
        var drafts = load()
        guard let index = drafts.firstIndex(where: { $0.id == id }) else { return }
        change(&drafts[index])
        persist(drafts)
    }

    func remove(id: UUID) {
        var drafts = load()
        guard let index = drafts.firstIndex(where: { $0.id == id }) else { return }
        let filename = drafts[index].imageFilename
        drafts.remove(at: index)
        persist(drafts)
        try? FileManager.default.removeItem(at: imagesURL.appendingPathComponent(filename))
    }

    func image(for draft: ListingDraft) -> UIImage? {
        let url = imagesURL.appendingPathComponent(draft.imageFilename)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }

    func imageData(for draft: ListingDraft) -> Data? {
        try? Data(contentsOf: imagesURL.appendingPathComponent(draft.imageFilename))
    }

    private func persist(_ drafts: [ListingDraft]) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(drafts) else { return }
        try? data.write(to: indexURL, options: .atomic)
    }
}
