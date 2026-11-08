import SwiftUI

/// One kind of record for a pet, newest first. Adding most kinds happens on the
/// web for now; weight can be added from the pet's page.
struct RecordListView: View {
    @Environment(Session.self) private var session
    let pet: Pet
    let kind: RecordKind
    @State private var records: Loadable<[PetRecord]> = .idle
    @State private var addingWeight = false

    var body: some View {
        List {
            switch records {
            case .idle, .loading:
                ProgressView().frame(maxWidth: .infinity)
            case .failed(let message):
                ErrorStateView(message: message) { await load() }
            case .loaded(let list) where list.isEmpty:
                ContentUnavailableView("No \(kind.label.lowercased()) yet", systemImage: kind.symbol)
            case .loaded(let list):
                if kind.slug == "medications" {
                    Section {
                        Text("Always give medicines exactly as your vet prescribed.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
                ForEach(list) { record in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(kind.title(of: record)).font(.headline)
                            Spacer()
                            if let date = kind.date(of: record) {
                                Text(date).font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        ForEach(kind.details(of: record), id: \.label) { item in
                            Text("\(item.label): \(item.value)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        if let notes = record["notes"] {
                            Text(notes).font(.callout)
                        }
                    }
                    .padding(.vertical, 2)
                    .accessibilityElement(children: .combine)
                }
            }
        }
        .navigationTitle(kind.label)
        .toolbar {
            if kind.slug == "weights", pet.canEdit {
                Button { addingWeight = true } label: { Label("Add a weight", systemImage: "plus") }
            }
        }
        .sheet(isPresented: $addingWeight) {
            AddWeightView(pet: pet) { Task { await load() } }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        if records.value == nil { records = .loading }
        do {
            let r: DataEnvelope<[PetRecord]> = try await session.api.get("/api/v1/pets/\(pet.id)/records/\(kind.slug)")
            records = .loaded(r.data)
        } catch is CancellationError {
        } catch {
            records = .failed(error.localizedDescription)
        }
    }
}

struct AddWeightView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let pet: Pet
    let onSave: () -> Void

    @State private var amount = ""
    @State private var unit = "kg"
    @State private var measuredOn = Date()
    @State private var notes = ""
    @State private var saving = false
    @State private var error: String?

    private var grams: Int? { Weights.grams(from: amount, unit: unit) }

    var body: some View {
        NavigationStack {
            Form {
                if let error { Section { ErrorBanner(message: error) } }
                Section {
                    HStack {
                        TextField("Weight", text: $amount)
                            .keyboardType(.decimalPad)
                        Picker("Unit", selection: $unit) {
                            Text("kg").tag("kg"); Text("g").tag("g")
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 110)
                        .labelsHidden()
                    }
                    DatePicker("Weighed on", selection: $measuredOn, in: ...Date(), displayedComponents: .date)
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                }
            }
            .navigationTitle("Weigh \(pet.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if saving { ProgressView() } else {
                        Button("Save") { Task { await save() } }.disabled(grams == nil)
                    }
                }
            }
            .onAppear {
                // Small animals are usually weighed in grams.
                if ["small_pets", "birds", "reptiles_amphibians", "fish"].contains(pet.species.group) { unit = "g" }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func save() async {
        guard let grams else { return }
        saving = true
        defer { saving = false }
        do {
            let _: DataEnvelope<PetRecord> = try await session.api.send(
                "POST", "/api/v1/pets/\(pet.id)/records/weights",
                body: NewWeight(measuredOn: Dates.dayString(measuredOn), weightGrams: grams, notes: notes.nilIfBlank))
            onSave()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
