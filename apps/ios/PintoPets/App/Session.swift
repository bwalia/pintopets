import Foundation
import Observation

/// Who is signed in, and the API client that acts for them.
@MainActor
@Observable
final class Session {
    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(Me)
    }

    private(set) var state: State = .loading
    let api: APIClient
    /// The verifier for a sign-in in progress (memory only).
    private var pending: PKCE?

    private static let tokenAccount = "bearer"

    init(api: APIClient = APIClient(baseURL: Session.configuredBaseURL)) {
        self.api = api
        api.token = Keychain.read(account: Self.tokenAccount)
        api.onUnauthenticated = { [weak self] in
            Task { @MainActor in self?.expire() }
        }
    }

    /// PintoPetsAPIURL from Info.plist (set per build configuration).
    nonisolated static var configuredBaseURL: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "PintoPetsAPIURL") as? String
        return URL(string: raw ?? "") ?? URL(string: "https://int.pintopets.app")!
    }

    var me: Me? {
        if case .signedIn(let me) = state { return me }
        return nil
    }

    var isSignedIn: Bool { me != nil }

    /// Checks the saved token (or local demo mode) with GET /api/v1/me.
    func restore() async {
        do {
            let me: DataEnvelope<Me> = try await api.get("/api/v1/me")
            state = .signedIn(me.data)
        } catch let error as APIError where error.isUnauthenticated {
            signOutLocally()
        } catch {
            // Offline or server trouble: keep the token, try again later.
            state = api.token == nil ? .signedOut : .loading
            if api.token != nil {
                try? await Task.sleep(for: .seconds(3))
                if case .loading = state { await restore() }
            }
        }
    }

    // MARK: Sign-in (authorization code + PKCE, see apps/web/src/server/app-auth.ts)

    static let callbackScheme = "pintopets"

    /// The page to open in the system sign-in sheet.
    func beginSignIn() -> URL {
        let pkce = PKCE()
        pending = pkce
        return api.url("/auth/app/start", query: ["challenge": pkce.challenge])
    }

    /// Handles pintopets://auth/callback?code=…
    func completeSignIn(callback: URL) async throws {
        guard let pkce = pending else { throw APIError.signInExpired }
        pending = nil
        let components = URLComponents(url: callback, resolvingAgainstBaseURL: false)
        guard callback.scheme == Self.callbackScheme, callback.host == "auth",
              let code = components?.queryItems?.first(where: { $0.name == "code" })?.value
        else { throw APIError.signInExpired }
        let saved = api.token
        api.token = nil
        do {
            let token: DataEnvelope<AppToken> = try await api.send(
                "POST", "/api/v1/auth/token", body: AppTokenRequest(code: code, verifier: pkce.verifier))
            api.token = token.data.token
            Keychain.save(token.data.token, account: Self.tokenAccount)
            await restore()
        } catch {
            api.token = saved
            throw error
        }
    }

    func cancelSignIn() { pending = nil }

    /// Forgets the token on this device. (Tokens are signed, not stored on the
    /// server; they lapse after 30 days.)
    func signOut() {
        signOutLocally()
        Task { await restore() }
    }

    private func signOutLocally() {
        api.token = nil
        Keychain.delete(account: Self.tokenAccount)
        ImageLoader.shared.clear()
        state = .signedOut
    }

    private func expire() {
        guard api.token != nil else { return }
        signOutLocally()
    }
}

extension APIError {
    static let signInExpired = APIError(
        status: 0, code: "sign_in_expired", message: "That sign-in didn't finish. Please try again.")
}
