import XCTest
@testable import PintoPets

final class PKCETests: XCTestCase {
    func testRFC7636Example() {
        // RFC 7636 appendix B, and the same vector in apps/web/src/server/app-auth.test.ts.
        XCTAssertEqual(PKCE.challenge(for: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
                       "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
    }

    func testRandomVerifiersAreLongAndUnique() {
        let a = PKCE(), b = PKCE()
        XCTAssertNotEqual(a.verifier, b.verifier)
        XCTAssertEqual(a.verifier.count, 43)
        XCTAssertEqual(a.challenge.count, 43)
        XCTAssertNil(a.verifier.range(of: "[^A-Za-z0-9_-]", options: .regularExpression))
    }
}

final class DecodingTests: XCTestCase {
    func testDecodesApiErrorsWithFieldIssues() {
        let json = #"{"error":{"code":"validation_failed","message":"Some of the information sent was not valid.","details":[{"path":["name"],"message":"Please enter a name"}]}}"#
        let e = APIClient.apiError(status: 422, data: Data(json.utf8))
        XCTAssertEqual(e.code, "validation_failed")
        XCTAssertEqual(e.issues, ["Please enter a name"])
        XCTAssertEqual(e.errorDescription, "Some of the information sent was not valid.\nPlease enter a name")
    }

    func testFallsBackForNonJsonErrors() {
        let e = APIClient.apiError(status: 502, data: Data("<html>".utf8))
        XCTAssertEqual(e.status, 502)
        XCTAssertTrue(e.message.contains("Something went wrong"))
    }

    func testDecodesRecordsOfAnyKind() throws {
        let json = #"{"data":[{"id":"r1","petId":"p1","vaccine":"Lepto","givenOn":"2026-01-02","nextDueOn":"2027-01-02","batchNumber":null,"createdAt":"2026-01-02T10:00:00.000Z","updatedAt":"2026-01-02T10:00:00.000Z"}]}"#
        let r = try JSONDecoder().decode(DataEnvelope<[PetRecord]>.self, from: Data(json.utf8))
        let kind = RecordKind.all.first { $0.slug == "vaccinations" }!
        XCTAssertEqual(kind.title(of: r.data[0]), "Lepto")
        XCTAssertEqual(kind.date(of: r.data[0]), "2 Jan 2026")
        XCTAssertEqual(kind.details(of: r.data[0]).map(\.value), ["2 Jan 2027"])
    }

    func testPetInputSendsNullsSoEditsCanClearFields() throws {
        let input = PetInput(name: "Bramble", speciesSlug: "rabbit", speciesOther: nil, breedSlugs: [],
                             sex: "female", neutered: "yes", dateOfBirth: nil, dateOfBirthIsEstimate: false,
                             colourMarkings: nil, vetPracticeName: nil, vetPracticePhone: nil, notes: nil)
        let obj = try JSONSerialization.jsonObject(with: APIClient.encoder.encode(input)) as! [String: Any]
        XCTAssertTrue(obj["colourMarkings"] is NSNull)
        XCTAssertEqual(obj["name"] as? String, "Bramble")
    }
}

final class FormattingTests: XCTestCase {
    func testWeights() {
        XCTAssertEqual(Weights.display(grams: 850), "850 g")
        XCTAssertEqual(Weights.display(grams: 12_400), "12.4 kg")
        XCTAssertEqual(Weights.display(grams: 540_000), "540 kg")
        XCTAssertEqual(Weights.grams(from: "12,4", unit: "kg"), 12_400)
        XCTAssertEqual(Weights.grams(from: "850", unit: "g"), 850)
        XCTAssertNil(Weights.grams(from: "-1", unit: "kg"))
        XCTAssertNil(Weights.grams(from: "abc", unit: "kg"))
        XCTAssertNil(Weights.grams(from: "3000", unit: "kg"))
    }

    func testAge() {
        let now = Dates.day("2026-11-08")!
        XCTAssertEqual(Dates.age(from: "2023-06-01", now: now), "3 years")
        XCTAssertEqual(Dates.age(from: "2026-06-01", now: now), "5 months")
        XCTAssertEqual(Dates.age(from: "2026-10-11", now: now), "4 weeks")
        XCTAssertNil(Dates.age(from: "2027-01-01", now: now))
        XCTAssertNil(Dates.age(from: nil, now: now))
    }

    func testReminderWording() {
        func r(_ d: Int) -> Reminder {
            Reminder(petId: "p", petName: "Rex", kind: "vaccination", recordId: "r", title: "t", dueOn: "2026-11-08", state: "due_soon", daysUntil: d)
        }
        XCTAssertEqual(r(-3).whenText, "3 days overdue")
        XCTAssertEqual(r(0).whenText, "Due today")
        XCTAssertEqual(r(1).whenText, "Due tomorrow")
        XCTAssertEqual(r(9).whenText, "In 9 days")
    }

    func testOnlyWebLinksBecomeTappable() {
        let s = LinkedText.attributed("See https://www.rspca.org.uk/advice or javascript:alert(1)")
        let links = s.runs.compactMap(\.link)
        XCTAssertEqual(links.map(\.absoluteString), ["https://www.rspca.org.uk/advice"])
    }

    func testCategoriesMatchTheContract() {
        XCTAssertEqual(ForumCategory.all.map(\.slug),
                       ["health", "behaviour", "nutrition", "new-pets", "grooming", "adoption", "senior-pets", "pet-loss", "chat"])
        XCTAssertEqual(ForumCategory.all.filter(\.health).map(\.slug), ["health", "senior-pets"])
    }
}
