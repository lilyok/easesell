import Foundation

struct PhotoMatch {
    var title: String
    var details: String
    var sourceURL: String?
    var sourceTitle: String?
}

enum VisionError: Error, LocalizedError {
    case missingKey
    case message(String)

    var errorDescription: String? {
        switch self {
        case .missingKey:
            return "Add your Google Cloud Vision key in Settings."
        case .message(let text):
            return text
        }
    }
}

enum VisionClient {
    static func identify(image: Data, apiKey: String) async throws -> PhotoMatch {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { throw VisionError.missingKey }

        var components = URLComponents(string: "https://vision.googleapis.com/v1/images:annotate")!
        components.queryItems = [URLQueryItem(name: "key", value: key)]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "requests": [
                [
                    "image": ["content": image.base64EncodedString()],
                    "features": [["type": "WEB_DETECTION", "maxResults": 5]],
                ],
            ],
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if status >= 400 {
            let message = ((json?["error"] as? [String: Any])?["message"] as? String)
                ?? "Google Vision could not name this photo."
            throw VisionError.message(message.replacingOccurrences(of: "key=\(key)", with: "key=***"))
        }
        let first = (json?["responses"] as? [[String: Any]])?.first
        if let error = first?["error"] as? [String: Any], let message = error["message"] as? String {
            throw VisionError.message(message)
        }
        return match(web: first?["webDetection"] as? [String: Any])
    }

    private static func match(web: [String: Any]?) -> PhotoMatch {
        let guesses = web?["bestGuessLabels"] as? [[String: Any]]
        let entities = web?["webEntities"] as? [[String: Any]]
        let pages = web?["pagesWithMatchingImages"] as? [[String: Any]]
        let guess = guesses?.compactMap { $0["label"] as? String }.first { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        let entity = entities?
            .sorted { (($0["score"] as? Double) ?? 0) > (($1["score"] as? Double) ?? 0) }
            .compactMap { $0["description"] as? String }
            .first { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        let title = (guess ?? entity)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let page = pages?.first { ($0["url"] as? String)?.hasPrefix("http") == true }
        let sourceURL = page?["url"] as? String
        let sourceTitle = (page?["pageTitle"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        if title.isEmpty {
            return PhotoMatch(
                title: "",
                details: "Google Vision did not recognize this photo. Name the item and set the price you want to ask.",
                sourceURL: sourceURL,
                sourceTitle: sourceTitle
            )
        }
        let pageSentence = (sourceTitle?.isEmpty == false) ? " A similar page is “\(sourceTitle!)”." : ""
        return PhotoMatch(
            title: String(title.prefix(180)),
            details: "Google Vision matched this photo to “\(title)”.\(pageSentence) Set the price you want to ask.",
            sourceURL: sourceURL,
            sourceTitle: sourceTitle
        )
    }
}
