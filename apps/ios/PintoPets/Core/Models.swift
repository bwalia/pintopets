import Foundation

// Swift mirrors of packages/api-contract (served at /api/v1/openapi.json).
// Dates stay as the ISO strings the API sends; `Dates` formats them for display.

struct Me: Codable, Equatable {
    let id: String
    let displayName: String
    let email: String
    let role: String
    let demo: Bool

    var isModerator: Bool { role == "moderator" || role == "admin" }
}

struct AppToken: Codable {
    let token: String
    let expiresAt: String
}

struct AppTokenRequest: Encodable {
    let code: String
    let verifier: String
}

// MARK: Reference data

struct Species: Codable, Identifiable, Hashable {
    let slug: String
    let name: String
    let group: String
    let tracksHeightInHands: Bool
    let requiresFreeText: Bool
    var id: String { slug }
}

struct Breed: Codable, Identifiable, Hashable {
    let slug: String
    let name: String
    let isMixedOrUnknown: Bool
    var id: String { slug }
}

// MARK: Pets

struct Pet: Codable, Identifiable, Hashable {
    struct SpeciesRef: Codable, Hashable {
        let slug: String
        let name: String
        let group: String
        let tracksHeightInHands: Bool
    }
    struct BreedRef: Codable, Hashable {
        let slug: String
        let name: String
    }
    struct ProfilePhoto: Codable, Hashable {
        let id: String
        let thumbUrl: String
        let altText: String?
    }
    struct Weight: Codable, Hashable {
        let grams: Int
        let measuredOn: String
    }

    let id: String
    let name: String
    let species: SpeciesRef
    let speciesOther: String?
    let breeds: [BreedRef]
    let sex: String
    let neutered: String
    let dateOfBirth: String?
    let dateOfBirthIsEstimate: Bool
    let colourMarkings: String?
    let heightInches: Int?
    let passportNumber: String?
    let insuranceProvider: String?
    let insurancePolicyRef: String?
    let vetPracticeName: String?
    let vetPracticePhone: String?
    let emergencyContactName: String?
    let emergencyContactPhone: String?
    let notes: String?
    let status: String
    let deceasedOn: String?
    let profilePhoto: ProfilePhoto?
    let latestWeight: Weight?
    let myRole: String
    let createdAt: String
    let updatedAt: String

    var speciesLabel: String { speciesOther ?? species.name }
    var breedLabel: String? {
        breeds.isEmpty ? nil : breeds.map(\.name).joined(separator: " × ")
    }
    var isMemorial: Bool { status == "deceased" }
    var canEdit: Bool { !isMemorial && (myRole == "owner" || myRole == "co_owner") }
}

struct PetInput: Encodable {
    var name: String
    var speciesSlug: String
    var speciesOther: String?
    var breedSlugs: [String]
    var sex: String
    var neutered: String
    var dateOfBirth: String?
    var dateOfBirthIsEstimate: Bool
    var colourMarkings: String?
    var vetPracticeName: String?
    var vetPracticePhone: String?
    var notes: String?

    private enum CodingKeys: String, CodingKey {
        case name, speciesSlug, speciesOther, breedSlugs, sex, neutered, dateOfBirth,
             dateOfBirthIsEstimate, colourMarkings, vetPracticeName, vetPracticePhone, notes
    }

    /// Empty fields are sent as null (not left out), so clearing one in an edit clears it.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(name, forKey: .name)
        try c.encode(speciesSlug, forKey: .speciesSlug)
        try c.encode(speciesOther, forKey: .speciesOther)
        try c.encode(breedSlugs, forKey: .breedSlugs)
        try c.encode(sex, forKey: .sex)
        try c.encode(neutered, forKey: .neutered)
        try c.encode(dateOfBirth, forKey: .dateOfBirth)
        try c.encode(dateOfBirthIsEstimate, forKey: .dateOfBirthIsEstimate)
        try c.encode(colourMarkings, forKey: .colourMarkings)
        try c.encode(vetPracticeName, forKey: .vetPracticeName)
        try c.encode(vetPracticePhone, forKey: .vetPracticePhone)
        try c.encode(notes, forKey: .notes)
    }
}

struct Photo: Codable, Identifiable, Hashable {
    let id: String
    let petId: String
    let caption: String?
    let altText: String?
    let width: Int?
    let height: Int?
    let thumbUrl: String
    let fullUrl: String
    let isProfile: Bool
    let createdAt: String
}

struct Reminder: Codable, Identifiable, Hashable {
    let petId: String
    let petName: String
    let kind: String
    let recordId: String
    let title: String
    let dueOn: String
    let state: String
    let daysUntil: Int
    var id: String { recordId + kind }

    var whenText: String {
        switch daysUntil {
        case ..<(-1): return "\(-daysUntil) days overdue"
        case -1: return "1 day overdue"
        case 0: return "Due today"
        case 1: return "Due tomorrow"
        default: return "In \(daysUntil) days"
        }
    }
}

/// One health, diet or weight record. Fields differ by kind, so they stay as JSON.
struct PetRecord: Decodable, Identifiable, Hashable {
    let id: String
    let fields: [String: JSONValue]

    private struct Key: CodingKey {
        var stringValue: String
        var intValue: Int? { nil }
        init(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { nil }
    }

    init(id: String, fields: [String: JSONValue]) {
        self.id = id
        self.fields = fields
    }

