# Environments and deployment

## Rings

| Ring | Host                 | Access               | Cluster                | Status                               |
| ---- | -------------------- | -------------------- | ---------------------- | ------------------------------------ |
| INT  | `int.pintopets.app`  | Workstation VPN only | k3s1, namespace `int`  | Set up (this doc)                    |
| TEST | `test.pintopets.app` | Workstation VPN only | k3s1, namespace `test` | Not yet: no values file or edge spec |
| ACC  | `acc.pintopets.app`  | Workstation VPN only | k3s1, namespace `acc`  | Not yet                              |
| PROD | `pintopets.app`      | Public               | TBD (Vercel or k3s1)   | Not yet                              |

INT, TEST and ACC must reject requests that do not come through the Workstation
VPN. The workflow refuses to publish a non-prod ring whose edge spec has no
`access_profile`.

## Request path

```
browser
  → int.pintopets.app            Cloudflare CNAME, DNS-only, TTL 60
  → lon1.pop0.uk                 (lon2.pop0.uk after a DNS failover)
  → wslproxy vhost               TLS (Let's Encrypt), VPN access profile
  → k3s1 traefik ingress         Host: int.pintopets.app
  → Service pintopets → Deployment pintopets (Next.js standalone)
                      → StatefulSet pintopets-postgres (pgvector/pg17, longhorn PVC)
```

### lon1 / lon2 failover

Two layers, the same as `int.workstation.co.uk` and the JobShout pre-prod hosts:

1. **wslproxy:** the vhost is registered on pop0 through the admin API. lon2
   mirrors lon1 (`wslproxy-edge-sync`), including its certificates, so either POP
   can serve `int.pintopets.app`.
2. **DNS:** the `nebula-dns-failover` Cloudflare writer on ns1 and ns2 (instance
   `pintopets-app` in `bwalia/diy-tax-return-infra`,
   `ansible/files/nebuladns/dns-failover-cloudflare-pintopets-app.toml`) probes
   `https://lon1.pop0.uk/healthz` and `https://lon2.pop0.uk/healthz` every 10s.
   After 3 failures it re-points the CNAME to `lon2.pop0.uk`, and fails back 30s
   after lon1 is healthy again. Clients move within about 2–3 × TTL (2–3 minutes).

Why not `CNAME lon.pop0.uk`? `lon.pop0.uk` is a round-robin of both POP IPs with
no health checks, and the failover controller must own the record it rewrites,
so a hostname can't be both. Switching is a one-line change to the record, plus
removing the hostname from the controller config.

The deploy workflow only **creates** the CNAME when it is missing. It never
re-points it, so it cannot fight the controller mid-failover.

## Pipeline

```
push to main ─▶ check ─▶ DNS ─▶ edge vhost ─▶ build & push harneetk78/pintopets:<sha> ─▶ seed Ring Promoter (int)
                                                                                              │
Ring Promoter ◀───────────────────────────────────────────────────────────────────────────────┘
   └─ dispatches deploy-k3s.yml (TARGET_ENV=int, DEPLOYMENT_TYPE=deploy, IMAGE_TAG=<sha>)
        └─ DNS ─▶ edge ─▶ helm upgrade pintopets (namespace = ring)
              ─▶ RP checks /api/v1/health `version` == <sha>
```

| Step   | Runner                  | What                                                                                        |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------- |
| ring   | GitHub-hosted           | Reads `host:` from `values-<ring>.yaml`; checks the edge spec matches and has a VPN profile |
| check  | GitHub-hosted           | Lint, type-check, unit tests, `helm lint`                                                   |
| dns    | GitHub-hosted           | Creates the Cloudflare CNAME if missing (see above)                                         |
| edge   | self-hosted `pintopets` | Registers `deploy/edge/wslproxy-server-<ring>.json` (idempotent)                            |
| build  | GitHub-hosted           | `Dockerfile` → `linux/amd64`, tags `<short sha>` and `latest`                               |
| seed   | GitHub-hosted           | `POST rp.workstation.co.uk/api/apps/pintopets/seed`, waits for int healthy on the tag       |
| deploy | self-hosted `pintopets` | Checks the tag exists on Docker Hub, `helm upgrade --install --wait`                        |

**One image runs in every ring.** Nothing ring-specific is decided at build time:
the chart sets `APP_ENV`, `APP_URL`, `APP_VERSION` (the image tag) and
`DATABASE_URL` per release.

On every rollout the `migrate` init container runs
`node db/db-tasks.mjs migrate-and-seed`: it waits for Postgres, applies Drizzle
migrations and re-seeds reference data (idempotent). If it fails, the rollout
stops before traffic moves.

### Deploy switch (off by default)

The `dns`, `edge`, `build`, `seed` and `deploy` jobs run only when the repository
variable `PINTOPETS_DEPLOY_ENABLED` is `true`. Delete it, or set it to `false`, to
stop all deploys.

## Secrets

**CI credentials** (repository secrets on `bwalia/pintopets`):

| Secret                                                        | Used by | Notes                                   |
| ------------------------------------------------------------- | ------- | --------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                                        | dns     | Zone:Read + DNS:Edit on `pintopets.app` |
| `WSLPROXY_USERNAME`, `WSLPROXY_PASSWORD`, `WSLPROXY_BASE_URL` | edge    | wslproxy admin API                      |
| `DOCKER_USERNAME`, `DOCKER_PASSWD`                            | build   | Push to `harneetk78/pintopets`          |
| `RP_API_TOKEN`                                                | seed    | Workstation Ring Promoter API token     |
| `KUBE_CONFIG_DATA_K3S`                                        | deploy  | base64 kubeconfig for k3s1              |

**Runtime:**

- Postgres password: generated in-cluster on first install (Secret
  `pintopets-postgres`, kept across upgrades and uninstalls). Nobody needs to
  know it. To rotate: change it in Postgres, update the Secret, restart the pods.
- App secrets (from M2: Google OAuth, Resend, TOTP key, …): WSL Vault at
  `pintopets/<ring>/core`, through External Secrets. Create the Vault path and
  make sure the ESO policy allows `pintopets/*` **before** adding
  `vaultSecrets: { core: pintopets/int/core }` to the values file. A missing path
  keeps the ExternalSecret unready and fails `helm --wait`.

## One-off setup (INT)

1. Self-hosted runner on `bwalia/pintopets` with label `pintopets`, on the
   operator LAN (it must reach the wslproxy admin API and the k3s API). Fork PR
   workflows must require approval for all outside contributors (the repo is
   public).
2. Repository secrets above, then the variable `PINTOPETS_DEPLOY_ENABLED=true`.
3. Ring Promoter app `pintopets` in `bwalia/ring-promoter`
   `deploy/k8s/configmap.yaml` (github deployer → this workflow).
   `RP_GITHUB_TOKEN` must be allowed to dispatch workflows in `bwalia/pintopets`.
4. DNS failover instance `pintopets-app` in `bwalia/diy-tax-return-infra`, applied
   with `ansible-playbook nebuladns-failover.yml`. The Cloudflare token on ns1 and
   ns2 needs DNS:Edit on `pintopets.app`.

Verify from **outside** the VPN (e.g. a phone on mobile data) that
`https://int.pintopets.app` returns the 403 page.

## Health

`GET /api/v1/health` →
`{"status":"ok","version":"<APP_VERSION>","env":"<ring>","checks":{"database":"ok"}}`
(503 when the database is unreachable). Used by the readiness probe and by Ring
Promoter (`health_version_field: version`).
