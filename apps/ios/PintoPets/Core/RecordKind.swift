import Foundation

/// The record kinds served at /api/v1/pets/{petId}/records/{kind}, and how to
/// summarise each one in a list row. The app only records what the vet said;
/// it never suggests doses.
struct RecordKind: Identifiable, Hashable {
    let slug: String
    let label: String
    let symbol: String
    /// Field shown as the row title.
    let titleField: String
    /// Field holding the record's date.
    let dateField: String
    /// Extra fields shown under the title, in order.
    let detailFields: [String]
    /// Only shown for horses.
    var horsesOnly = false
    var id: String { slug }

    static let all: [RecordKind] = [
        .init(slug: "vaccinations", label: "Vaccinations", symbol: "syringe", titleField: "vaccine", dateField: "givenOn", detailFields: ["nextDueOn", "vet", "batchNumber"]),
        .init(slug: "parasite-treatments", label: "Flea and worming", symbol: "ant", titleField: "product", dateField: "givenOn", detailFields: ["kind", "nextDueOn"]),
        .init(slug: "medications", label: "Medicines", symbol: "pills", titleField: "name", dateField: "startOn", detailFields: ["doseAsPrescribed", "frequency", "endOn", "prescribedBy"]),
        .init(slug: "vet-visits", label: "Vet visits", symbol: "stethoscope", titleField: "reason", dateField: "visitOn", detailFields: ["practice", "vetName", "outcome", "followUpOn"]),
        .init(slug: "conditions", label: "Conditions", symbol: "heart.text.square", titleField: "name", dateField: "diagnosedOn", detailFields: ["status"]),
        .init(slug: "allergies", label: "Allergies", symbol: "allergens", titleField: "allergen", dateField: "createdAt", detailFields: ["severity", "reaction"]),
        .init(slug: "symptoms", label: "Symptoms", symbol: "thermometer.medium", titleField: "symptom", dateField: "occurredAt", detailFields: ["severity"]),
        .init(slug: "weights", label: "Weight", symbol: "scalemass", titleField: "weightGrams", dateField: "measuredOn", detailFields: []),
        .init(slug: "diet-items", label: "Diet", symbol: "fork.knife", titleField: "product", dateField: "startedOn", detailFields: ["kind", "brand", "amount", "frequency"]),
        .init(slug: "diet-changes", label: "Diet changes", symbol: "arrow.triangle.2.circlepath", titleField: "description", dateField: "changedOn", detailFields: ["reaction"]),
        .init(slug: "water-notes", label: "Water", symbol: "drop", titleField: "observation", dateField: "notedOn", detailFields: []),
        .init(slug: "horse-care", label: "Horse care", symbol: "hare", titleField: "kind", dateField: "doneOn", detailFields: ["provider", "result", "nextDueOn"], horsesOnly: true),
    ]

    static func forPet(_ pet: Pet) -> [RecordKind] {
        all.filter { !$0.horsesOnly || pet.species.group == "horses" }
    }

    static let fieldLabels: [String: String] = [
        "nextDueOn": "Next due", "vet": "Vet", "batchNumber": "Batch", "kind": "Type",
        "doseAsPrescribed": "Dose (as prescribed)", "frequency": "How often", "endOn": "Ends",
        "prescribedBy": "Prescribed by", "practice": "Practice", "vetName": "Vet",
        "outcome": "Outcome", "followUpOn": "Follow-up", "status": "Status", "severity": "Severity",
        "reaction": "Reaction", "brand": "Brand", "amount": "Amount", "provider": "Provider",
        "result": "Result",
    ]

    func title(of record: PetRecord) -> String {
        if slug == "weights", let g = record.fields["weightGrams"]?.number {
            return Weights.display(grams: Int(g))
        }
        guard let value = record[titleField] else { return label }
        return titleField == "kind" ? Labels.humanise(value) : value
    }

    func date(of record: PetRecord) -> String? {
        let raw = record[dateField]
        return Dates.display(raw) ?? Dates.time(raw).map { $0.formatted(date: .abbreviated, time: .shortened) }
    }

    func details(of record: PetRecord) -> [(label: String, value: String)] {
        detailFields.compactMap { field in
            guard let raw = record[field] else { return nil }
            let value: String
            if field.hasSuffix("On") { value = Dates.display(raw) ?? raw }
            else if field == "kind" || field == "status" || field == "severity" { value = Labels.humanise(raw) }
            else { value = raw }
            return (Self.fieldLabels[field] ?? Labels.humanise(field), value)
        }
    }
}
