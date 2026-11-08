import CryptoKit
import Foundation

/// Proof Key for Code Exchange (RFC 7636, S256). The verifier stays in memory
/// in the app; only its hash travels through the browser.
struct PKCE {
    let verifier: String
    let challenge: String

    init(verifier: String = PKCE.randomVerifier()) {
        self.verifier = verifier
        self.challenge = PKCE.challenge(for: verifier)
    }

    static func randomVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        precondition(status == errSecSuccess, "No secure random numbers available")
        return base64URL(Data(bytes))
    }

    static func challenge(for verifier: String) -> String {
        base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
    }

    static func base64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
