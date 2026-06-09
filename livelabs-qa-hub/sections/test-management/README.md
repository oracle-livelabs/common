# Test Management

Purpose: link the QA Hub to the separate LiveLabs TMS project while keeping the hub focused on operational QA command and evidence.

Current prototype scope:

- QA Hub page points to `http://127.0.0.1:4193`.
- TMS owns requirements, test repository, plans, builds, executions, coverage, defects, and reports.
- QA Hub remains the intake and command surface.

Production direction:

- Promote QA Knowledge Base sources into TMS requirements.
- Attach Watchdog alerts to relevant test cases and executions.
- Use GitHub PR records to request or block release test plans.
- Keep Jira/Xray synchronization read-only until write behavior is explicitly approved.

