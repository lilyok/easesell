import Foundation

struct Allowance: Equatable {
    var used: Int
    var limit: Int
    var subscribed: Bool

    static let freeLimit = 2
}

enum QuotaStore {
    private static let key = "easesell.usage"

    static func allowance(subscribed: Bool, now: Date = Date()) -> Allowance {
        let usage = load(now: now)
        return Allowance(used: usage.ids.count, limit: Allowance.freeLimit, subscribed: subscribed)
    }

    static func prepare(draftID: UUID, subscribed: Bool, now: Date = Date()) -> PrepareResult {
        var usage = load(now: now)
        if usage.ids.contains(draftID.uuidString) {
            return .alreadyCounted
        }
        if !subscribed && usage.ids.count >= Allowance.freeLimit {
            return .needsPayment
        }
        usage.ids.append(draftID.uuidString)
        save(usage)
        return .reserved
    }

    static func release(draftID: UUID, now: Date = Date()) {
        var usage = load(now: now)
        usage.ids.removeAll { $0 == draftID.uuidString }
        save(usage)
    }

    private struct Usage: Codable {
        var month: String
        var ids: [String]
    }

    enum PrepareResult: Equatable {
        case alreadyCounted
        case reserved
        case needsPayment
    }

    private static func load(now: Date) -> Usage {
        let month = monthKey(now)
        guard let data = UserDefaults.standard.data(forKey: key),
              let usage = try? JSONDecoder().decode(Usage.self, from: data),
              usage.month == month
        else { return Usage(month: month, ids: []) }
        return usage
    }

    private static func save(_ usage: Usage) {
        guard let data = try? JSONEncoder().encode(usage) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    private static func monthKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: date)
    }
}
