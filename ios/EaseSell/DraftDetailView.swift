import SwiftUI

struct DraftDetailView: View {
    @Environment(AppModel.self) private var model
    let draftID: UUID
    @State private var title = ""
    @State private var details = ""
    @State private var price = ""

    private var draft: ListingDraft? {
        model.drafts.first { $0.id == draftID }
    }

    var body: some View {
        Form {
            if let draft, let image = model.image(for: draft) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: .infinity)
                    .listRowInsets(EdgeInsets())
            }
            Section("Listing") {
                TextField("Title", text: $title)
                TextField("Description", text: $details, axis: .vertical)
                    .lineLimit(3...8)
                TextField("Price", text: $price)
                    .keyboardType(.decimalPad)
            }
            if let source = draft?.sourceURL, let url = URL(string: source) {
                Section("Similar page") {
                    Link(draft?.sourceTitle ?? source, destination: url)
                }
            }
            if let error = draft?.errorMessage {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                    Button(model.busy ? "Looking it up…" : "Try again") {
                        suggestName()
                    }
                    .disabled(model.busy)
                }
            }
        }
        .navigationTitle(title.isEmpty ? "New item" : title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(model.busy ? "Looking it up…" : (draft?.errorMessage == nil ? "Suggest details" : "Try again")) {
                    suggestName()
                }
                .disabled(model.busy)
            }
        }
        .onAppear(perform: load)
        .onChange(of: draft?.title) { _, _ in load() }
        .onChange(of: draft?.price) { _, _ in load() }
        .onChange(of: title) { _, value in
            model.update(id: draftID, title: value)
        }
        .onChange(of: details) { _, value in
            model.update(id: draftID, details: value)
        }
        .onChange(of: price) { _, value in
            let filtered = value.filter { $0.isNumber || $0 == "." }
            if filtered != value { price = filtered }
            model.update(id: draftID, price: filtered)
        }
    }

    private func suggestName() {
        guard let draft else { return }
        Task { await model.identify(draft) }
    }

    private func load() {
        guard let draft else { return }
        if title != draft.title { title = draft.title }
        if details != draft.details { details = draft.details }
        if price != draft.price { price = draft.price }
    }
}

struct PaywallView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Two free listings are used this month.")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(EaseColor.ink)
                Text("EaseSell Plus removes the monthly cap. The photo and the price still stay on this iPhone.")
                    .foregroundStyle(EaseColor.inkSoft)
                if let product = model.purchases.product {
                    Text(product.displayPrice + " per month")
                        .font(.headline)
                        .foregroundStyle(EaseColor.ink)
                }
                if let message = model.purchases.message {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
                Button("Subscribe") {
                    Task {
                        await model.subscribe()
                        if model.allowance.subscribed { dismiss() }
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(model.busy)
                Spacer()
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(EaseColor.paper)
            .navigationTitle("EaseSell Plus")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}
