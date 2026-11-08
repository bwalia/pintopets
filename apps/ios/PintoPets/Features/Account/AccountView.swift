import SwiftUI

struct AccountView: View {
    @Environment(Session.self) private var session
    @Environment(\.openURL) private var openURL
    @State private var confirmingSignOut = false

    var body: some View {
        List {
            switch session.state {
            case .loading:
                ProgressView("Connecting…").frame(maxWidth: .infinity)
            case .signedOut:
                Section {
                    VStack(spacing: 12) {
                        Image(systemName: "pawprint.circle.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(Color.accentColor)
                            .accessibilityHidden(true)
                        Text("Welcome to PintoPets").font(.title3.bold())
                        Text("Health records, reminders and a kind community for every kind of pet.")
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                        SignInButton()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical)
                }
            case .signedIn(let me):
                Section {
                    LabeledContent("Name", value: me.displayName)
                    LabeledContent("Email", value: me.email)
                    if me.isModerator { LabeledContent("Role", value: "Community moderator") }
                    if me.demo {
                        Label("Demo account (local development)", systemImage: "hammer")
                            .foregroundStyle(.orange)
                    }
                }
                Section {
                    web("Community name, two-factor sign-in and your data", "/account")
                    if me.isModerator { web("Moderation queue", "/moderation") }
                } header: {
                    Text("Settings")
                } footer: {
                    Text("These open on the PintoPets website, where sensitive changes ask for your authenticator code.")
                }
                if !me.demo {
                    Section {
                        Button("Sign out", role: .destructive) { confirmingSignOut = true }
                    }
                }
            }
            Section {
                web("Community guidelines", "/community/guidelines")
                LabeledContent("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
                #if DEBUG
                LabeledContent("Server", value: session.api.baseURL.absoluteString)
                #endif
            } header: { Text("About") }
        }
        .navigationTitle("Account")
        .confirmationDialog("Sign out of PintoPets on this device?", isPresented: $confirmingSignOut, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) { session.signOut() }
        }
    }

    private func web(_ title: String, _ path: String) -> some View {
        Button {
            openURL(session.api.url(path))
        } label: {
            HStack {
                Text(title).foregroundStyle(Color.primary)
                Spacer()
                Image(systemName: "arrow.up.right.square").foregroundStyle(.secondary).accessibilityHidden(true)
            }
        }
        .accessibilityHint("Opens the PintoPets website")
    }
}
