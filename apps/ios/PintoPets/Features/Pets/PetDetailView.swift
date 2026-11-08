import PhotosUI
import SwiftUI

struct PetDetailView: View {
    @Environment(Session.self) private var session
    @State var pet: Pet
    @State private var photos: [Photo] = []
    @State private var editing = false
    @State private var addingWeight = false
    @State private var photoItem: PhotosPickerItem?
    @State private var uploading = false
    @State private var error: String?

    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    PetPhotoView(path: pet.profilePhoto?.thumbUrl, alt: pet.profilePhoto?.altText, size: 120)
                        .clipShape(Circle())
                    Text(pet.name).font(.title2.bold())
                    Text([pet.speciesLabel, pet.breedLabel].compactMap { $0 }.joined(separator: " · "))
                        .foregroundStyle(.secondary)
                    if pet.isMemorial {
                        Label("Remembered\(Dates.display(pet.deceasedOn).map { " · \($0)" } ?? "")", systemImage: "leaf")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .listRowBackground(Color.clear)
            }

            if let error { Section { ErrorBanner(message: error) } }

            Section("About") {
                row("Age", Dates.age(from: pet.dateOfBirth).map { pet.dateOfBirthIsEstimate ? "About \($0)" : $0 })
                row("Born", Dates.display(pet.dateOfBirth))
                row("Sex", Labels.sex(pet.sex))
                row("Neutered", Labels.neutered(pet.neutered))
                row("Colour and markings", pet.colourMarkings)
                if pet.species.tracksHeightInHands, let h = pet.heightInches {
                    row("Height", "\(h / 4).\(h % 4) hh")
                }
                row("Passport", pet.passportNumber)
            }

            Section {
                if let w = pet.latestWeight {
                    LabeledContent("Latest weight", value: "\(Weights.display(grams: w.grams)) · \(Dates.display(w.measuredOn) ?? "")")
                }
                if pet.canEdit {
                    Button { addingWeight = true } label: { Label("Add a weight", systemImage: "plus.circle") }
                }
            } header: { Text("Weight") }

            Section("Health and diet") {
                ForEach(RecordKind.forPet(pet)) { kind in
                    NavigationLink {
                        RecordListView(pet: pet, kind: kind)
                    } label: {
                        Label(kind.label, systemImage: kind.symbol)
                    }
                }
            }

            Section("Vet and emergency") {
                row("Vet practice", pet.vetPracticeName)
                phoneRow("Vet phone", pet.vetPracticePhone)
                row("Emergency contact", pet.emergencyContactName)
                phoneRow("Emergency phone", pet.emergencyContactPhone)
                row("Insurance", [pet.insuranceProvider, pet.insurancePolicyRef].compactMap { $0 }.joined(separator: " · ").nilIfBlank)
            }

            if let notes = pet.notes {
                Section("Notes") { Text(notes) }
            }

            Section {
                if photos.isEmpty {
                    Text("No photos yet").foregroundStyle(.secondary)
                } else {
                    ScrollView(.horizontal) {
                        LazyHStack {
                            ForEach(photos) { photo in
                                PetPhotoView(path: photo.thumbUrl, alt: photo.altText ?? photo.caption, size: 96)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                }
                if pet.canEdit {
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        if uploading { ProgressView() } else { Label("Add a photo", systemImage: "photo.badge.plus") }
                    }
                    .disabled(uploading)
                }
            } header: {
                Text("Photos")
            } footer: {
                Text("Photos are private to people who share this pet. Location data is removed when you upload.")
            }
        }
        .navigationTitle(pet.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if pet.canEdit {
                Button("Edit") { editing = true }
            }
        }
        .sheet(isPresented: $editing) {
            PetFormView(pet: pet) { updated in pet = updated }
        }
        .sheet(isPresented: $addingWeight) {
            AddWeightView(pet: pet) { Task { await reload() } }
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task { await upload(item) }
        }
        .task { await reload() }
        .refreshable { await reload() }
    }

    @ViewBuilder private func row(_ label: String, _ value: String?) -> some View {
        if let value { LabeledContent(label, value: value) }
    }

    @ViewBuilder private func phoneRow(_ label: String, _ phone: String?) -> some View {
        if let phone {
            let digits = phone.filter { $0.isNumber || $0 == "+" }
            if let url = URL(string: "tel:\(digits)"), !digits.isEmpty {
                LabeledContent(label) { Link(phone, destination: url) }
            } else {
                LabeledContent(label, value: phone)
            }
        }
    }

    private func reload() async {
        do {
            let p: DataEnvelope<Pet> = try await session.api.get("/api/v1/pets/\(pet.id)")
            pet = p.data
            let ph: DataEnvelope<[Photo]> = try await session.api.get("/api/v1/pets/\(pet.id)/photos")
            photos = ph.data
            error = nil
        } catch is CancellationError {
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func upload(_ item: PhotosPickerItem) async {
        uploading = true
        defer { uploading = false; photoItem = nil }
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let jpeg = image.preparedForUpload()
            else { throw APIError(status: 0, code: "bad_photo", message: "That photo couldn't be read. Please try another.") }
            let _: DataEnvelope<Photo> = try await session.api.upload(
                "/api/v1/pets/\(pet.id)/photos", file: jpeg, filename: "photo.jpg",
                mimeType: "image/jpeg", fields: ["altText": "Photo of \(pet.name)"])
            await reload()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

extension UIImage {
    /// Re-encodes as JPEG at up to 2560 px, under the 15 MB limit. Re-encoding
    /// also drops EXIF/GPS before it leaves the phone (the server strips it too).
    func preparedForUpload(maxSide: CGFloat = 2560) -> Data? {
        let longest = max(size.width, size.height)
        let scale = longest > maxSide ? maxSide / longest : 1
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: target, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
        return resized.jpegData(compressionQuality: 0.85)
    }
}
