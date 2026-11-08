import SwiftUI

/// Loading → content or a friendly error with Try again.
enum Loadable<Value> {
    case idle, loading, loaded(Value), failed(String)

    var value: Value? {
        if case .loaded(let v) = self { return v }
        return nil
    }
}

struct ErrorStateView: View {
    let message: String
    var retry: (() async -> Void)?

    var body: some View {
        ContentUnavailableView {
            Label("Something went wrong", systemImage: "exclamationmark.triangle")
        } description: {
            Text(message)
        } actions: {
            if let retry {
                Button("Try again") { Task { await retry() } }
                    .buttonStyle(.borderedProminent)
            }
        }
    }
}

/// Inline error inside forms and sheets.
struct ErrorBanner: View {
    let message: String

    var body: some View {
        Label {
            Text(message).fixedSize(horizontal: false, vertical: true)
        } icon: {
            Image(systemName: "exclamationmark.circle.fill")
        }
        .font(.callout)
        .foregroundStyle(.red)
        .accessibilityElement(children: .combine)
    }
}

/// Shown on health topics: the forum is never a substitute for a vet.
struct UrgentHelpBanner: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("If your pet seems very unwell right now", systemImage: "cross.case.fill")
                .font(.headline)
            Text("Call your vet, or an out-of-hours emergency vet, straight away. Trouble breathing, collapse, seizures, heavy bleeding, suspected poisoning or a swollen tummy can't wait for forum replies.")
                .font(.callout)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .combine)
    }
}

struct SignInPrompt: View {
    let message: String

    var body: some View {
        ContentUnavailableView {
            Label("Sign in to continue", systemImage: "person.crop.circle")
        } description: {
            Text(message)
        } actions: {
            SignInButton()
        }
    }
}

/// Text with tappable http(s) links; nothing is rendered as HTML.
struct LinkedText: View {
    let text: String

    var body: some View {
        Text(Self.attributed(text))
            .textSelection(.enabled)
    }

    static func attributed(_ text: String) -> AttributedString {
        var out = AttributedString(text)
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else { return out }
        let ns = text as NSString
        for match in detector.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
            guard let url = match.url, ["http", "https"].contains(url.scheme?.lowercased() ?? ""),
                  let range = Range(match.range, in: text),
                  let lower = AttributedString.Index(range.lowerBound, within: out),
                  let upper = AttributedString.Index(range.upperBound, within: out)
            else { continue }
            out[lower..<upper].link = url
        }
        return out
    }
}
