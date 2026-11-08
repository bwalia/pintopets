import SwiftUI

struct ThreadView: View {
    @Environment(Session.self) private var session
    let threadId: String
    @State private var thread: Loadable<ForumThread> = .idle
    @State private var reply = ""
    @State private var sending = false
    @State private var error: String?
    @State private var reporting: ReportTarget?
    @FocusState private var replyFocused: Bool

    var body: some View {
        Group {
            switch thread {
            case .idle, .loading: ProgressView()
            case .failed(let message): ErrorStateView(message: message) { await load() }
            case .loaded(let t): content(t)
            }
        }
        .navigationTitle("Discussion")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $reporting) { ReportSheet(target: $0) }
        .task(id: session.isSignedIn) { await load() }
        .refreshable { await load() }
    }

    private func content(_ t: ForumThread) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let c = ForumCategory.named(t.category) {
                    Label(c.name, systemImage: c.symbol).font(.subheadline.bold()).foregroundStyle(Color.accentColor)
                }
                Text(t.title).font(.title2.bold()).accessibilityAddTraits(.isHeader)
                if t.status == "hidden" {
                    Label("Hidden while a moderator takes a look. Only you and the moderators can see it.", systemImage: "eye.slash")
                        .font(.callout).foregroundStyle(.orange)
                }
                if ForumCategory.named(t.category)?.health == true { UrgentHelpBanner() }

                PostView(author: t.author, createdAt: t.createdAt, editedAt: t.editedAt, text: t.body)
                if !t.tags.isEmpty {
                    Text(t.tags.map { "#\($0)" }.joined(separator: "  ")).font(.caption).foregroundStyle(.secondary)
                }
                actions(score: t.score, voted: t.viewerVoted, isYou: t.author.isYou,
                        onVote: { await vote(type: "thread", id: t.id, voted: !t.viewerVoted) },
                        onReport: { reporting = ReportTarget(type: "thread", id: t.id) })

                Divider()
                Text(t.replies.count == 1 ? "1 reply" : "\(t.replies.count) replies")
                    .font(.headline).accessibilityAddTraits(.isHeader)

                ForEach(t.replies) { r in
                    VStack(alignment: .leading, spacing: 8) {
                        if r.isAccepted {
                            Label("Marked as the answer", systemImage: "checkmark.seal.fill")
                                .font(.caption.bold()).foregroundStyle(.green)
                        }
                        PostView(author: r.author, createdAt: r.createdAt, editedAt: r.editedAt, text: r.body)
                        actions(score: r.score, voted: r.viewerVoted, isYou: r.author.isYou,
                                onVote: { await vote(type: "reply", id: r.id, voted: !r.viewerVoted) },
                                onReport: { reporting = ReportTarget(type: "reply", id: r.id) })
                    }
                    .padding()
                    .background(r.isAccepted ? Color.green.opacity(0.08) : Color.secondary.opacity(0.06),
                                in: RoundedRectangle(cornerRadius: 12))
                }

                composer(t)
            }
            .padding()
        }
    }

    @ViewBuilder private func composer(_ t: ForumThread) -> some View {
        if t.isLocked {
            Label("This discussion is locked.", systemImage: "lock.fill").foregroundStyle(.secondary)
        } else if !session.isSignedIn {
            VStack(alignment: .leading, spacing: 8) {
                Text("Sign in to reply").font(.headline)
                SignInButton()
            }
        } else if t.can.reply {
            VStack(alignment: .leading, spacing: 8) {
                Text("Your reply").font(.headline)
                TextField("Share what helped, kindly and clearly", text: $reply, axis: .vertical)
                    .lineLimit(3...10)
                    .textFieldStyle(.roundedBorder)
                    .focused($replyFocused)
                if let error { ErrorBanner(message: error) }
                Button {
                    Task { await send() }
                } label: {
                    if sending { ProgressView() } else { Text("Post reply") }
                }
                .buttonStyle(.borderedProminent)
                .disabled(sending || reply.trimmed.count < 2)
                Text("Be kind. Don't share phone numbers or email addresses. For emergencies, call a vet.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func actions(score: Int, voted: Bool, isYou: Bool,
                         onVote: @escaping () async -> Void, onReport: @escaping () -> Void) -> some View {
        HStack(spacing: 16) {
            Button {
                Task { await onVote() }
            } label: {
                Label("Helpful · \(score)", systemImage: voted ? "hand.thumbsup.fill" : "hand.thumbsup")
            }
            .buttonStyle(.bordered)
            .tint(voted ? .accentColor : .secondary)
            .disabled(isYou || !session.isSignedIn)
            .accessibilityHint(isYou ? "You can't vote for your own post" : "")
            Spacer()
            if session.isSignedIn, !isYou {
                Button(action: onReport) { Label("Report", systemImage: "flag") }
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func load() async {
        if thread.value == nil { thread = .loading }
        do {
            let r: DataEnvelope<ForumThread> = try await session.api.get("/api/v1/community/threads/\(threadId)")
            thread = .loaded(r.data)
        } catch is CancellationError {
        } catch {
            thread = .failed(error.localizedDescription)
        }
    }

    private func vote(type: String, id: String, voted: Bool) async {
        do {
            let r: DataEnvelope<VoteResult> = try await session.api.send(
                "POST", "/api/v1/community/votes", body: VoteInput(targetType: type, targetId: id, voted: voted))
            guard case .loaded(var t) = thread else { return }
            if type == "thread" {
                t.score = r.data.score; t.viewerVoted = r.data.voted
            } else if let i = t.replies.firstIndex(where: { $0.id == id }) {
                t.replies[i].score = r.data.score; t.replies[i].viewerVoted = r.data.voted
            }
            thread = .loaded(t)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func send() async {
        sending = true
        error = nil
        defer { sending = false }
        do {
            let _: DataEnvelope<ForumReply> = try await session.api.send(
                "POST", "/api/v1/community/threads/\(threadId)/replies", body: ReplyInput(body: reply.trimmed))
            reply = ""
            replyFocused = false
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct PostView: View {
    let author: ForumAuthor
    let createdAt: String
    let editedAt: String?
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "person.circle.fill").foregroundStyle(.secondary).accessibilityHidden(true)
                Text(author.isYou ? "\(author.name) (you)" : author.name).font(.subheadline.bold())
                Text("· \(Dates.relative(createdAt))\(editedAt == nil ? "" : " · edited")")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            LinkedText(text: text)
        }
    }
}

struct ReportTarget: Identifiable {
    let type: String
    let id: String
}

struct ReportSheet: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let target: ReportTarget
    @State private var reason: ReportReason = .spam
    @State private var details = ""
    @State private var sending = false
    @State private var sent = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                if sent {
                    Section {
                        Label("Thank you. A moderator will take a look.", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                } else {
                    if let error { Section { ErrorBanner(message: error) } }
                    Section("What's wrong?") {
                        Picker("Reason", selection: $reason) {
                            ForEach(ReportReason.allCases) { Text($0.label).tag($0) }
                        }
                        .pickerStyle(.inline)
                        .labelsHidden()
                    }
                    Section {
                        TextField("Anything the moderators should know (optional)", text: $details, axis: .vertical)
                            .lineLimit(2...6)
                    } footer: {
                        if reason == .animal_welfare {
                            Text("If an animal is in danger right now, contact the RSPCA (0300 1234 999) or the police.")
                        }
                    }
                }
            }
            .navigationTitle("Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(sent ? "Done" : "Cancel") { dismiss() } }
                if !sent {
                    ToolbarItem(placement: .confirmationAction) {
                        if sending { ProgressView() } else { Button("Send") { Task { await send() } } }
                    }
                }
            }
        }
        .presentationDetents([.large])
    }

    private func send() async {
        sending = true
        defer { sending = false }
        do {
            try await session.api.sendNoContent("POST", "/api/v1/community/reports", body: ReportInput(
                targetType: target.type, targetId: target.id, reason: reason.rawValue, details: details.nilIfBlank))
            sent = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}
