# Local authentication and administration review

Run the review application without installing dependencies:

```powershell
node .\server.mjs
```

It listens only on `http://127.0.0.1:4179/`. The dashboard remains available at
`/dashboard/`; the local review page provides a session, preference persistence,
role checks, an admin user list, and create/suspend/delete user operations.

Use `admin@local.test` to exercise the administrator path or
`viewer@local.test` for a standard-user path. These are selector-only test
identities, not passwords or a deployable login method.

The local adapter persists to `.local/review-state.json`, which is ignored by
Git. It is an integration stand-in for the prepared ADB principal, role,
preference, and audit model. Production cutover requires a configured OIDC
issuer, successful OCI/ADB read-only preflight, approved schema application,
and a backend service identity; never publish this local selector server.
