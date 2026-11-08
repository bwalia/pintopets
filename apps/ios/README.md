# PintoPets for iOS

Native SwiftUI app (iOS 17+) for PintoPets: My Pets, Reminders, Community and
Account. It talks to the same versioned API as the website (`/api/v1`, see
`/api/v1/openapi.json`), so there is no separate backend.

## Run it

```sh
pnpm dev                      # the web app on http://localhost:3000 (repo root)
cd apps/ios
brew install xcodegen         # once
xcodegen generate             # after adding/removing files or editing project.yml
open PintoPets.xcodeproj      # then Run on an iPhone simulator
```

- **Debug** builds use `http://localhost:3000` (local demo account, no sign-in needed).
- **Release** builds use `https://int.pintopets.app` (Workstation VPN).
  Both are set in `Config/*.xcconfig` (`PINTOPETS_API_URL`).
- Debug builds accept `-tab community` (or `pets`, `reminders`, `account`) to open on a tab.

Tests: `xcodebuild test -project PintoPets.xcodeproj -scheme PintoPets -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`.

## Sign-in

Sign-in reuses the website's (password, Google, authenticator codes) via an
authorization code with PKCE (RFC 7636):

1. The app opens `/auth/app/start?challenge=…` in a private `ASWebAuthenticationSession`.
2. The person signs in and confirms "Sign in to the app" (a same-site POST).
3. The site redirects to `pintopets://auth/callback?code=…` (code valid for 2 minutes,
   and only with the verifier that never left the app).
4. The app exchanges `{ code, verifier }` at `POST /api/v1/auth/token` for a
   30-day bearer token, kept in the Keychain (this device only, unlocked only).

Server side: `apps/web/src/server/app-auth.ts`. Signing out forgets the token on
the device; tokens are signed rather than stored, so they lapse after 30 days.

## What's in the app

| Tab       | Does                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| My Pets   | List (current, archived, remembered), add and edit pets, photos (re-encoded on the phone, EXIF/GPS dropped), weight, every health and diet record kind |
| Reminders | Overdue, due soon and upcoming care across all pets                                                                                                    |
| Community | Browse, filter by topic, sort, search, read, start discussions, reply, vote helpful, report. Health topics always show urgent-help guidance            |
| Account   | Who's signed in; security, data export and moderation open on the website (they need a fresh authenticator code)                                       |

Not yet in the app: adding health records other than weight, editing and
deleting forum posts, moderator tools, push notifications.

## TestFlight

```sh
apps/ios/scripts/testflight.sh
```

Archives the Release build (build number = UTC time), signs it with the team's
Apple Distribution certificate and the "PintoPets App Store" profile, and
uploads it with the App Store Connect API key in
`~/.appstoreconnect/private_keys/`. Run it from your own Terminal: macOS asks
once to let `codesign` use the signing key. Release builds talk to
`https://int.pintopets.app`, so testers need the Workstation VPN until there is a
production host.

Set up once (done for team PAS2QUVJHC): bundle id `app.pintopets.ios`, the
"PintoPets App Store" profile, and the app record in App Store Connect
(created by hand: Apple's API can't create apps).
