import Foundation

enum Dates {
    private static let isoDay: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
    private static let isoTime: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let isoTimePlain = ISO8601DateFormatter()

    /// "2026-11-08" → Date (midnight UTC).
    static func day(_ s: String?) -> Date? {
        guard let s, s.count >= 10 else { return nil }
        return isoDay.date(from: String(s.prefix(10)))
    }

    static func time(_ s: String?) -> Date? {
        guard let s else { return nil }
        return isoTime.date(from: s) ?? isoTimePlain.date(from: s)
    }

    static func dayString(_ date: Date) -> String {
        // Calendar date as the person sees it, not UTC.
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// "8 Nov 2026"
    static func display(_ s: String?) -> String? {
        guard let d = day(s) else { return nil }
        var style = Date.FormatStyle(date: .abbreviated, time: .omitted)
        style.locale = Locale(identifier: "en_GB")
        style.timeZone = .gmt
        return d.formatted(style)
    }

    /// "3 hours ago"
    static func relative(_ s: String?, now: Date = .now) -> String {
        guard let d = time(s) else { return "" }
        if now.timeIntervalSince(d) < 60 { return "just now" }
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .full
        return f.localizedString(for: d, relativeTo: now)
    }

    /// "3 years", "5 months", "2 weeks"; nil for missing or future dates.
    static func age(from dateOfBirth: String?, now: Date = .now) -> String? {
        guard let birth = day(dateOfBirth), birth <= now else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = .gmt
        let c = cal.dateComponents([.year, .month, .day], from: birth, to: now)
        if let y = c.year, y >= 1 { return y == 1 ? "1 year" : "\(y) years" }
        if let m = c.month, m >= 1 { return m == 1 ? "1 month" : "\(m) months" }
        let weeks = (c.day ?? 0) / 7
        return weeks <= 1 ? "Under 2 weeks" : "\(weeks) weeks"
    }
}

enum Weights {
    /// 12_400 g → "12.4 kg"; small animals stay in grams.
    static func display(grams: Int) -> String {
        if grams < 1000 { return "\(grams) g" }
        let kg = Double(grams) / 1000
        return kg >= 100 ? String(format: "%.0f kg", kg) : String(format: "%.1f kg", kg)
    }

    /// "12.4" with unit "kg" → 12400. Nil when not a positive number.
    static func grams(from text: String, unit: String) -> Int? {
        let normalised = text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
        guard let v = Double(normalised), v > 0, v.isFinite else { return nil }
        let g = unit == "kg" ? v * 1000 : v
        let rounded = Int(g.rounded())
        return (1...2_000_000).contains(rounded) ? rounded : nil
    }
}

enum Labels {
    static func sex(_ s: String) -> String {
        switch s { case "male": return "Male"; case "female": return "Female"; default: return "Unknown" }
    }
    static func neutered(_ s: String) -> String {
        switch s { case "yes": return "Yes"; case "no": return "No"; default: return "Not sure" }
    }
    /// "parasite_treatment" → "Parasite treatment"
    static func humanise(_ s: String) -> String {
        let spaced = s.replacingOccurrences(of: "_", with: " ").replacingOccurrences(of: "-", with: " ")
        return spaced.prefix(1).uppercased() + spaced.dropFirst()
    }
}

extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
    var nilIfBlank: String? { trimmed.isEmpty ? nil : trimmed }
}
