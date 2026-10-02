import Foundation
import WebKit

struct ShopPrice {
    var amount: Decimal
    var currency: String?
}

struct SuggestedPrice {
    var amount: String
    var currency: String?
}

enum PriceSettings {
    private static let key = "easesell.priceCoefficient"
    private static let currencyKey = "easesell.currency"

    static let choices: [(code: String, name: String)] = [
        ("GBP", "British pound"),
        ("EUR", "Euro"),
        ("USD", "US dollar"),
        ("CAD", "Canadian dollar"),
        ("AUD", "Australian dollar"),
        ("NZD", "New Zealand dollar"),
        ("CHF", "Swiss franc"),
        ("SEK", "Swedish krona"),
        ("NOK", "Norwegian krone"),
        ("DKK", "Danish krone"),
        ("PLN", "Polish złoty"),
        ("CZK", "Czech koruna"),
        ("JPY", "Japanese yen"),
        ("CNY", "Chinese yuan"),
        ("INR", "Indian rupee"),
        ("ZAR", "South African rand"),
    ]

    static var regionCurrency: String {
        Locale.current.currency?.identifier ?? "USD"
    }

    /// Empty means the iPhone region currency.
    static var currencyCode: String {
        let stored = UserDefaults.standard.string(forKey: currencyKey) ?? ""
        return stored.isEmpty ? regionCurrency : stored
    }

    static var currencyChoice: String {
        UserDefaults.standard.string(forKey: currencyKey) ?? ""
    }

    static func saveCurrency(_ choice: String) {
        if choice.isEmpty || choice == "auto" {
            UserDefaults.standard.removeObject(forKey: currencyKey)
        } else {
            UserDefaults.standard.set(choice, forKey: currencyKey)
        }
    }

    static func symbol(for code: String) -> String {
        switch code {
        case "GBP": return "£"
        case "EUR": return "€"
        case "JPY", "CNY": return "¥"
        case "INR": return "₹"
        case "PLN": return "zł"
        case "CZK": return "Kč"
        case "SEK", "NOK", "DKK": return "kr"
        case "CHF": return "CHF"
        case "ZAR": return "R"
        case "CAD": return "C$"
        case "AUD": return "A$"
        case "NZD": return "NZ$"
        case "USD": return "$"
        default: return ""
        }
    }

    static var coefficient: Double {
        let stored = UserDefaults.standard.object(forKey: key) as? Double
        guard let stored, stored > 0 else { return 0.3 }
        return stored
    }

    static var display: String {
        format(Decimal(coefficient))
    }

    @discardableResult
    static func save(_ text: String) -> Bool {
        let normalized = text.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        guard let value = Double(normalized), value > 0, value <= 10 else { return false }
        UserDefaults.standard.set(value, forKey: key)
        return true
    }

    static func format(_ value: Decimal) -> String {
        number(value, minimumDigits: 0)
    }

    static func formatMoney(_ value: Decimal) -> String {
        number(value, minimumDigits: 2)
    }

    private static func number(_ value: Decimal, minimumDigits: Int) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.minimumFractionDigits = minimumDigits
        formatter.maximumFractionDigits = 2
        formatter.numberStyle = .decimal
        return formatter.string(from: value as NSDecimalNumber) ?? "0"
    }
}

enum PagePrice {
    static func fetch(from url: URL, currency: String) async -> ShopPrice? {
        await PagePriceLoader().load(url, currency: currency)
    }
}

private final class PagePriceLoader: NSObject, WKNavigationDelegate {
    private var webView: WKWebView?
    private var continuation: CheckedContinuation<ShopPrice?, Never>?
    private var timeout: Task<Void, Never>?
    private var finished = false
    private var currency = "USD"

