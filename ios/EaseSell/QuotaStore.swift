import Foundation

struct Allowance: Equatable {
    var used: Int
    var limit: Int
    var subscribed: Bool

    static let freeLimit = 2
}

enum QuotaStore {
    private static let key = "easesell.visionWeek"

    static func allowance(subscribed: Bool, now: Date = Date()) -> Allowance {
        let usage = load(now: now)
        return Allowance(used: usage.count, limit: Allowance.freeLimit, subscribed: subscribed)
    }

    static func canRequest(subscribed: Bool, now: Date = Date()) -> Bool {
        subscribed || load(now: now).count < Allowance.freeLimit
    }

    static func record(now: Date = Date()) {
        var usage = load(now: now)
        usage.count += 1
        save(usage)
    }

    private struct Usage: Codable {
        var week: String
        var count: Int
    }

    private static func load(now: Date) -> Usage {
        let week = weekKey(now)
        guard let data = UserDefaults.standard.data(forKey: key),
              let usage = try? JSONDecoder().decode(Usage.self, from: data),
              usage.week == week
        else { return Usage(week: week, count: 0) }
        return usage
    }

    private static func save(_ usage: Usage) {
        guard let data = try? JSONEncoder().encode(usage) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    private static func weekKey(_ date: Date) -> String {
        var calendar = Calendar(identifier: .iso8601)
        calendar.timeZone = .current
        let week = calendar.component(.weekOfYear, from: date)
        let year = calendar.component(.yearForWeekOfYear, from: date)
        return String(format: "%d-W%02d", year, week)
    }
}
