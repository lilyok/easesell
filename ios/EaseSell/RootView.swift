import AuthenticationServices
import PhotosUI
import SwiftUI
import UIKit

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            if model.signedIn {
                DraftListView()
            } else {
                SignInView()
            }
        }
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

    private var paywallShown: Binding<Bool> {
        Binding(
            get: { model.paywall },
            set: { model.paywall = $0 }
        )
    }
}

struct SignInView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Spacer()
            Text("EASESELL")
                .font(.caption.weight(.semibold))
                .tracking(3)
                .foregroundStyle(EaseColor.teal)
            Text("Photograph it. Name it. Price it.")
                .font(.largeTitle.weight(.semibold))
                .foregroundStyle(EaseColor.ink)
            Text("Two listings a month are free. EaseSell Plus lifts the cap. The photo and the price stay on this iPhone.")
                .foregroundStyle(EaseColor.inkSoft)
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = []
            } onCompletion: { result in
                guard case .success(let authorization) = result,
                      let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                      let token = credential.identityToken,
                      let text = String(data: token, encoding: .utf8)
                else { return }
                Task { await model.signIn(identityToken: text) }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 48)
            #if DEBUG
            Button("Continue on this simulator") {
                Task { await model.signInDev() }
            }
            .buttonStyle(.bordered)
            #endif
            Spacer()
        }
        .padding(24)
        .disabled(model.busy)
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
                    Button("Sign out") { model.signOut() }
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
        guard let account = model.account else { return "" }
        if account.subscribed { return "Plus" }
        return "\(account.used) of \(account.limit) free"
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
        if draft.price.isEmpty { return "Price not set" }
        return "$\(draft.price)"
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
