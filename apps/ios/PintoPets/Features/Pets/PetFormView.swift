import SwiftUI

/// Add a pet, or edit one (owner or co-owner).
struct PetFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let pet: Pet?
    let onSave: (Pet) -> Void

    @State private var name = ""
    @State private var speciesSlug = ""
    @State private var speciesOther = ""
    @State private var breedSlug = ""
    @State private var sex = "unknown"
    @State private var neutered = "unknown"
    @State private var knowsBirthday = false
    @State private var dateOfBirth = Date()
    @State private var birthdayIsEstimate = false
    @State private var colour = ""
    @State private var vetName = ""
    @State private var vetPhone = ""
    @State private var notes = ""

    @State private var species: [Species] = []
    @State private var breeds: [Breed] = []
    @State private var saving = false
    @State private var error: String?

    private var selectedSpecies: Species? { species.first { $0.slug == speciesSlug } }
    private var canSave: Bool {
        !name.trimmed.isEmpty && !speciesSlug.isEmpty
            && (selectedSpecies?.requiresFreeText != true || !speciesOther.trimmed.isEmpty)
    }

    var body: some View {
        NavigationStack {
            Form {
                if let error { Section { ErrorBanner(message: error) } }
                Section {
                    TextField("Name", text: $name)
                        .textContentType(.name)
                    Picker("Kind of animal", selection: $speciesSlug) {
                        if speciesSlug.isEmpty { Text("Choose…").tag("") }
                        ForEach(species) { Text($0.name).tag($0.slug) }
                    }
                    if selectedSpecies?.requiresFreeText == true {
                        TextField("What kind of animal?", text: $speciesOther)
                    }
                    if !breeds.isEmpty {
                        Picker("Breed", selection: $breedSlug) {
                            Text("Not sure").tag("")
                            ForEach(breeds) { Text($0.name).tag($0.slug) }
                        }
                    }
                }
                Section {
                    Picker("Sex", selection: $sex) {
                        Text("Male").tag("male"); Text("Female").tag("female"); Text("Unknown").tag("unknown")
                    }
                    Picker("Neutered", selection: $neutered) {
                        Text("Yes").tag("yes"); Text("No").tag("no"); Text("Not sure").tag("unknown")
                    }
                    Toggle("I know their birthday", isOn: $knowsBirthday)
                    if knowsBirthday {
                        DatePicker("Born", selection: $dateOfBirth, in: ...Date(), displayedComponents: .date)
                        Toggle("It's an estimate", isOn: $birthdayIsEstimate)
                    }
                    TextField("Colour and markings", text: $colour)
                }
                Section("Vet") {
                    TextField("Vet practice", text: $vetName)
                    TextField("Vet phone", text: $vetPhone)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                }
                Section("Notes") {
                    TextField("Anything else worth knowing", text: $notes, axis: .vertical)
                        .lineLimit(3...8)
                }
            }
            .navigationTitle(pet == nil ? "Add a pet" : "Edit \(pet!.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if saving { ProgressView() } else {
                        Button("Save") { Task { await save() } }.disabled(!canSave)
                    }
                }
            }
            .interactiveDismissDisabled(saving)
            .task { await loadSpecies() }
            .onChange(of: speciesSlug) { old, new in
                if !old.isEmpty { breedSlug = "" }
                Task { await loadBreeds(new) }
            }
        }
    }

    private func fill(from pet: Pet) {
        name = pet.name
        speciesSlug = pet.species.slug
        speciesOther = pet.speciesOther ?? ""
        breedSlug = pet.breeds.first?.slug ?? ""
        sex = pet.sex
        neutered = pet.neutered
        if let d = Dates.day(pet.dateOfBirth) {
            knowsBirthday = true
            // Shown in the local calendar.
            var utc = Calendar(identifier: .gregorian); utc.timeZone = .gmt
            dateOfBirth = Calendar.current.date(from: utc.dateComponents([.year, .month, .day], from: d)) ?? d
        }
        birthdayIsEstimate = pet.dateOfBirthIsEstimate
        colour = pet.colourMarkings ?? ""
        vetName = pet.vetPracticeName ?? ""
        vetPhone = pet.vetPracticePhone ?? ""
        notes = pet.notes ?? ""
    }

    private func loadSpecies() async {
        do {
            let r: DataEnvelope<[Species]> = try await session.api.get("/api/v1/species")
            species = r.data
            if let pet, name.isEmpty { fill(from: pet) }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loadBreeds(_ slug: String) async {
        guard !slug.isEmpty else { breeds = []; return }
        let r: DataEnvelope<[Breed]>? = try? await session.api.get("/api/v1/species/\(slug)/breeds")
        breeds = r?.data ?? []
        // Keep a second breed the web app set ("crossed with").
    }

    private func save() async {
        saving = true
        error = nil
        defer { saving = false }
        var breedSlugs = breedSlug.isEmpty ? [] : [breedSlug]
        if let pet, pet.breeds.first?.slug == breedSlug, pet.breeds.count > 1 {
            breedSlugs.append(pet.breeds[1].slug)
        }
        let input = PetInput(
            name: name.trimmed, speciesSlug: speciesSlug,
            speciesOther: selectedSpecies?.requiresFreeText == true ? speciesOther.nilIfBlank : nil,
            breedSlugs: breedSlugs, sex: sex, neutered: neutered,
            dateOfBirth: knowsBirthday ? Dates.dayString(dateOfBirth) : nil,
            dateOfBirthIsEstimate: knowsBirthday && birthdayIsEstimate,
            colourMarkings: colour.nilIfBlank, vetPracticeName: vetName.nilIfBlank,
            vetPracticePhone: vetPhone.nilIfBlank, notes: notes.nilIfBlank)
        do {
            let r: DataEnvelope<Pet>
            if let pet {
                r = try await session.api.send("PATCH", "/api/v1/pets/\(pet.id)", body: input)
            } else {
                r = try await session.api.send("POST", "/api/v1/pets", body: input)
            }
            onSave(r.data)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
