import AuthenticationServices
import SwiftUI

@main
struct PintoPetsApp: App {
    @State private var session = Session()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .task { await session.restore() }
        }
    }
}

struct RootView: View {
    enum Tab: String, Hashable { case pets, reminders, community, account }
    @State private var tab: Tab = Self.initialTab

    /// Debug builds accept `-tab community` (screenshots and UI checks).
    private static var initialTab: Tab {
        #if DEBUG
        return UserDefaults.standard.string(forKey: "tab").flatMap(Tab.init(rawValue:)) ?? .pets
        #else
        return .pets
        #endif
    }

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack { PetListView() }
                .tabItem { Label("My Pets", systemImage: "pawprint") }
                .tag(Tab.pets)
            NavigationStack { RemindersView() }
                .tabItem { Label("Reminders", systemImage: "bell") }
                .tag(Tab.reminders)
            NavigationStack { CommunityView() }
                .tabItem { Label("Community", systemImage: "bubble.left.and.bubble.right") }
                .tag(Tab.community)
            NavigationStack { AccountView() }
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
                .tag(Tab.account)
        }
    }
}

/// Opens PintoPets sign-in (password, Google, 2FA) in the system browser sheet.
/// A private browser session, so nothing is shared with Safari.
struct SignInButton: View {
    @Environment(Session.self) private var session
    @Environment(\.webAuthenticationSession) private var webAuth
    @State private var error: String?
    @State private var working = false

    var body: some View {
        VStack(spacing: 8) {
            Button {
                Task { await signIn() }
            } label: {
                if working { ProgressView() } else { Text("Sign in or create an account") }
            }
            .buttonStyle(.borderedProminent)
            .disabled(working)
            if let error { ErrorBanner(message: error) }
        }
    }

    private func signIn() async {
        working = true
        error = nil
        defer { working = false }
        let start = session.beginSignIn()
        do {
            let callback = try await webAuth.authenticate(
                using: start, callbackURLScheme: Session.callbackScheme,
                preferredBrowserSession: .ephemeral)
            try await session.completeSignIn(callback: callback)
        } catch let e as ASWebAuthenticationSessionError where e.code == .canceledLogin {
            session.cancelSignIn()
        } catch {
            session.cancelSignIn()
            self.error = error.localizedDescription
        }
    }
}
