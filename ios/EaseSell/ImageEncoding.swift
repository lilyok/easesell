import CoreTransferable
import Foundation
import UIKit
import UniformTypeIdentifiers

struct PickedImage: Transferable {
    let data: Data

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(importedContentType: .image) { data in
            PickedImage(data: data)
        }
    }
}

enum ImageEncoding {
    static func jpeg(from image: UIImage) -> Data? {
        let longest = max(image.size.width, image.size.height)
        let scale = min(1, 1280 / max(longest, 1))
        let target = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: target)
        let scaled = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
        var quality: CGFloat = 0.82
        var data = scaled.jpegData(compressionQuality: quality)
        while let current = data, current.count > 3_500_000, quality > 0.4 {
            quality -= 0.15
            data = scaled.jpegData(compressionQuality: quality)
        }
        return data
    }
}
