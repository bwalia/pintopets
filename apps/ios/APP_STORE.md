# Launching PintoPets on the App Store

Everything Apple asks for, ready to paste or upload. Store text and screenshots live in
`fastlane/metadata` and `fastlane/screenshots` and upload with the App Store Connect API key
(no Apple ID password). Nothing here submits for review: that is a separate, explicit step.

| | |
|---|---|
| App name | PintoPets |
| Bundle ID | `app.pintopets.ios` (team PAS2QUVJHC) |
| SKU | `pintopets-ios` |
| Primary language | English (U.K.) |
| Version | 1.0.0 (build number = UTC time, set by `scripts/testflight.sh`) |
| Category | Lifestyle |
| Price | Free, all territories (decide before submitting) |
| Copyright | © 2026 Balinder Walia |
| Privacy policy | https://pintopets.app/privacy |
| Support | https://pintopets.app/support |

## Before submitting (blockers)

1. **Public production host.** Release builds use `PINTOPETS_API_URL` from
   `Config/Release.xcconfig` (currently `https://int.pintopets.app`). App Review and customers must reach
   it without the Workstation VPN, and `/privacy`, `/support`, `/terms` and `/account/delete` must be
   live there. Update the URLs in `fastlane/metadata/en-GB/*_url.txt` if the host differs.
2. **Account deletion** live on the web (`/account/delete`); the Account tab links to it.
3. **Sign in with Apple (guideline 4.8).** Sign-in offers Google. Apple requires an equivalent
   privacy-focused option (Sign in with Apple) unless the app only uses its own account system.
   Expect a rejection without it.
4. **Reviewer account** (see below) on the production host, with 2FA off.

## 1. App record (once, by hand: Apple's API can't create apps)

App Store Connect → Apps → + → New App, with the values above, or:

```sh
fastlane produce -u <apple-id> --app_identifier app.pintopets.ios --app_name PintoPets \
  --sku pintopets-ios --language en-GB --platform ios --team_id PAS2QUVJHC --skip_devcenter
```

## 2. TestFlight

```sh
apps/ios/scripts/testflight.sh      # from your own Terminal; allow codesign to use the key
```

Then TestFlight → Internal Testing → + group "Team" → add yourself → add the build.
Internal builds need no Beta App Review.

## 3. Store listing (text + screenshots)

```sh
cp fastlane/api_key.example.json ~/.appstoreconnect/pintopets_api_key.json   # outside the repo
cd apps/ios
fastlane deliver --api_key_path ~/.appstoreconnect/pintopets_api_key.json \
  --app_identifier app.pintopets.ios --platform ios \
  --skip_binary_upload --submit_for_review false --force \
  --overwrite_screenshots --precheck_include_in_app_purchases false
```

Screenshots: iPhone 6.9" (1320×2868) and iPad 13" (2064×2752), My Pets, Reminders, Community.
Re-take: run the web app (`pnpm dev`) with the demo seed, build Debug, launch with `-tab <name>`
on "iPhone 17 Pro Max" and "iPad Pro 13-inch (M5)", `xcrun simctl status_bar … override --time 9:41`.

## 4. App Privacy questionnaire

Data collection: **Yes**. Tracking: **No** (no ads, no analytics SDKs, no data brokers).
Matches `PintoPets/Resources/PrivacyInfo.xcprivacy`.

| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact info → Name | Yes | Yes | No | App functionality |
| Contact info → Email address | Yes | Yes | No | App functionality |
| Identifiers → User ID | Yes | Yes | No | App functionality |
| User content → Photos or videos | Yes | Yes | No | App functionality |
| User content → Other user content (pet records, forum posts) | Yes | Yes | No | App functionality |

Not collected: location (EXIF/GPS is stripped on the phone), health data about people, financial
info, contacts, browsing history, usage data, diagnostics, purchases.

## 5. Age rating (questionnaire answers)

- Violence, sexual content, profanity, horror, drugs/alcohol/tobacco, gambling, contests: **None**
- Medical/treatment information: **Infrequent/mild** (pet care records; health topics point to a vet)
- User-generated content: **Yes**, with reporting, moderation and published community guidelines
- Messaging/chat between users: **No** (public forum only, no private messages)
- Unrestricted web access: **No** (opens only PintoPets pages)
- Advertising: **No**. Parental controls / age assurance: **No**
- Made for kids: **No**

Expected rating: **13+** (because of user-generated content).

## 6. App Review information

- Sign-in required: **Yes**. Demo account: `<reviewer email>` / `<password>` on the production
  host, 2FA **off**, pre-filled with the demo household (`scripts/seed-int.sh`-style seed).
  Never commit these credentials; enter them only in App Store Connect.
- Contact: Balinder Walia, `<phone>`, `<email>`.
- Notes:

  > PintoPets is a pet-care record keeper. Tap Account → Sign in; sign-in opens our website in a
  > secure browser sheet (ASWebAuthenticationSession) and returns to the app. Use the demo account
  > above. My Pets shows the demo household; Reminders lists due care; Community is a moderated forum
  > (report any post from its menu). Account → "Delete account and data" opens the in-browser
  > deletion flow. The app collects no tracking or advertising data.

- Export compliance: `ITSAppUsesNonExemptEncryption = NO` is in Info.plist (HTTPS only).
- Content rights: no third-party content beyond what users post.

## 7. Submit (only with the owner's explicit approval)

App Store Connect → PintoPets → 1.0.0 → choose the TestFlight build → check every section is
green → **Add for Review** → **Submit**. Choose "Manually release this version" so launch
timing stays in your hands. Review usually takes 24–48 hours.
