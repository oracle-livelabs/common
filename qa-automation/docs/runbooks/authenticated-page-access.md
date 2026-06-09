# Authenticated Page Access

Use this runbook when a LiveLabs page returns an SSO/SAML/login shell unless the browser already has an approved authenticated session.

## Access Pattern

Preferred order:

1. Use a non-production or QA LiveLabs environment with a dedicated automation identity.
2. Reuse a Playwright storage-state file created by an approved login flow.
3. If storage state is too brittle for CI, ask the application team for a test-only session bootstrap endpoint that accepts a short-lived bearer token, sets the normal application session cookie, and redirects or allows navigation to the target page.

Do not rely on a copied `session=` URL parameter. Treat those URLs as temporary browser state, not a durable automation credential.

## What To Request

Ask the LiveLabs application owner, identity owner, or platform security owner for:

- A stable QA or test base URL for the private page.
- A dedicated automation user or group membership that has the same role as the intended test persona.
- Confirmation whether the app uses Oracle SSO/SAML, OpenID Connect, or another identity flow.
- A permitted way to create a browser session for automation:
  - storage-state capture from an approved interactive login; or
  - a test-only session bootstrap endpoint protected by short-lived tokens.
- Token contract, if a bootstrap endpoint is approved:
  - endpoint URL;
  - required header, normally `Authorization: Bearer <token>`;
  - token issuer, audience, scope, TTL, and rotation owner;
  - whether the endpoint returns `Set-Cookie` for the LiveLabs domain;
  - redirect behavior after bootstrap;
  - network/IP allowlist requirements.
- Test data setup/reset access, preferably through documented ORDS or application APIs.
- CI secret names, expiry policy, and who owns refresh when the tests run outside a developer laptop.

## Framework Variables

Use storage state when an approved login can be captured:

```powershell
$env:QA_STORAGE_STATE="playwright\.auth\livelabs-auth.json"
$env:QA_AUTH_TARGET_URL="https://livelabs.oracle.com/ords/r/dbpm/<app-alias>/home"
$env:QA_AUTH_READY_TEXT="<text visible only after auth>"
node .\scripts\qa.mjs tests\platform\auth\privatePageAccess.spec.ts --tag auth
```

Use a bootstrap endpoint when the app team provides one:

```powershell
$env:QA_AUTH_TARGET_URL="https://livelabs.oracle.com/ords/r/dbpm/<app-alias>/home"
$env:QA_AUTH_READY_TEXT="<text visible only after auth>"
$env:QA_AUTH_BOOTSTRAP_URL="https://<approved-test-endpoint>/automation/session"
$env:QA_AUTH_BOOTSTRAP_TOKEN="<short-lived secret from your secret store>"
node .\scripts\qa.mjs tests\platform\auth\privatePageAccess.spec.ts --tag auth
```

The token must come from a local secret store or CI secret. Do not commit it, print it, or pass it through a command-line flag.

## Capturing Storage State

When storage-state capture is approved, keep the file under an ignored folder:

```powershell
New-Item -ItemType Directory -Force -Path .\playwright\.auth
node .\scripts\qa.mjs playwright codegen --save-storage=playwright/.auth/livelabs-auth.json "https://livelabs.oracle.com/ords/r/dbpm/<app-alias>/home"
```

Sign in in the browser window, confirm the private page loads, then close codegen. Use that file with `QA_STORAGE_STATE` for the auth lane.

## Validation

Run the auth lane in collection mode first:

```powershell
node .\scripts\qa.mjs tests\platform\auth --collect-only
```

Then run the mock private-page smoke:

```powershell
node .\scripts\qa.mjs tests\platform\auth\privatePageAccess.spec.ts --tag auth
```

The mock checks that the target returns below HTTP 500 and does not still look like an authentication fallback. Set `QA_AUTH_READY_TEXT` for a stronger assertion once the private page content is known.
