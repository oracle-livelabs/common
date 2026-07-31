# Alpha Migrations

These scripts are ordered ADB alpha changes.

They are review and rehearsal assets. Do not treat them as final deployment evidence.

## Rules

- Run in order.
- Keep the `A###__alpha_` prefix until live evidence exists.
- Keep `release_channel = 'ALPHA'` in change-log metadata.
- Do not put passwords, wallets, or `.env` values in migration files.
- Run gated `.template.sql` files only after their approvals are recorded.
- Use `A008` and later to rehearse manual changes, WMS watermarks, merge conflict handling, and DBA validation before any production naming.
- Do not promote an Object Storage export while open rejects, pending manual changes, or open merge conflicts exist.
