import Foundation
import Security

enum KeychainStore {
    private static let service = "app.easesell.ios"
    private static let account = "vision-api-key"

    static func loadVisionKey() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let key = String(data: data, encoding: .utf8)
        else { return nil }
        return key
    }

    static func saveVisionKey(_ key: String) {
        let data = Data(key.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        guard !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        var insert = query
        insert[kSecValueData as String] = data
        SecItemAdd(insert as CFDictionary, nil)
    }
}
