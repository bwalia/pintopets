# Launching PintoPets on the App Store

The complete release package for PintoPets 1.0.0 on iPhone and iPad: what is done, what is
left, and the exact steps that need the Apple Developer account (Balinder).

Nothing here uploads a build or submits for review. Those are separate, explicit steps.

## Status (16 November 2026)

| Area                                                         | Status                                                        | Where                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------- |
| App code, version 1.0.0, iOS 17+, iPhone and iPad            | ✅ Ready                                                      | branch `ios/app-store-readiness`               |
| Privacy manifest (`PrivacyInfo.xcprivacy`)                   | ✅ Ready                                                      | `PintoPets/Resources/`                         |
| Account tab: delete account, privacy, terms, support links   | ✅ Ready                                                      | `Features/Account/AccountView.swift`           |
| Account deletion (web page + `DELETE /api/v1/me`)            | ✅ Closes the OpsAPI sign-in + revokes Apple (opsapi 1.0.397) | merged                                         |
| Privacy policy, terms, support pages                         | ✅ Built, not deployed                                        | same branch: `/privacy`, `/terms`, `/support`  |
| Sign in with Apple (guideline 4.8)                           | ✅ Built, off until Apple keys exist                          | same branch: `/signin`, `APPLE_SIGNIN_ENABLED` |
| Store text, screenshots, categories                          | ✅ Ready                                                      | `fastlane/metadata`, `fastlane/screenshots`    |
| Signing: certificate, "PintoPets App Store" profile, API key | ✅ Verified                                                   | profile valid to 15 Sep 2027                   |
| App Store Connect app record                                 | ❌ **Balinder**                                               | step B1                                        |
| Support email `support@pintopets.app`                        | ❌ **Balinder**: domain has no MX records, mail bounces       | step B2                                        |
| Public production host                                       | 🟡 `pintopets.app` on k3s1; deploying                         | step B3                                        |
| Apple keys for Sign in with Apple                            | ❌ **Balinder**                                               | step B4                                        |
| Reviewer demo account                                        | ❌ After B3                                                   | step B6                                        |

**Ready for internal TestFlight now** (after B1). **Ready for App Review** once B1–B6 are done
and both branches are merged and deployed to the production host.

## Release facts

|                    |                                                                                 |
| ------------------ | ------------------------------------------------------------------------------- |
| App name           | PintoPets                                                                       |
| Bundle ID          | `app.pintopets.ios` (team PAS2QUVJHC). Unchanged.                               |
| SKU                | `pintopets-ios`                                                                 |
| Primary language   | English (U.K.)                                                                  |
| Version            | 1.0.0. Build number = UTC time `yyyymmddHHMM`, set by `scripts/testflight.sh`   |
| Devices            | iPhone and iPad, iOS 17.0+                                                      |
| Category           | Lifestyle (no secondary: "Medical" invites guideline 1.4.1 scrutiny)            |
| Price              | Free (confirm), all territories (confirm)                                       |
| Copyright          | © 2026 Balinder Walia                                                           |
| Privacy policy URL | `https://<production host>/privacy`                                             |
| Support URL        | `https://<production host>/support`                                             |
| Marketing URL      | `https://<production host>` (optional)                                          |
| Encryption         | `ITSAppUsesNonExemptEncryption = NO` (HTTPS only): no export question per build |

The `*_url.txt` files in `fastlane/metadata/en-GB` say `https://pintopets.app/...`. That host
does not exist yet: replace it with the confirmed production host before uploading metadata.

## What was checked

- **Release build** for a device (unsigned) and for the simulator: succeed. Bundle contains the
  compiled AppIcon, `PrivacyInfo.xcprivacy`, version 1.0.0, iOS 17.0, arm64, camera usage text.
- **iOS unit tests**: 11 passed, 0 failed (`xcodebuild test`, iPhone 17 Pro simulator).
- **Web** (branch `web/account-deletion-and-policies`): lint and typecheck clean; unit tests
  115 passed, 23 skipped (OpsAPI integration tests need `.env.local`); api-contract 8, db 26,
  ui 2 passed. Account deletion integration tests (2) pass against a real (local) OpsAPI:
  pets, records, photo files on disk, threads, replies, votes, reports, settings.
  End-to-end against a production build: 73–74 passed, 15 skipped. Known local-only failures:
  `security.spec.ts:76` (the shared demo account in the local database has had 2FA on since
  7 Nov from an interrupted run; the test assumes it is off; passes on a fresh database, also
  fails on `main`) and, after many runs in an hour, `community.spec.ts:9` (the forum's
  per-person posting limit for the demo account).
