import SwiftUI

@main
struct EaseSellApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(EaseColor.teal)
        }
    }
}

enum EaseColor {
    static let paper = Color(red: 0.957, green: 0.980, blue: 0.969)
    static let ink = Color(red: 0.078, green: 0.141, blue: 0.122)
    static let teal = Color(red: 0.122, green: 0.435, blue: 0.357)
    static let inkSoft = Color(red: 0.29, green: 0.38, blue: 0.35)
}
