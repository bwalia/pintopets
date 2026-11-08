import SwiftUI

struct NewThreadView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let onPosted: (String) -> Void

    @State private var category: String
    @State private var speciesSlug = ""
    @State private var title = ""
    @State private var bodyText = ""
    @State private var tags = ""
    @State private var species: [Species] = []
    @State private var posting = false
    @State private var error: String?

    init(initialCategory: String?, onPosted: @escaping (String) -> Void) {
        _category = State(initialValue: initialCategory ?? "")
        self.onPosted = onPosted
    }

    private var parsedTags: [String] {
        tags.split(whereSeparator: { $0 == "," || $0 == " " })
            .map { $0.trimmingCharacters(in: CharacterSet(charactersIn: "#")).lowercased() }
            .filter { !$0.isEmpty }
    }

    private var canPost: Bool {
        !category.isEmpty && title.trimmed.count >= 8 && bodyText.trimmed.count >= 20 && parsedTags.count <= 5
    }

    var body: some View {
        NavigationStack {
            Form {
                if let error { Section { ErrorBanner(message: error) } }
                Section {
                    Picker("Topic", selection: $category) {
                        if category.isEmpty { Text("Choose…").tag("") }
                        ForEach(ForumCategory.all) { Text($0.name).tag($0.slug) }
                    }
                    Picker("Kind of animal", selection: $speciesSlug) {
                        Text("Any or not specific").tag("")
                        ForEach(species) { Text($0.name).tag($0.slug) }
                    }
                }
                if ForumCategory.named(category)?.health == true {
                    Section { UrgentHelpBanner() }.listRowInsets(EdgeInsets())
                }
                Section {
                    TextField("Your question or topic", text: $title, axis: .vertical)
                        .lineLimit(1...3)
                } footer: { Text("At least 8 characters. No links in the title.") }
                Section {
                    TextField("Details: age, what you've noticed, what you've tried", text: $bodyText, axis: .vertical)
                        .lineLimit(5...15)
                } footer: { Text("At least 20 characters. For your safety, don't include phone numbers or email addresses.") }
                Section {
                    TextField("Tags (optional), e.g. appetite, puppy", text: $tags)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } footer: { Text("Up to 5.") }
            }
            .navigationTitle("Start a discussion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if posting { ProgressView() } else {
                        Button("Post") { Task { await post() } }.disabled(!canPost)
                    }
                }
            }
            .interactiveDismissDisabled(posting || !bodyText.isEmpty)
            .task {
                let r: DataEnvelope<[Species]>? = try? await session.api.get("/api/v1/species")
                species = r?.data ?? []
            }
        }
    }

    private func post() async {
        posting = true
        error = nil
        defer { posting = false }
        do {
            let r: DataEnvelope<ForumThread> = try await session.api.send("POST", "/api/v1/community/threads", body: ThreadInput(
                category: category, speciesSlug: speciesSlug.nilIfBlank, title: title.trimmed,
                body: bodyText.trimmed, tags: parsedTags))
            dismiss()
            onPosted(r.data.id)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct GuidelinesView: View {
    private let rules: [(String, String, String)] = [
        ("heart", "Be kind", "Everyone here loves their animals. Disagree with ideas, never with people."),
        ("cross.case", "Not a vet replacement", "Advice here is from other owners. For anything urgent, call your vet."),
        ("cart.badge.minus", "No selling", "No buying, selling or breeding adverts. Rehoming goes through a rescue."),
        ("lock.shield", "Keep yourself safe", "Don't post phone numbers, emails or your address. Posts that include them are blocked."),
        ("link", "Links with care", "Up to 3 links per post, full addresses only (no link shorteners)."),
        ("flag", "Report, don't argue", "Report anything harmful. Posts reported by several people are hidden until a moderator looks."),
    ]

    var body: some View {
        List(rules, id: \.1) { symbol, title, text in
            Label {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.headline)
                    Text(text).font(.subheadline).foregroundStyle(.secondary)
                }
            } icon: { Image(systemName: symbol).foregroundStyle(Color.accentColor) }
            .padding(.vertical, 4)
        }
        .navigationTitle("Community guidelines")
    }
}
