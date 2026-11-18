#!/usr/bin/env bash
# Fill the App Review demo account on pintopets.app (prod) with a household:
# pets, photos, health records and reminders. No community posts: prod's forum
# is real people only. Re-running replaces only the pets an earlier run made.
#
#   apps/web/scripts/seed/seed-review.sh <reviewer's OpsAPI user uuid>
#
# Needs a kubeconfig for k3s1 (KUBECONFIG, default ~/.kube/k3s1.yaml). The OpsAPI
# key comes from the prod cluster secret and is only held in this process.
set -euo pipefail

OWNER="${1:?usage: seed-review.sh <OpsAPI user uuid>}"
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/k3s1.yaml}"
NS=prod
OPSAPI_PUBLIC=https://opsapi.workstation.co.uk

if ! [[ "$OWNER" =~ ^[0-9a-f-]{36}$ ]]; then
  echo "Pass the owner's OpsAPI user uuid (the App Review account's OpsAPI user uuid; it's the user_uuid on their account-settings row)." >&2
  exit 1
fi

cd "$(dirname "$0")/../.."
export COPYFILE_DISABLE=1 # no macOS ._ files in the tar
MEDIA="$(mktemp -d)"
trap 'rm -rf "$MEDIA"' EXIT

OPSAPI_API_KEY="$(kubectl -n "$NS" get secret pintopets-opsapi -o jsonpath='{.data.OPSAPI_API_KEY}' | base64 -d)"
export OPSAPI_API_KEY

echo "Seeding the App Review account on prod: $OWNER ..."
APP_ENV=prod SEED_TARGET=review DEMO_AUTH=false SEED_OWNER_ID="$OWNER" \
  OPSAPI_URL="$OPSAPI_PUBLIC" OPSAPI_NAMESPACE=pintopets MEDIA_DIR="$MEDIA" \
  pnpm exec vitest run --config scripts/seed/vitest.config.ts

echo "Copying $(find "$MEDIA" -type f | wc -l | tr -d ' ') photo files to the prod pod's /data/media ..."
tar -C "$MEDIA" -cf - . | kubectl -n "$NS" exec -i deploy/pintopets -c web -- tar -C /data/media -xf -
echo "Done: https://pintopets.app"
