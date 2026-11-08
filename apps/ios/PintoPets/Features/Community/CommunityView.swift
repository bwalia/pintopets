import SwiftUI

/// Browse, filter and search the forum. Reading needs no account.
struct CommunityView: View {
    @Environment(Session.self) private var session
    @State private var query = ""
    @State private var submittedQuery = ""
    @State private var category: String?
    @State private var sort: ForumSort = .latest
    @State private var threads: [ThreadSummary] = []
    @State private var page = 1
    @State private var totalPages = 1
    @State private var state: Loadable<Void> = .idle
    @State private var composing = false

    private struct Key: Hashable { let q: String; let category: String?; let sort: ForumSort; let signedIn: Bool }

    var body: some View {
        List {
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        chip("All topics", selected: category == nil) { category = nil }
                        ForEach(ForumCategory.all) { c in
                            chip(c.name, symbol: c.symbol, selected: category == c.slug) { category = c.slug }
                        }
                    }
                    .padding(.horizontal)
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
                Picker("Sort", selection: $sort) {
                    ForEach(ForumSort.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }

            switch state {
            case .failed(let message) where threads.isEmpty:
                ErrorStateView(message: message) { await load(reset: true) }
            case .loading where threads.isEmpty, .idle:
                ProgressView().frame(maxWidth: .infinity)
            default:
                if threads.isEmpty {
                    ContentUnavailableView(
                        submittedQuery.isEmpty ? "No discussions yet" : "No results",
                        systemImage: "bubble.left.and.bubble.right",
                        description: Text(submittedQuery.isEmpty ? "Be the first to start one." : "Try other words, or start a discussion."))
                }
                ForEach(threads) { t in
                    NavigationLink(value: t.id) { ThreadRow(thread: t) }
                }
                if page < totalPages {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .task { await load(reset: false) }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Community")
        .navigationDestination(for: String.self) { ThreadView(threadId: $0) }
        .searchable(text: $query, prompt: "Search questions and answers")
        .onSubmit(of: .search) { submittedQuery = query.trimmed }
        .onChange(of: query) { _, q in if q.isEmpty { submittedQuery = "" } }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { composing = true } label: { Label("Start a discussion", systemImage: "square.and.pencil") }
            }
            ToolbarItem(placement: .secondaryAction) {
                NavigationLink { GuidelinesView() } label: { Label("Community guidelines", systemImage: "hand.raised") }
            }
        }
        .sheet(isPresented: $composing) {
            if session.isSignedIn {
                NewThreadView(initialCategory: category) { id in
                    Task { await load(reset: true) }
                    pendingOpen = id
                }
            } else {
                NavigationStack {
                    SignInPrompt(message: "Sign in to ask a question or share what helped your pet.")
                        .toolbar { Button("Close") { composing = false } }
                }
                .presentationDetents([.medium])
            }
        }
        .onChange(of: session.isSignedIn) { _, signedIn in if signedIn { composing = false } }
        .navigationDestination(item: $pendingOpen) { ThreadView(threadId: $0) }
        .task(id: Key(q: submittedQuery, category: category, sort: sort, signedIn: session.isSignedIn)) {
            await load(reset: true)
        }
        .refreshable { await load(reset: true) }
    }

    @State private var pendingOpen: String?

    private func chip(_ title: String, symbol: String? = nil, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let symbol { Image(systemName: symbol).accessibilityHidden(true) }
                Text(title)
            }
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(selected ? Color.accentColor : Color.secondary.opacity(0.12), in: Capsule())
            .foregroundStyle(selected ? Color.white : Color.primary)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func load(reset: Bool) async {
        let next = reset ? 1 : page + 1
        state = .loading
        do {
            let r: ThreadPage = try await session.api.get("/api/v1/community/threads", query: [
                "q": submittedQuery.nilIfBlank, "category": category, "sort": sort.rawValue, "page": String(next),
            ])
            threads = reset ? r.data : threads + r.data.filter { t in !threads.contains { $0.id == t.id } }
            page = r.meta.page
            totalPages = r.meta.totalPages
            state = .loaded(())
        } catch is CancellationError {
        } catch {
            state = .failed(error.localizedDescription)
            if !reset { totalPages = page } // stop the endless spinner
        }
    }
}

struct ThreadRow: View {
    let thread: ThreadSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                if thread.isPinned { Image(systemName: "pin.fill").foregroundStyle(Color.accentColor).accessibilityLabel("Pinned") }
                if let c = ForumCategory.named(thread.category) {
                    Text(c.name).font(.caption.bold()).foregroundStyle(Color.accentColor)
                }
                if thread.solved {
                    Label("Answered", systemImage: "checkmark.circle.fill")
                        .font(.caption.bold())
                        .foregroundStyle(.green)
                }
                if thread.isLocked { Image(systemName: "lock.fill").font(.caption).foregroundStyle(.secondary).accessibilityLabel("Locked") }
            }
            Text(thread.title).font(.headline).lineLimit(3)
            Text(thread.excerpt).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            HStack(spacing: 12) {
                Label("\(thread.score)", systemImage: "hand.thumbsup").accessibilityLabel("\(thread.score) found this helpful")
                Label(thread.replyCount == 1 ? "1 reply" : "\(thread.replyCount) replies", systemImage: "bubble.left")
                Spacer()
                Text("\(thread.author.name) · \(Dates.relative(thread.lastActivityAt))")
                    .lineLimit(1)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
