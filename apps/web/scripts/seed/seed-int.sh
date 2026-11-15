#!/usr/bin/env bash
# Seed int.pintopets.app with the demo household and community for real-world
# testing (see seed-demo.ts for exactly what it replaces; real data is kept).
#
#   apps/web/scripts/seed/seed-int.sh <owner OpsAPI user uuid>
#
# Needs a kubeconfig for k3s1 (KUBECONFIG, default ~/.kube/k3s1.yaml) that can
# read the int namespace. The OpsAPI key comes from the cluster secret and is
# only held in this process's environment. Photos are written to a temp dir,
# then copied onto the int pod's media volume.
set -euo pipefail

OWNER="${1:?usage: seed-int.sh <OpsAPI user uuid>}"
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/k3s1.yaml}"
NS=int
OPSAPI_PUBLIC=https://int-opsapi.workstation.co.uk

if ! [[ "$OWNER" =~ ^[0-9a-f-]{36}$ ]]; then
  echo "Pass the owner's OpsAPI user uuid (sign in to int once first; it's the user_uuid on their account-settings row)." >&2
  exit 1
fi

cd "$(dirname "$0")/../.."
export COPYFILE_DISABLE=1 # no macOS ._ files in the tar
MEDIA="$(mktemp -d)"
trap 'rm -rf "$MEDIA"' EXIT

OPSAPI_API_KEY="$(kubectl -n "$NS" get secret pintopets-opsapi -o jsonpath='{.data.OPSAPI_API_KEY}' | base64 -d)"
export OPSAPI_API_KEY

echo "Seeding int for $OWNER ..."
APP_ENV=int DEMO_AUTH=false SEED_OWNER_ID="$OWNER" \
  OPSAPI_URL="$OPSAPI_PUBLIC" OPSAPI_NAMESPACE=pintopets MEDIA_DIR="$MEDIA" \
  pnpm exec vitest run --config scripts/seed/vitest.config.ts

echo "Copying $(find "$MEDIA" -type f | wc -l | tr -d ' ') photo files to the int pod's /data/media ..."
tar -C "$MEDIA" -cf - . | kubectl -n "$NS" exec -i deploy/pintopets -c web -- tar -C /data/media -xf -
echo "Done: https://int.pintopets.app"
