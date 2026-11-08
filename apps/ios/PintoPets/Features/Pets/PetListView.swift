import SwiftUI

struct PetListView: View {
    @Environment(Session.self) private var session
    @State private var status = "active"
    @State private var pets: Loadable<[Pet]> = .idle
    @State private var adding = false

    var body: some View {
        content
            .navigationTitle("My Pets")
            .toolbar {
                if session.isSignedIn {
                    ToolbarItem(placement: .primaryAction) {
                        Button { adding = true } label: { Label("Add a pet", systemImage: "plus") }
                    }
                }
            }
            .sheet(isPresented: $adding) {
                PetFormView(pet: nil) { _ in Task { await load() } }
            }
            .task(id: TaskKey(signedIn: session.isSignedIn, status: status)) { await load() }
            .refreshable { await load() }
    }

    private struct TaskKey: Hashable { let signedIn: Bool; let status: String }

    @ViewBuilder private var content: some View {
        switch session.state {
        case .loading:
            ProgressView("Connecting…")
        case .signedOut:
            SignInPrompt(message: "Keep your pets' health records, weight, diet and reminders in one place.")
        case .signedIn:
            List {
                Section {
                    Picker("Show", selection: $status) {
                        Text("Current").tag("active")
                        Text("Archived").tag("archived")
                        Text("Remembered").tag("deceased")
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
                switch pets {
                case .idle, .loading:
                    ProgressView().frame(maxWidth: .infinity)
                case .failed(let message):
                    ErrorStateView(message: message) { await load() }
                case .loaded(let list) where list.isEmpty:
                    ContentUnavailableView {
                        Label(status == "active" ? "No pets yet" : "Nothing here", systemImage: "pawprint")
                    } description: {
                        Text(status == "active" ? "Add your first pet to start their health record." : "")
                    } actions: {
                        if status == "active" { Button("Add a pet") { adding = true }.buttonStyle(.borderedProminent) }
                    }
                case .loaded(let list):
                    ForEach(list) { pet in
                        NavigationLink(value: pet) { PetRow(pet: pet) }
                    }
                }
            }
            .navigationDestination(for: Pet.self) { PetDetailView(pet: $0) }
        }
    }

    private func load() async {
        guard session.isSignedIn else { return }
        if pets.value == nil { pets = .loading }
        do {
            let r: DataEnvelope<[Pet]> = try await session.api.get("/api/v1/pets", query: ["status": status])
            pets = .loaded(r.data)
        } catch is CancellationError {
        } catch {
            pets = .failed(error.localizedDescription)
        }
    }
}

struct PetRow: View {
    let pet: Pet

    var body: some View {
        HStack(spacing: 14) {
            PetPhotoView(path: pet.profilePhoto?.thumbUrl, alt: pet.profilePhoto?.altText, size: 56)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 3) {
                Text(pet.name).font(.headline)
                Text([pet.speciesLabel, pet.breedLabel, Dates.age(from: pet.dateOfBirth)]
                    .compactMap { $0 }.joined(separator: " · "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let w = pet.latestWeight {
                    Label(Weights.display(grams: w.grams), systemImage: "scalemass")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
