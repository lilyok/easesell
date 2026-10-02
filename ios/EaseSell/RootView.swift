import PhotosUI
import SwiftUI
import UIKit

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        DraftListView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(EaseColor.paper)
            .alert("EaseSell", isPresented: alertShown) {
                Button("OK", role: .cancel) { model.alert = nil }
            } message: {
                Text(model.alert ?? "")
            }
            .sheet(isPresented: paywallShown) {
                PaywallView()
            }
            .sheet(isPresented: settingsShown) {
                PriceSettingsView()
            }
            .task {
                await model.refresh()
            }
    }

    private var alertShown: Binding<Bool> {
        Binding(
            get: { model.alert != nil },
            set: { if !$0 { model.alert = nil } }
        )
    }

    private var settingsShown: Binding<Bool> {
        Binding(
            get: { model.showSettings },
            set: { model.showSettings = $0 }
        )
    }

    private var paywallShown: Binding<Bool> {
        Binding(
            get: { model.paywall },
            set: { model.paywall = $0 }
        )
    }

}

struct PriceSettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    Picker("Currency", selection: $model.currencyChoice) {
                        Text("iPhone region (\(PriceSettings.regionCurrency))")
                            .tag("")
                        ForEach(PriceSettings.choices, id: \.code) { choice in
                            Text("\(choice.name) (\(PriceSettings.symbol(for: choice.code)))")
                                .tag(choice.code)
                        }
                    }
                } footer: {
                    Text("EaseSell looks for this currency on the similar page. iPhone region uses the region in Settings, not an Apple Pay card.")
                }
                Section {
                    TextField("Coefficient", text: $model.priceCoefficientText)
                        .keyboardType(.decimalPad)
                } footer: {
                    Text("EaseSell multiplies the shop price from the similar page by this. 0.3 means 30% of that price.")
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { model.savePriceCoefficient() }
                }
            }
        }
    }
}

struct DraftListView: View {
    @Environment(AppModel.self) private var model
    @State private var photoItem: PhotosPickerItem?
    @State private var showCamera = false

    var body: some View {
        NavigationStack {
            Group {
                if model.drafts.isEmpty {
                    ContentUnavailableView(
                        "No listings yet",
                        systemImage: "camera",
                        description: Text("Take a photo of something you want to sell.")
                    )
                } else {
                    List(model.drafts) { draft in
                        NavigationLink(value: draft.id) {
                            DraftRow(draft: draft, image: model.image(for: draft))
                        }
                        .swipeActions {
                            Button("Delete", role: .destructive) {
                                model.remove(id: draft.id)
                            }
                        }
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Listings")
            .navigationDestination(for: UUID.self) { id in
                DraftDetailView(draftID: id)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Settings") { model.showSettings = true }
                }
                ToolbarItem(placement: .principal) {
                    Text(allowance)
                        .font(.caption)
                        .foregroundStyle(EaseColor.inkSoft)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        Button {
                            showCamera = true
                        } label: {
                            Image(systemName: "camera")
                        }
                    }
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        Image(systemName: "photo")
                    }
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraPicker { image in
                    Task { await model.addPhoto(image) }
                }
                .ignoresSafeArea()
            }
            .onChange(of: photoItem) { _, item in
                guard let item else { return }
                Task {
                    if let picked = try? await item.loadTransferable(type: PickedImage.self),
                       let image = UIImage(data: picked.data) {
                        await model.addPhoto(image)
                    }
                    photoItem = nil
                }
            }
        }
    }

    private var allowance: String {
        if model.allowance.subscribed { return "Plus" }
        return "\(model.allowance.used) of \(model.allowance.limit) free"
    }
}

struct DraftRow: View {
    var draft: ListingDraft
    var image: UIImage?

    var body: some View {
        HStack(spacing: 12) {
            thumbnail
            VStack(alignment: .leading, spacing: 4) {
                Text(draft.displayTitle)
                    .foregroundStyle(EaseColor.ink)
                Text(priceLabel)
                    .font(.subheadline)
                    .foregroundStyle(EaseColor.inkSoft)
            }
        }
    }

    private var priceLabel: String {
        draft.priceLabel
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let image {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        } else {
            RoundedRectangle(cornerRadius: 8)
                .fill(EaseColor.teal.opacity(0.15))
                .frame(width: 56, height: 56)
        }
    }
}