    func load(_ url: URL, currency: String) async -> ShopPrice? {
        self.currency = currency
        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            Task { @MainActor in
                let webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
                webView.navigationDelegate = self
                self.webView = webView
                webView.load(URLRequest(url: url))
                self.timeout = Task { [weak self] in
                    try? await Task.sleep(nanoseconds: 18_000_000_000)
                    self?.finish(nil)
                }
            }
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            let script = """
            (() => {
              const found = [];
              function add(amount, currency) {
                if (amount == null) return;
                found.push({ amount: String(amount), currency: currency || null });
              }
              function walk(node) {
                if (!node || typeof node !== "object") return;
                if (Array.isArray(node)) { node.forEach(walk); return; }
                if (node.price != null || node.lowPrice != null) add(node.price ?? node.lowPrice, node.priceCurrency || node.currency);
                Object.values(node).forEach(walk);
              }
              document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                try { walk(JSON.parse(script.textContent)); } catch (e) {}
              });
              const metaAmount = document.querySelector('meta[property="product:price:amount"], meta[itemprop="price"]');
              const metaCurrency = document.querySelector('meta[property="product:price:currency"], meta[itemprop="priceCurrency"]');
              if (metaAmount) add(metaAmount.content, metaCurrency && metaCurrency.content);
              const item = document.querySelector('[itemprop="price"]');
              if (item) add(item.getAttribute("content") || item.textContent, null);
              const text = (document.body && document.body.innerText || "").slice(0, 8000);
              return JSON.stringify({ found, text });
            })()
            """
            let currency = self.currency
            webView.evaluateJavaScript(script) { result, _ in
                self.finish(Self.parse(result, currency: currency))
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        finish(nil)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        finish(nil)
    }

    private func finish(_ price: ShopPrice?) {
        guard !finished else { return }
        finished = true
        timeout?.cancel()
        let continuation = continuation
        self.continuation = nil
        webView?.stopLoading()
        webView = nil
        continuation?.resume(returning: price)
    }

    private static func parse(_ result: Any?, currency preferred: String) -> ShopPrice? {
        guard let json = result as? String, let data = json.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        let found = object["found"] as? [[String: Any]] ?? []
        for entry in found {
            if let price = price(from: entry["amount"] as? String, currency: entry["currency"] as? String, preferred: preferred) {
                return price
            }
        }
        return price(in: object["text"] as? String, preferred: preferred)
    }

    private static func price(from amount: String?, currency: String?, preferred: String) -> ShopPrice? {
        guard let amount else { return nil }
        let code = normalized(currency)
        if let code, code != preferred { return nil }
        if code == nil && !amountMentions(preferred, in: amount) { return nil }
        let cleaned = amount.replacingOccurrences(of: ",", with: ".")
        guard let match = cleaned.range(of: #"[0-9]+(?:\.[0-9]{1,2})?"#, options: .regularExpression) else { return nil }
        guard let value = Decimal(string: String(cleaned[match])), value > 0 else { return nil }
        return ShopPrice(amount: value, currency: preferred)
    }

    private static func price(in text: String?, preferred: String) -> ShopPrice? {
        guard let text else { return nil }
        let rawSymbol = PriceSettings.symbol(for: preferred)
        let escaped = NSRegularExpression.escapedPattern(for: rawSymbol)
        let symbolPattern = rawSymbol == "$"
            ? "(?<![A-Za-z])\\$\\s*[0-9]+(?:[.,][0-9]{2})?"
            : (escaped.isEmpty ? nil : "\(escaped)\\s*[0-9]+(?:[.,][0-9]{2})?")
        let patterns = [
            symbolPattern,
            "\(preferred)\\s*[0-9]+(?:[.,][0-9]{2})?",
        ].compactMap { $0 }
        for pattern in patterns {
            guard let match = text.range(of: pattern, options: .regularExpression) else { continue }
            if let price = price(from: String(text[match]), currency: preferred, preferred: preferred) {
                return price
            }
        }
        return nil
    }

    private static func amountMentions(_ currency: String, in amount: String) -> Bool {
        if amount.uppercased().contains(currency) { return true }
        let symbol = PriceSettings.symbol(for: currency)
        return !symbol.isEmpty && amount.contains(symbol)
    }

    private static func normalized(_ currency: String?) -> String? {
        guard let currency else { return nil }
        let code = currency.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if code.isEmpty || code == "NULL" { return nil }
        return code
    }
}
