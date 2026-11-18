#!/usr/bin/env bash
# Archives the Release build and uploads it to TestFlight.
#
#   apps/ios/scripts/testflight.sh
#
# Signs with the team's Apple Distribution certificate (must be in the login
# keychain) and the "PintoPets App Store" provisioning profile, which Xcode
# downloads with the App Store Connect API key (no Apple ID password).
#   ASC_KEY_ID      (default 6KVVV27G4Q)
#   ASC_ISSUER_ID   (default: the team's issuer)
#   ASC_KEY_PATH    (default ~/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8)
#   SIGN_IDENTITY   (default: SHA-1 of the Apple Distribution certificate the
#                   profile was made with; the name alone also matches revoked ones)
#   PROFILE_NAME    (default "PintoPets App Store"): the App Store profile made
#                   with SIGN_IDENTITY's certificate
#   PINTOPETS_API_URL (default: Config/Release.xcconfig, i.e. int, VPN only).
#                   Set it to the confirmed PUBLIC production URL for builds
#                   that go to App Review or external testers.
# The build number is the UTC time (yyyymmddHHMM), so every upload is unique.
set -euo pipefail
cd "$(dirname "$0")/.."

ASC_KEY_ID="${ASC_KEY_ID:-6KVVV27G4Q}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-69a6de73-f034-47e3-e053-5b8c7c11a4d1}"
ASC_KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
[[ -f "$ASC_KEY_PATH" ]] || { echo "App Store Connect key not found: $ASC_KEY_PATH" >&2; exit 1; }

SIGN_IDENTITY="${SIGN_IDENTITY:-D15B53D8391617828029636CA4E89A252747D61D}"
PROFILE_NAME="${PROFILE_NAME:-PintoPets App Store}"
BUILD_NUMBER="${BUILD_NUMBER:-$(date -u +%Y%m%d%H%M)}"
OUT="${OUT:-build/testflight}"
rm -rf "$OUT" && mkdir -p "$OUT"
AUTH=(-allowProvisioningUpdates
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID")

xcodegen generate --quiet

API_OVERRIDE=()
# Only builds against the public production server may go to App Review /
# external testers; int builds stay internal-only.
INTERNAL_ONLY=true
if [[ -n "${PINTOPETS_API_URL:-}" ]]; then
  [[ "$PINTOPETS_API_URL" == https://* ]] || { echo "PINTOPETS_API_URL must be https://…" >&2; exit 1; }
  curl -fsS -o /dev/null --max-time 10 "$PINTOPETS_API_URL/api/v1/health" ||
    { echo "$PINTOPETS_API_URL/api/v1/health is not reachable from here." >&2; exit 1; }
  API_OVERRIDE=(PINTOPETS_API_URL="$PINTOPETS_API_URL")
  INTERNAL_ONLY=false
  echo "Server: $PINTOPETS_API_URL"
else
  # shellcheck disable=SC2016 # $(SLASH) is the literal xcconfig token
  echo "Server: $(sed -n 's/^PINTOPETS_API_URL = //p' Config/Release.xcconfig | sed 's/\$(SLASH)/\//g')" \
    "(int, Workstation VPN only: fine for internal TestFlight, NOT for App Review)"
fi

echo "Archiving PintoPets build ${BUILD_NUMBER}…"
xcodebuild archive -project PintoPets.xcodeproj -scheme PintoPets -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/PintoPets.xcarchive" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="$SIGN_IDENTITY" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" \
  ${API_OVERRIDE[@]+"${API_OVERRIDE[@]}"} \
  "${AUTH[@]}" -quiet

BAKED=$(/usr/libexec/PlistBuddy -c "Print :PintoPetsAPIURL" \
  "$OUT/PintoPets.xcarchive/Products/Applications/PintoPets.app/Info.plist")
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" \
  "$OUT/PintoPets.xcarchive/Products/Applications/PintoPets.app/Info.plist")
echo "Archived PintoPets $VERSION ($BUILD_NUMBER), server $BAKED"

cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>PAS2QUVJHC</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>$SIGN_IDENTITY</string>
  <key>provisioningProfiles</key>
  <dict><key>app.pintopets.ios</key><string>$PROFILE_NAME</string></dict>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>testFlightInternalTestingOnly</key><$INTERNAL_ONLY/>
</dict>
</plist>
PLIST

echo "Uploading to App Store Connect…"
xcodebuild -exportArchive -archivePath "$OUT/PintoPets.xcarchive" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" -exportPath "$OUT/export" "${AUTH[@]}"

echo "Uploaded build $BUILD_NUMBER. It appears in TestFlight once Apple has processed it (usually 5–15 minutes)."
