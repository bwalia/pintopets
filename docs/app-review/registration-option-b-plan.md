# Registration (Option B): email sign-up on the OpsAPI hosted page, PintoPets only

Status: **implemented and tested locally, not committed, not deployed.** Worktree
`~/projects/opsapi-wt-pintopets-signup`, branch `feature/pintopets-hosted-signup` (from
origin/main 892ccbf4). `~/projects/opsapi` (`fix/designer-align-grid-lines` and its uncommitted
files) was not touched.

Built as planned, with these settled decisions: one full-name field, Cloudflare Turnstile plus a
honeypot and a minimum-fill-time token, the existing email-code sender, accounts inactive until
the code is entered, and clean-up of unverified accounts after 7 days. Two changes from the
first draft: it reuses the platform's existing Turnstile keys (`TURNSTILE_SITE_KEY` /
`TURNSTILE_SECRET_KEY`, as OpsAPI Forms does) instead of new ones, and new accounts join the
workspace OpsAPI already uses for self sign-ups (`SIGNUP_NAMESPACE_SLUG` when `PROJECT_CODE` is
`all`), like `/api/v2/register` and Google sign-up.

## What OpsAPI has today (inspected, not assumed)

| Capability         | Where                                                         | State                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account creation   | `lapis/routes/register.lua`, `POST /api/v2/register` (public) | Works. Returns a JWT **immediately, with no email verification**. Password must be 12+ characters                                                                       |
| Email verification | `/auth/verify-email` and `/auth/resend-verification`          | Listed as public routes in `app.lua:339`, but **no handler exists**. No `email_verified` column on users                                                                |
| Email codes        | `lapis/helper/otp.lua` (used by sign-in 2FA)                  | Works: 6 digits, 5-minute expiry, 5 attempts, stored as an HMAC, per-user send/fail throttles, branded email via `helper.mail`, short-lived session token between steps |
| Hosted page        | `lapis/lib/hosted-signin.lua`                                 | Has a sign-in form **and a "Check your email → Code → Verify" screen**. Modes: signin, signout, error. `providers=password` already used by PintoPets                   |
| Account switch     | users `active` flag (`queries/UserQueries.lua`)               | Exists, so an unverified account can stay inactive                                                                                                                      |

Conclusion: verification can reuse the 2FA email-code machinery and its screen. Nothing new is
needed for sending mail, code storage or throttling.

## Design

1. **Only for PintoPets:** the "Create an account" link appears on the hosted page only when
   the request carries `signup=1` **and** `frontend_url`'s host is in a new env allowlist
   `HOSTED_SIGNUP_HOSTS` (prod: `pintopets.app`; int: `int.pintopets.app`). Every other app
   sees the page exactly as today.
2. **`POST /auth/signup`** (hosted page, public, throttled per IP and per email):
   - inputs: name, email, password (12+), `accepted_terms=true`;
   - if the email belongs to an **active** account, return "You already have an account, please
     sign in" (no new account, no information about whether it's verified);
   - if it belongs to an **unverified** account, change nothing and say "sign in with the
     password you chose and we'll send a new code" (updating the password here would let anyone
     take over someone else's pending sign-up);
   - otherwise create the user with `active = false`, send a code with
     `OTP.sendToEmail(user, { app_name = "PintoPets", support_email = … })`, and return
     `{ requires_verification, session_token, email }`.
3. **`POST /auth/signup/verify`** `{ session_token, code }`: `OTP.verify`, then set
   `active = true`, assign the PintoPets namespace (same helper `register.lua` uses), and issue
   the normal login token. The hosted page then calls the existing `back(token)` and PintoPets
   signs in as usual (web cookie or iOS PKCE code). **No iOS change is needed**: the app's
   "Sign in or create an account" already opens this page.
4. **Resend:** reuse `/auth/2fa/resend` semantics with the signup session token.
5. **Sign-in by unverified accounts:** refused with "Please finish creating your account. We've
   sent you a new code", followed by the code screen.
6. **Clean-up:** a daily job deletes accounts with `active = false` that were created by signup
   more than 7 days ago and never verified.
7. **PintoPets web:** `apps/web/src/app/auth/signin/route.ts` adds `signup=1`. Page copy states
   the terms and privacy links (pintopets.app/terms, /privacy).

## Tests

- OpsAPI busted specs (beside `spec/hosted-signin_spec.lua`):
  - the link is hidden without the allowlist or `signup=1`;
  - signup creates an inactive user and sends a code;
  - a wrong code is counted and an expired code refused;
  - verify activates the user and returns the token;
  - an existing active email is refused;
  - an unverified account can't log in;
  - throttles apply.
- Local end to end: OpsAPI in Docker with `E2E_OTP_PEEK_ENABLED=true` (test-only), PintoPets
  Playwright: sign up → code from `/auth/e2e/peek-otp` → land signed in. Then the same in the
  iOS simulator.

## Rollout (each step needs separate approval)

1. OpsAPI PR from the worktree, then CI.
2. Deploy OpsAPI to **int**, then set `HOSTED_SIGNUP_HOSTS=int.pintopets.app`, then deploy
   PintoPets web to int, then test on a phone against int.
3. Deploy OpsAPI to **prod** (shared by every app). The change is inert unless the allowlist
   is set. Then set `HOSTED_SIGNUP_HOSTS=pintopets.app`, then deploy PintoPets web to prod.
4. Record sign-up in the App Review recording.

## Open questions for the owner

- **Email delivery:** which mail transport prod OpsAPI uses (`helper.mail`), and is it good
  enough for consumer sign-ups (deliverability, SPF/DKIM for the sender domain)?
- **Abuse protection:** add a CAPTCHA now, or rely on throttles plus email verification for
  launch?
- **Name field:** one display name, or first and last name (register.lua stores both)?
- **Unverified accounts:** is 7-day clean-up acceptable?
