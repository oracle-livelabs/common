# GitHub Intake

Purpose: track repository-driven QA work, including pull requests, issues, validation logs, review history, and source links.

Current prototype scope:

- Local seeded PR, issue, and log records.
- Admin-only local intake form.
- Review history displayed as operational evidence.
- No GitHub API calls or credentials.

Production direction:

- Start with read-only GitHub or exported PR data.
- Normalize PR, issue, commit, run, and review history into QA evidence records.
- Link repeated failures to QA Watchdog and TMS execution evidence.

