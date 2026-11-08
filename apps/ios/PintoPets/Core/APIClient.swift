import Foundation

/// Every PintoPets API error: `{ "error": { "code", "message", "details" } }`.
/// `message` is written for people, so it is safe to show as-is.
struct APIError: Error, LocalizedError, Equatable {
    let status: Int
    let code: String
    let message: String
    /// Field messages for `validation_failed`.
    var issues: [String] = []

    var errorDescription: String? {
        issues.isEmpty ? message : ([message] + issues).joined(separator: "\n")
    }

    var isUnauthenticated: Bool { code == "unauthenticated" }
    /// Sensitive actions need a recent authenticator code, which the web app handles.
    var needsStepUp: Bool { code == "step_up_required" }

    static let offline = APIError(
        status: 0, code: "offline",
        message: "Can't reach PintoPets. Check your connection and try again.")
}

private struct ErrorEnvelope: Decodable {
    struct Body: Decodable {
        let code: String
        let message: String
        let details: JSONValue?
    }
    let error: Body
}

struct DataEnvelope<T: Decodable>: Decodable {
    let data: T
}

/// Thin async client for `/api/v1`. Adds the bearer token, decodes the standard
/// envelopes and turns failures into `APIError`.
final class APIClient: @unchecked Sendable {
    let baseURL: URL
    private let session: URLSession
    private let tokenLock = NSLock()
    private var _token: String?
    /// Called when the server says the token is no longer valid.
    var onUnauthenticated: (@Sendable () -> Void)?

    var token: String? {
        get { tokenLock.lock(); defer { tokenLock.unlock() }; return _token }
        set { tokenLock.lock(); _token = newValue; tokenLock.unlock() }
    }

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    static let decoder = JSONDecoder()
    static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.outputFormatting = [.sortedKeys]
        return e
    }()

    func url(_ path: String, query: [String: String?] = [:]) -> URL {
        var components = URLComponents(
            url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        let items = query.compactMap { key, value in value.map { URLQueryItem(name: key, value: $0) } }
            .sorted { $0.name < $1.name }
        components.queryItems = items.isEmpty ? nil : items
        return components.url!
    }

    /// Resolves a server path such as `/api/v1/photos/…/file?variant=thumb`.
    func absolute(_ pathAndQuery: String) -> URL? {
        URL(string: pathAndQuery, relativeTo: baseURL)?.absoluteURL
    }

    func request(_ url: URL, method: String = "GET") -> URLRequest {
        var r = URLRequest(url: url)
        r.httpMethod = method
        r.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return r
    }

    // MARK: Calls

    func get<T: Decodable>(_ path: String, query: [String: String?] = [:]) async throws -> T {
        try await send(request(url(path, query: query)))
    }

    func send<T: Decodable, B: Encodable>(_ method: String, _ path: String, body: B) async throws -> T {
        var r = request(url(path), method: method)
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        r.httpBody = try Self.encoder.encode(body)
        return try await send(r)
    }

    /// For endpoints that answer 204 No Content.
    func sendNoContent<B: Encodable>(_ method: String, _ path: String, body: B?) async throws {
        var r = request(url(path), method: method)
        if let body {
            r.setValue("application/json", forHTTPHeaderField: "Content-Type")
            r.httpBody = try Self.encoder.encode(body)
        }
        _ = try await data(for: r)
    }

    func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data = try await data(for: request)
        do {
            return try Self.decoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("Decoding \(T.self) failed: \(error)")
            #endif
            throw APIError(
                status: 200, code: "bad_response",
                message: "PintoPets sent something this version of the app doesn't understand. Please update the app.")
        }
    }

    func data(for request: URLRequest) async throws -> Data {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError where error.code == .cancelled {
            throw CancellationError()
        } catch {
            throw APIError.offline
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let apiError = Self.apiError(status: status, data: data)
            if apiError.isUnauthenticated, request.value(forHTTPHeaderField: "Authorization") != nil {
                onUnauthenticated?()
            }
            throw apiError
        }
        return data
    }

    static func apiError(status: Int, data: Data) -> APIError {
        if let envelope = try? decoder.decode(ErrorEnvelope.self, from: data) {
            return APIError(
                status: status, code: envelope.error.code, message: envelope.error.message,
                issues: envelope.error.details?.messages ?? [])
        }
        let fallback: String
        switch status {
        case 401: fallback = "Please sign in to continue."
        case 429: fallback = "That's a lot at once. Please wait a moment and try again."
        case 500...: fallback = "Something went wrong on our side. Please try again."
        default: fallback = "That didn't work. Please try again."
        }
        return APIError(status: status, code: "http_\(status)", message: fallback)
    }

    // MARK: Multipart (photo upload)

    func upload<T: Decodable>(
        _ path: String, file: Data, filename: String, mimeType: String, fields: [String: String]
    ) async throws -> T {
        let boundary = "PintoPets-\(UUID().uuidString)"
        var r = request(url(path), method: "POST")
        r.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        func line(_ s: String) { body.append(Data((s + "\r\n").utf8)) }
        for (name, value) in fields.sorted(by: { $0.key < $1.key }) where !value.isEmpty {
            line("--\(boundary)")
            line("Content-Disposition: form-data; name=\"\(name)\"")
            line("")
            line(value)
        }
        line("--\(boundary)")
        line("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"")
        line("Content-Type: \(mimeType)")
        line("")
        body.append(file)
        line("")
        line("--\(boundary)--")
        r.httpBody = body
        return try await send(r)
    }
}

/// Any JSON value: used for records, whose fields differ by kind.
enum JSONValue: Codable, Hashable, Sendable {
    case string(String), number(Double), bool(Bool), array([JSONValue]), object([String: JSONValue]), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else if let a = try? c.decode([JSONValue].self) { self = .array(a) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let s): try c.encode(s)
        case .number(let n): try c.encode(n)
        case .bool(let b): try c.encode(b)
        case .array(let a): try c.encode(a)
        case .object(let o): try c.encode(o)
        case .null: try c.encodeNil()
        }
    }

    subscript(key: String) -> JSONValue? {
        if case .object(let o) = self { return o[key] }
        return nil
    }

    var string: String? {
        switch self {
        case .string(let s): return s.isEmpty ? nil : s
        case .number(let n): return n.rounded() == n ? String(Int(n)) : String(n)
        case .bool(let b): return b ? "Yes" : "No"
        default: return nil
        }
    }

    var number: Double? {
        if case .number(let n) = self { return n }
        return nil
    }

    /// Every `message` string inside (validation issues are `[{ path, message }]`).
    var messages: [String] {
        switch self {
        case .array(let a): return a.flatMap(\.messages)
        case .object(let o):
            if case .string(let m)? = o["message"] { return [m] }
            return o.values.flatMap(\.messages)
        default: return []
        }
    }
}