    init(from decoder: Decoder) throws {
        let all = try [String: JSONValue](from: decoder)
        guard let id = all["id"]?.string else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "record without id"))
        }
        self.id = id
        self.fields = all
    }

    subscript(key: String) -> String? { fields[key]?.string }
}

struct NewWeight: Encodable {
    let measuredOn: String
    let weightGrams: Int
    let notes: String?
}

// MARK: Community

struct ForumAuthor: Codable, Hashable {
    let name: String
    let isYou: Bool
}

struct ThreadSummary: Codable, Identifiable, Hashable {
    let id: String
    let category: String
    let speciesSlug: String?
    let title: String
    let excerpt: String
    let tags: [String]
    let author: ForumAuthor
    let score: Int
    let replyCount: Int
    let solved: Bool
    let isPinned: Bool
    let isLocked: Bool
    let lastActivityAt: String
    let createdAt: String
}

struct ThreadPage: Codable {
    struct Meta: Codable {
        let page: Int
        let totalPages: Int
        let total: Int
    }
    let data: [ThreadSummary]
    let meta: Meta
}

struct ForumReply: Codable, Identifiable, Hashable {
    struct Can: Codable, Hashable {
        let edit: Bool
        let delete: Bool
        let accept: Bool
    }
    let id: String
    let threadId: String
    let body: String
    let author: ForumAuthor
    let status: String
    var score: Int
    var viewerVoted: Bool
    let isAccepted: Bool
    let editedAt: String?
    let createdAt: String
    let can: Can
}

struct ForumThread: Codable, Identifiable, Hashable {
    struct Can: Codable, Hashable {
        let reply: Bool
        let edit: Bool
        let delete: Bool
        let moderate: Bool
    }
    let id: String
    let category: String
    let speciesSlug: String?
    let title: String
    let body: String
    let tags: [String]
    let author: ForumAuthor
    var score: Int
    let replyCount: Int
    let solved: Bool
    let isPinned: Bool
    let isLocked: Bool
    let status: String
    var viewerVoted: Bool
    let acceptedReplyId: String?
    let editedAt: String?
    let lastActivityAt: String
    let createdAt: String
    var replies: [ForumReply]
    let can: Can
}

struct ThreadInput: Encodable {
    let category: String
    let speciesSlug: String?
    let title: String
    let body: String
    let tags: [String]
}

struct ReplyInput: Encodable {
    let body: String
}

struct VoteInput: Encodable {
    let targetType: String
    let targetId: String
    let voted: Bool
}

struct VoteResult: Codable {
    let voted: Bool
    let score: Int
}

struct ReportInput: Encodable {
    let targetType: String
    let targetId: String
    let reason: String
    let details: String?
}

/// Mirrors FORUM_CATEGORIES in packages/api-contract/src/routes/community.ts.
struct ForumCategory: Identifiable, Hashable {
    let slug: String
    let name: String
    let summary: String
    /// Health topics always show urgent-help guidance.
    let health: Bool
    let symbol: String
    var id: String { slug }

    static let all: [ForumCategory] = [
        .init(slug: "health", name: "Health and symptoms", summary: "Illness, symptoms, medicines and recovery. Not for emergencies.", health: true, symbol: "cross.case"),
        .init(slug: "behaviour", name: "Behaviour and training", summary: "Barking, biting, toileting, recall, anxiety and enrichment.", health: false, symbol: "figure.walk"),
        .init(slug: "nutrition", name: "Food and nutrition", summary: "Diets, treats, weight and fussy eaters.", health: false, symbol: "fork.knife"),
        .init(slug: "new-pets", name: "New pet owners", summary: "Settling in, first vet visits, insurance and kit.", health: false, symbol: "sparkles"),
        .init(slug: "grooming", name: "Grooming and care", summary: "Coats, claws, teeth, hooves, bedding and housing.", health: false, symbol: "comb"),
        .init(slug: "adoption", name: "Adoption and rescue", summary: "Rehoming, rescue centres and helping animals in need.", health: false, symbol: "house"),
        .init(slug: "senior-pets", name: "Older pets", summary: "Ageing, mobility, comfort and quality of life.", health: true, symbol: "heart"),
        .init(slug: "pet-loss", name: "Pet loss and support", summary: "A kind place to talk about losing a pet.", health: false, symbol: "leaf"),
        .init(slug: "chat", name: "Pet chat", summary: "Stories, wins, introductions and everything else.", health: false, symbol: "bubble.left.and.bubble.right"),
    ]

    static func named(_ slug: String) -> ForumCategory? { all.first { $0.slug == slug } }
}

enum ForumSort: String, CaseIterable, Identifiable {
    case latest, top, unanswered, new
    var id: String { rawValue }
    var label: String {
        switch self {
        case .latest: return "Active"
        case .top: return "Most helpful"
        case .unanswered: return "Unanswered"
        case .new: return "Newest"
        }
    }
}

enum ReportReason: String, CaseIterable, Identifiable {
    case spam, abuse, unsafe_advice, animal_welfare, off_topic, other
    var id: String { rawValue }
    var label: String {
        switch self {
        case .spam: return "Spam or selling"
        case .abuse: return "Rude or abusive"
        case .unsafe_advice: return "Unsafe advice"
        case .animal_welfare: return "An animal may be at risk"
        case .off_topic: return "Off topic"
        case .other: return "Something else"
        }
    }
}
