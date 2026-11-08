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
# The build number is the UTC time (yyyymmddHHMM), so every upload is unique.
set -euo pipefail
cd "$(dirname "$0")/.."

ASC_KEY_ID="${ASC_KEY_ID:-6KVVV27G4Q}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-69a6de73-f034-47e3-e053-5b8c7c11a4d1}"
ASC_KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
[[ -f "$ASC_KEY_PATH" ]] || { echo "App Store Connect key not found: $ASC_KEY_PATH" >&2; exit 1; }

SIGN_IDENTITY="${SIGN_IDENTITY:-D15B53D8391617828029636CA4E89A252747D61D}"
BUILD_NUMBER="${BUILD_NUMBER:-$(date -u +%Y%m%d%H%M)}"
OUT="${OUT:-build/testflight}"
rm -rf "$OUT" && mkdir -p "$OUT"
AUTH=(-allowProvisioningUpdates
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID")

xcodegen generate --quiet

echo "Archiving PintoPets build $BUILD_NUMBER…"
xcodebuild archive -project PintoPets.xcodeproj -scheme PintoPets -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/PintoPets.xcarchive" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="$SIGN_IDENTITY" \
  PROVISIONING_PROFILE_SPECIFIER="PintoPets App Store" \
  "${AUTH[@]}" -quiet

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
  <dict><key>app.pintopets.ios</key><string>PintoPets App Store</string></dict>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>testFlightInternalTestingOnly</key><true/>
</dict>
</plist>
PLIST

echo "Uploading to App Store Connect…"
xcodebuild -exportArchive -archivePath "$OUT/PintoPets.xcarchive" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" -exportPath "$OUT/export" "${AUTH[@]}"

echo "Uploaded build $BUILD_NUMBER. It appears in TestFlight once Apple has processed it (usually 5–15 minutes)."
