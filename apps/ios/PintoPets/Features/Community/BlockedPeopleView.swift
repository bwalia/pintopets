import SwiftUI

/// Account › Blocked people: everyone you've blocked in the community, with Unblock.
struct BlockedPeopleView: View {
    @Environment(Session.self) private var session
    @State private var people: Loadable<[BlockedMember]> = .idle
    @State private var unblocking: BlockedMember?
    @State private var error: String?

    var body: some View {
        List {
            if let error { Section { ErrorBanner(message: error) } }
            switch people {
            case .idle, .loading:
                ProgressView().frame(maxWidth: .infinity)
            case .failed(let message):
                ErrorStateView(message: message) { await load() }
            case .loaded(let list) where list.isEmpty:
                ContentUnavailableView(
                    "No one blocked",
                    systemImage: "hand.raised",
                    description: Text("To block someone, tap Block under one of their posts in the community."))
            case .loaded(let list):
                Section {
                    ForEach(list) { person in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(person.name)
                                Text("Blocked \(Dates.relative(person.blockedAt))")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Unblock") { unblocking = person }
                                .buttonStyle(.bordered)
                        }
                    }
                } footer: {
                    Text("You don't see posts from people you've blocked, and they aren't told.")
                }
            }
        }
        .navigationTitle("Blocked people")
        .task { await load() }
        .refreshable { await load() }
        .confirmationDialog(
            unblocking.map { "Unblock \($0.name)?" } ?? "",
            isPresented: Binding(get: { unblocking != nil }, set: { if !$0 { unblocking = nil } }),
            titleVisibility: .visible,
            presenting: unblocking
        ) { person in
            Button("Unblock") { Task { await unblock(person) } }
        } message: { _ in
            Text("You'll see their discussions and replies again.")
        }
    }

    private func load() async {
        if people.value == nil { people = .loading }
        do {
            let r: DataEnvelope<[BlockedMember]> = try await session.api.get("/api/v1/community/blocks")
            people = .loaded(r.data)
        } catch is CancellationError {
        } catch {
            people = .failed(error.localizedDescription)
        }
    }

    private func unblock(_ person: BlockedMember) async {
        error = nil
        do {
            try await session.api.sendNoContent("DELETE", "/api/v1/community/blocks/\(person.id)", body: nil as String?)
            session.blocksChanged += 1
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
