import SwiftUI

/// Vaccinations, flea and worming, medicines ending and vet follow-ups that are
/// overdue or coming up, across all pets.
struct RemindersView: View {
    @Environment(Session.self) private var session
    @State private var reminders: Loadable<[Reminder]> = .idle

    var body: some View {
        content
            .navigationTitle("Reminders")
            .task(id: session.isSignedIn) { await load() }
            .refreshable { await load() }
    }

    @ViewBuilder private var content: some View {
        switch session.state {
        case .loading: ProgressView("Connecting…")
        case .signedOut: SignInPrompt(message: "See vaccinations, flea and worming and vet follow-ups as they come due.")
        case .signedIn:
            switch reminders {
            case .idle, .loading: ProgressView()
            case .failed(let message): ErrorStateView(message: message) { await load() }
            case .loaded(let list) where list.isEmpty:
                ContentUnavailableView("You're all up to date", systemImage: "checkmark.seal",
                                       description: Text("Reminders appear here when you add next-due dates to your pets' records."))
            case .loaded(let list):
                List {
                    section("Overdue", list.filter { $0.state == "overdue" }, tint: .red)
                    section("Due soon", list.filter { $0.state == "due_soon" }, tint: .orange)
                    section("Coming up", list.filter { $0.state == "upcoming" }, tint: .secondary)
                }
            }
        }
    }

    @ViewBuilder private func section(_ title: String, _ items: [Reminder], tint: Color) -> some View {
        if !items.isEmpty {
            Section(title) {
                ForEach(items) { r in
                    HStack(spacing: 12) {
                        Image(systemName: symbol(r.kind))
                            .foregroundStyle(tint)
                            .frame(width: 28)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.title).font(.headline)
                            Text("\(r.petName) · \(Dates.display(r.dueOn) ?? r.dueOn)")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(r.whenText).font(.caption.bold()).foregroundStyle(tint)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }

    private func symbol(_ kind: String) -> String {
        switch kind {
        case "vaccination": return "syringe"
        case "parasite_treatment": return "ant"
        case "horse_care": return "hare"
        case "medication_end": return "pills"
        default: return "stethoscope"
        }
    }

    private func load() async {
        guard session.isSignedIn else { return }
        if reminders.value == nil { reminders = .loading }
        do {
            let r: DataEnvelope<[Reminder]> = try await session.api.get("/api/v1/reminders")
            reminders = .loaded(r.data)
        } catch is CancellationError {
        } catch {
            reminders = .failed(error.localizedDescription)
        }
    }
}
