import SwiftUI
import UIKit

/// Pet photos are private (members of the pet only), so they are fetched with
/// the bearer token and cached in memory only, never on disk.
final class ImageLoader: @unchecked Sendable {
    static let shared = ImageLoader()
    private let cache = NSCache<NSString, UIImage>()

    init() { cache.totalCostLimit = 64 * 1024 * 1024 }

    func cached(_ url: URL) -> UIImage? { cache.object(forKey: url.absoluteString as NSString) }

    func load(_ url: URL, api: APIClient) async throws -> UIImage {
        if let hit = cached(url) { return hit }
        var request = api.request(url)
        request.setValue("image/*", forHTTPHeaderField: "Accept")
        let data = try await api.data(for: request)
        guard let image = UIImage(data: data) else { throw APIError.offline }
        cache.setObject(image, forKey: url.absoluteString as NSString, cost: data.count)
        return image
    }

    func clear() { cache.removeAllObjects() }
}

/// A private pet photo, or a paw placeholder.
struct PetPhotoView: View {
    @Environment(Session.self) private var session
    let path: String?
    var alt: String?
    var size: CGFloat? = nil

    @State private var image: UIImage?

    var body: some View {
        ZStack {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .accessibilityLabel(alt ?? "Pet photo")
            } else {
                Rectangle()
                    .fill(Color.accentColor.opacity(0.12))
                    .overlay {
                        Image(systemName: "pawprint.fill")
                            .font(size.map { .system(size: $0 * 0.4) } ?? .largeTitle)
                            .foregroundStyle(Color.accentColor.opacity(0.6))
                    }
                    .accessibilityHidden(true)
            }
        }
        .frame(width: size, height: size)
        .clipped()
        .task(id: path) {
            guard let path, let url = session.api.absolute(path) else { image = nil; return }
            image = ImageLoader.shared.cached(url)
            if image == nil { image = try? await ImageLoader.shared.load(url, api: session.api) }
        }
    }
}
