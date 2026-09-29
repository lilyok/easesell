import Foundation

struct Account: Codable, Equatable {
    var used: Int
    var limit: Int
    var subscribed: Bool
    var month: String
}

struct IdentifyResponse: Codable {
    var found: Bool
    var title: String
    var details: String
    var sourceUrl: String?
    var sourceTitle: String?
    var account: Account
}

struct SessionResponse: Codable {
    var token: String
    var account: Account
}

struct ServiceFailure: Codable {
    var error: String
    var code: String?
}

enum ServiceError: Error, LocalizedError {
    case message(String, status: Int, code: String?)

    var errorDescription: String? {
        switch self {
        case .message(let text, _, _):
            return text
        }
    }

    var status: Int {
        switch self {
        case .message(_, let status, _):
            return status
        }
    }

    var code: String? {
        switch self {
        case .message(_, _, let code):
            return code
        }
    }
}

struct APIClient {
    var baseURL: URL

    init() {
        let raw = Bundle.main.object(forInfoDictionaryKey: "EaseSellAPIBaseURL") as? String
        baseURL = URL(string: raw ?? "http://127.0.0.1:43127")!
    }

    func signIn(identityToken: String) async throws -> SessionResponse {
        try await post(path: "/api/session", token: nil, body: ["identityToken": identityToken])
    }

    func signInDev() async throws -> SessionResponse {
        try await post(path: "/api/session", token: nil, body: ["devUser": "simulator"])
    }

    func account(token: String) async throws -> Account {
        try await get(path: "/api/account", token: token)
    }

    func identify(token: String, draftID: UUID, image: Data) async throws -> IdentifyResponse {
        try await post(
            path: "/api/identify",
            token: token,
            body: [
                "draftId": draftID.uuidString,
                "imageBase64": image.base64EncodedString(),
            ]
        )
    }

    func submitSubscription(token: String, signedTransaction: String) async throws -> Account {
        try await post(
            path: "/api/subscription",
            token: token,
            body: ["signedTransaction": signedTransaction]
        )
    }

    private func get<T: Decodable>(path: String, token: String) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await send(request)
    }

    private func post<T: Decodable>(path: String, token: String?, body: [String: String]) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await send(request)
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if (200..<300).contains(status) {
            return try JSONDecoder().decode(T.self, from: data)
        }
        let failure = try? JSONDecoder().decode(ServiceFailure.self, from: data)
        throw ServiceError.message(
            failure?.error ?? "The service could not finish that request.",
            status: status,
            code: failure?.code
        )
    }
}
