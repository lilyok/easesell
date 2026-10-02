import Foundation

struct PhotoMatch {
    var title: String
    var details: String
    var sourceURL: String?
    var sourceTitle: String?
}

enum VisionError: Error, LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case .message(let text):
            return text
        }
    }
}

enum VisionClient {
    /// Google Cloud Vision key shipped with the app. Users never enter it.
    /// Fill this in locally. Do not commit the value; the GitHub repo is public.
    private static let apiKey = ""

    static func identify(image: Data) async throws -> PhotoMatch {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            throw VisionError.message("EaseSell cannot name this photo yet.")
        }

        let url = URL(string: "https://vision.googleapis.com/v1/images:annotate")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(key, forHTTPHeaderField: "X-Goog-Api-Key")
        request.setValue("app.easesell.ios", forHTTPHeaderField: "X-Ios-Bundle-Identifier")
        let body: [String: Any] = [
            "requests": [
                [
                    "image": ["content": image.base64EncodedString()],
                    "features": [["type": "WEB_DETECTION", "maxResults": 15]],
                ],
            ],
        ]
        let payload = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await send(request, body: payload)
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

    private static func send(_ request: URLRequest, body: Data) async throws -> (Data, URLResponse) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.waitsForConnectivity = true
        configuration.timeoutIntervalForRequest = 60
        let session = URLSession(configuration: configuration)
        defer { session.finishTasksAndInvalidate() }

        let retryable: Set<URLError.Code> = [
            .networkConnectionLost, .timedOut, .cannotConnectToHost, .notConnectedToInternet,
        ]
        var lastError: Error = URLError(.networkConnectionLost)
        for attempt in 0..<3 {
            do {
                return try await session.upload(for: request, from: body)
            } catch let error as URLError where retryable.contains(error.code) && attempt < 2 {
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt + 1) * 500_000_000)
            } catch {
                throw error
            }
        }
        throw lastError
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
        let page = LocalPage.preferred(from: pages ?? [])
        let sourceURL = page?["url"] as? String
        let sourceTitle = (page?["pageTitle"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let extraLabels = (entities ?? [])
            .sorted { (($0["score"] as? Double) ?? 0) > (($1["score"] as? Double) ?? 0) }
            .compactMap { $0["description"] as? String }
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && $0.caseInsensitiveCompare(title) != .orderedSame }
        var seen = Set<String>()
        let details = extraLabels
            .filter { seen.insert($0.lowercased()).inserted }
            .prefix(3)
            .joined(separator: ", ")
        return PhotoMatch(
            title: String(title.prefix(180)),
            details: String(details.prefix(500)),
            sourceURL: sourceURL,
            sourceTitle: sourceTitle
        )
    }
}

enum LocalPage {
    static func preferred(from pages: [[String: Any]]) -> [String: Any]? {
        let country = Locale.current.region?.identifier ?? "GB"
        let usable = pages.enumerated().filter { ($0.element["url"] as? String)?.hasPrefix("http") == true }
        return usable.max { lhs, rhs in
            let left = score(lhs.element, country: country)
            let right = score(rhs.element, country: country)
            if left == right { return lhs.offset > rhs.offset }
            return left < right
        }?.element
    }

    private static func score(_ page: [String: Any], country: String) -> Int {
        guard let url = page["url"] as? String, let host = URL(string: url)?.host?.lowercased() else { return 0 }
        var value = 0
        if suffixes(for: country).contains(where: { host.hasSuffix($0) }) {
            value += 20
        }
        if host.contains("youtube") || host.contains("pinterest") || host.contains("wikipedia") || host.contains("facebook") {
            value -= 30
        }
        return value
    }

    private static func suffixes(for country: String) -> [String] {
        switch country {
        case "GB": return [".co.uk", ".uk"]
        case "AU": return [".com.au"]
        case "IE": return [".ie"]
        case "JP": return [".co.jp", ".jp"]
        case "US": return []
        default: return [".\(country.lowercased())"]
        }
    }
}