- **Signing**: the Apple Distribution certificate `D15B53D8…` is in the login keychain; the
  "PintoPets App Store" profile is an App Store profile for `PAS2QUVJHC.app.pintopets.ios` with
  that certificate and no extra capabilities (none needed: Sign in with Apple runs on the web).
  The App Store Connect API key `6KVVV27G4Q` works (it reads the team's apps).
- **No tracking**: no analytics, ads or tracking SDKs in the app or website. The website can
  report errors to Sentry when `NEXT_PUBLIC_SENTRY_DSN` is set (no personal data by default).

## Steps for Balinder (Apple Developer account and domain)

### B1. Create the app record (2 minutes)

App Store Connect → Apps → **+** → New App:

- Platforms: **iOS**
- Name: **PintoPets** (if taken: "PintoPets – Pet Care")
- Primary language: **English (U.K.)**
- Bundle ID: **app.pintopets.ios**
- SKU: **pintopets-ios**
- User access: **Full Access**

Needs the Account Holder, Admin or App Manager role. Apple's API cannot create apps, so this
must be done by hand (or with `fastlane produce`, which asks for your Apple ID password).

### B2. Make the support email work

`pintopets.app` is on Cloudflare but has no MX records. Either:

- Cloudflare dashboard → pintopets.app → **Email → Email Routing** → enable → add
  `support@pintopets.app` → forward to your inbox (adds the MX and SPF records), or
- choose another address you already receive mail at and change `LEGAL.contactEmail` in
  `apps/web/src/lib/legal.ts`.

Then send a test email to the address. Also confirm the controller name ("Balinder Walia") in
the same file.

### B3. Confirm the production host

Decide the public URL (for example `https://pintopets.app`) and where it runs. It must be
reachable from the internet without the Workstation VPN. Then:

**Decided (17 Nov 2026): `https://pintopets.app` on k3s1, namespace `prod`, public.**
`deploy/helm/pintopets/values-prod.yaml` and `deploy/edge/wslproxy-server-prod.json` are in
the repo; follow `docs/environments.md` → "One-off setup (PROD)".

1. Prod OpsAPI loads the plugin and trusts `pintopets.app`; create the prod `pintopets`
   workspace, API key and `pintopets-opsapi` Secret; apply the apex DNS failover.
2. Deploy prod; check `/api/v1/health`, `/privacy`, `/terms`, `/support`, `/account/delete`
   all load from outside the VPN.
3. The `fastlane/metadata/en-GB/*_url.txt` files already say `https://pintopets.app`.
4. Build App Store binaries with `PINTOPETS_API_URL=https://<host> scripts/testflight.sh`
   (the script checks the host is reachable and prints the server baked into the build).

### B4. Sign in with Apple keys (Certificates, IDs & Profiles)

**Optional for 1.0.** While `appleSignIn` is false, PintoPets asks OpsAPI for its
password-only sign-in page (`providers=password`), so the app offers no Google sign-in and
guideline 4.8 does not apply. Doing B4 and setting `appleSignIn: true` brings back both
"Continue with Apple" and "Continue with Google".

Done on the web through OpsAPI, so **the app's App ID, entitlements and provisioning profile
stay unchanged**. To keep it that way, use a separate primary App ID:

1. **Identifiers → + → App IDs → App**: description "PintoPets Web", bundle ID
   `app.pintopets.web` (explicit), tick **Sign In with Apple** (enable as primary App ID).
2. **Identifiers → + → Services IDs**: description "PintoPets", identifier
   `app.pintopets.signin`. Tick **Sign In with Apple → Configure**: primary App ID
   `app.pintopets.web`; Domains: the OpsAPI public host (int: `int-opsapi.workstation.co.uk`,
   plus prod's); Return URLs: `https://<OpsAPI public host>/auth/apple/callback`.
3. **Keys → +**: name "PintoPets Sign in with Apple", tick **Sign In with Apple → Configure**
   → `app.pintopets.web`. Download the `.p8` (only once) and note the Key ID.
4. Give OpsAPI (for int and prod), as secrets, never in git:
   `APPLE_TEAM_ID=PAS2QUVJHC`, `APPLE_KEY_ID=<key id>`, `APPLE_PRIVATE_KEY=<.p8 contents>`,
   `APPLE_CLIENT_ID=app.pintopets.signin`,
   `APPLE_REDIRECT_URI=https://<OpsAPI public host>/auth/apple/callback`.
5. Set `appleSignIn: true` in the PintoPets Helm values for that environment and deploy.
   Check: the sign-in chooser shows "Continue with Apple" first and it completes.
6. If OpsAPI emails users (sign-in codes), register its sending domain under
   **Services → Sign in with Apple for Email Communication**, or mail to
   `@privaterelay.appleid.com` addresses is dropped.

### B5. TestFlight upload

From your own Terminal on the Mac Studio (macOS asks once to let `codesign` use the key: click
**Always Allow**):

```sh
cd ~/projects/pintopets/apps/ios
git switch ios/app-store-readiness          # or main once merged
./scripts/testflight.sh                     # internal testing, int server (VPN)
# For App Review / external testers, once B3 is done:
PINTOPETS_API_URL=https://<production host> ./scripts/testflight.sh
```

It archives, signs with the "PintoPets App Store" profile and uploads with the API key (no
Apple ID password). The build shows in App Store Connect → TestFlight after processing
(5–15 minutes). Then:

- TestFlight → **Internal Testing → +** → group "Team" → add yourself and testers (must be
  App Store Connect users) → add the build. No Beta App Review needed.
- Install from the TestFlight app on an iPhone. Int builds need the Workstation VPN.

### B6. Reviewer demo account

On the production host, create an account that App Review can use:

- an email you control (e.g. `appreview@<your domain>`) with a password (email-and-password
  sign-in);
- two-factor sign-in **off**, and no email code required at sign-in;
- filled with a demo household (a few pets with photos, records, upcoming reminders) and a
  couple of forum posts, like `scripts/seed-int.sh` does for int;
- keep it working for the whole review. Enter the credentials **only in App Store Connect**
  (App Review Information), never in git or chat.

### B7. Store listing (text and screenshots)

Either paste from `fastlane/metadata/en-GB/*.txt` into App Store Connect, or upload with the API
key (no password):

```sh
cp fastlane/api_key.example.json ~/.appstoreconnect/pintopets_api_key.json  # outside the repo
cd ~/projects/pintopets/apps/ios
fastlane deliver --api_key_path ~/.appstoreconnect/pintopets_api_key.json \
  --app_identifier app.pintopets.ios --platform ios --app_version 1.0.0 \
  --skip_binary_upload --submit_for_review false --force \
  --overwrite_screenshots --precheck_include_in_app_purchases false
```

| Field            | Value (limit)                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Name             | PintoPets (30)                                                                                         |
| Subtitle         | Pet health records & reminders (30/30)                                                                 |
| Keywords         | pet,dog,cat,vet,vaccination,reminder,health,record,rabbit,horse,weight,flea,worming,diet,care (93/100) |
| Promotional text | `promotional_text.txt` (149/170)                                                                       |
| Description      | `description.txt` (1,344/4,000)                                                                        |
| What's new       | First release: pets, health records, reminders and the PintoPets community.                            |

Screenshots (`fastlane/screenshots/en-GB`), status bar 9:41 and full battery:

- iPhone 6.9" (1320 × 2868): My Pets, Reminders, Community
- iPad 13" (2064 × 2752): My Pets, Reminders, Community

To re-take: `pnpm dev` with the demo seed, build Debug, launch on "iPhone 17 Pro Max" and
"iPad Pro 13-inch (M5)" with `-tab pets|reminders|community`, and
`xcrun simctl status_bar <device> override --time 9:41 --batteryState charged --batteryLevel 100`.

### B8. App Privacy questionnaire

Data collection: **Yes**. Tracking: **No**. Matches `PrivacyInfo.xcprivacy`.

| Data type                                                    | Linked to user | Tracking | Purpose           |
| ------------------------------------------------------------ | -------------- | -------- | ----------------- |
| Contact info → Name                                          | Yes            | No       | App functionality |
| Contact info → Email address                                 | Yes            | No       | App functionality |
| Identifiers → User ID                                        | Yes            | No       | App functionality |
| User content → Photos or videos                              | Yes            | No       | App functionality |
| User content → Other user content (pet records, forum posts) | Yes            | No       | App functionality |

Not collected: location (photo EXIF/GPS is removed on the phone), health or fitness data about
people, financial info, contacts, browsing or search history, usage data, diagnostics, purchases.
If Sentry is turned on for production and receives user IDs, add Diagnostics → Crash data /
Other diagnostic data (linked, app functionality).

### B9. Age rating questionnaire

- Violence, sexual content or nudity, profanity, horror, drugs, alcohol, tobacco, gambling,
  contests: **None**
- Medical or treatment information: **Infrequent/Mild** (pet care records; health topics point
  to a vet)
- User-generated content: **Yes** (forum with reporting, moderation and published guidelines)
- Messaging or chat between users: **No** (public forum only)
- Unrestricted web access: **No** (opens only PintoPets pages)
- Advertising: **No**. Parental controls: **No**. Age assurance: **No**. Made for Kids: **No**

Expected rating: **13+**.

### B10. App Review information

- Sign-in required: **Yes**, with the account from B6.
- Contact: Balinder Walia, phone and email (App Store Connect only).
- Notes:

  > PintoPets keeps pets' health records and care reminders, with a moderated community forum.
  > To sign in, tap Account → Sign in. Sign-in opens our website in a secure browser sheet
  > (ASWebAuthenticationSession) and returns to the app; enter the demo account's email and
  > password above (two-factor sign-in is off for it). Sign-in is email and password only: the
  > app offers no third-party or social login.
  > My Pets shows the demo household; Reminders lists due care; Community is a moderated forum
  > (report any post from its menu). Account → "Delete account and data" opens the deletion
  > flow on our website, which removes the user's pets, records, photos and posts.
  > No tracking or advertising.

- Attachment: none needed.

### B11. Submit (only with explicit approval)

App Store Connect → PintoPets → iOS App 1.0.0:

1. Build: choose the TestFlight build made with the production `PINTOPETS_API_URL`.
2. Check every section is complete (Pricing and Availability, App Privacy, Age Rating, App
   Review Information, screenshots for iPhone and iPad).
3. Version Release: **Manually release this version**.
4. **Add for Review → Submit to App Review**.

Review usually takes 24–48 hours. After approval, press **Release This Version** when ready.

## Merging and deploying (engineering, after approval)

1. Open PRs for `web/account-deletion-and-policies` and `ios/app-store-readiness`; review; merge.
2. Deploy to int (VPN) and test: sign in from the app, delete a throwaway account, open
   `/privacy`, `/terms`, `/support`.
3. Deploy to the production host (B3) with `appleSignIn: true` once B4 is done.

## Account deletion: how it works and what to verify

- `/account/delete` (linked from the app's Account tab and the website). Everyone first
  **signs in again** ("Sign in again to continue": OpsAPI's form with `prompt=login`, so
  single sign-on can't skip it); the fresh OpsAPI token is kept encrypted for 10 minutes for
  this one purpose. Then type DELETE; with two-factor sign-in on, also an authenticator code.
  `DELETE /api/v1/me` enforces the same.
- Deleted: owned pets and every record, photo rows and their files (full and thumbnail),
  pet memberships, community name, helpful votes, two-factor and consent settings.
- Scrubbed, not deleted: the user's threads and replies (text replaced, status "removed",
  author set to a random ID) so other people's discussions stay intact; reports they filed
  (reporter unlinked, their note erased). Kept: moderators' audit log.
- **Then the Workstation (OpsAPI) sign-in is closed** with the user's own fresh token
  (`POST /auth/delete-account`): OpsAPI deactivates it, ends its sessions, removes push
  device tokens and **revokes Sign in with Apple** (Apple's `/auth/revoke`, with the refresh
  token OpsAPI now stores sealed at Apple sign-in). Data goes first: if closing the sign-in
  fails, the user can still sign in and retry. The identity is shared with other Workstation
  services, so it is closed for them too (said on the page and in the privacy policy).
- **Requires the OpsAPI change** (bwalia/opsapi PR "account deletion: fresh sign-in, Apple
  revoke") deployed to the same ring first. Without it, `/auth/delete-account` still demands a
  password and deletion stops after the data with "couldn't close your Workstation sign-in".
- Apple users who signed in before that OpsAPI change have no stored Apple token, so
  revocation reports `false` for them (logged). Every Apple sign-in from then on is covered;
  Sign in with Apple is still off (B4), so nobody is affected at launch.
- Records that someone else created on a pet they share with the user would keep the user's
  ID in `created_by_user_uuid`; the product has no pet sharing yet, so this can't happen today.
- Tokens already issued: OpsAPI access tokens live out their TTL (up to 1 hour) except for
  `/auth/me`; the app's PintoPets token is signed, not stored, and has no data behind it.

Verify by hand on int after deploying (needs a throwaway account, not the demo account):
create a pet with a photo, post a thread and a reply, vote and report; delete the account;
check the pet, photo URL, thread text and community name are gone and the photo files are no
longer in the media volume; check signing in again with that account is refused; check every
account is asked to sign in again (even one that just signed in) and a 2FA account is also
asked for a code. Once B4 is done, repeat with a Sign in with Apple account and check
Settings → Apple ID → Sign in with Apple no longer lists PintoPets.
