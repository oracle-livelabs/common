# Getting Ready to Deliver a LiveLab

## Introduction

This workshop helps a delivery team prepare for a customer-facing Oracle LiveLabs hands-on session. It covers event access, attendee prerequisites, launch timing, presenter roles, and troubleshooting.

A LiveLab can fail even when the lab content is strong. Attendees may arrive without a checked Oracle account. The event code or sandbox path may feel unclear. Provisioning may run long.

The delivery team also needs clear roles before the call starts. Decide who drives, who watches chat, and who answers technical questions before attendees join.

Use this guide to confirm the path, message attendees early, test the launch flow, and give the delivery team one clear runbook.

### Objectives

In this workshop, you will:

- Create and test the LiveLabs event path.
- Choose the attendee access model before the event.
- Run the workshop and test the green-button or launch path.
- Write attendee prerequisites and a preflight email.
- Assign presenter, driver, support, and SME roles.
- Plan the first 5 to 10 minutes of live prep checks.
- Troubleshoot common issues and complete the final readiness checklist.

<!-- Estimated Workshop Time: intentionally not shown in this readiness guide. -->

## TL;DR: Author Quick Guide

Use this section when you need the delivery plan without reading every lab.

### 60-Second Ready Check

- Assign the facilitator, driver, help owner, SME, and event owner.
- Choose one attendee path: event code, green button, or brown button.
- Verify the event URL, code, first screen, attendee count, dates, and help contact.
- For 50+, contact William and LiveLabs. Confirm available space and pre-provision.
- Dry run with the same account, link, network, browser, and launch path.
- Send account, access, network, event-code, first-screen, and support instructions early.
- Record provisioning time. Prepare product context for the wait.
- Complete Lab 5. Choose **Ready**, **Ready with risk**, or **Not ready**.
- Keep Lab 6 open during the event.

### Lab Overview

| Lab | Subject | Ready Signal |
| --- | --- | --- |
| **Lab 1** | Roles, timing, handoffs | Each agenda block has an owner, backup, status, and handoff. |
| **Lab 2** | Event code, access, event size | The team verifies the approved page, access path, and event-size choice. |
| **Lab 3** | Attendee dry run | The selected path works. Every blocker has an owner. |
| **Lab 4** | Attendee prep | Attendees receive one tested path and pre-event support. |
| **Lab 5** | Ready check and go/no-go | Checks are complete or each risk has an owner and fallback. |
| **Lab 6** | Live issue triage | Blocked attendees have support and unresolved issues have proof. |

### Quick Instructions by Lab

- **Lab 1: Build the Runbook**
  - Assign the five delivery roles.
  - Build the run of show.
  - Write handoffs for setup, presentation, hands-on work, Q&A, and wrap-up.
  - Record the first instructions, help route, and backup owners.
- **Lab 2: Request the Event Code and Choose Access**
  - Confirm the workshop ID, publish type, dates, time zone, links, and owner.
  - Choose one green-button or brown-button path.
  - Include only credentials the workshop needs.
  - Add an app user only for a required demo app.
  - For 50+, contact William and LiveLabs. Pre-provision the lab spaces.
- **Lab 3: Run the Attendee Dry Run**
  - Use a clean browser and the attendee URL.
  - Run every required workshop step.
  - Test booking, credentials, region, OCI scope, Secure Desktop, and the first screen.
  - Record provisioning time and report broken content with proof.
- **Lab 4: Prepare Attendees**
  - Cover account setup, email verification, sign-in, event URL, and event code.
  - Include the network check, selected path, first screen, and support contact.
  - Send the completed preflight message before event day.
- **Lab 5: Confirm Live Readiness**
  - Confirm Lab 4 is complete.
  - Verify access, capacity, provisioning, network, roles, support, and fallback.
  - Use the printable checklist when needed.
  - Choose **Ready**, **Ready with risk**, or **Not ready**.
- **Lab 6: Triage Live Issues**
  - Fix shared blockers once for the group.
  - Move individual blockers to chat or breakout help.
  - Capture the URL, screen, error, lab/task/step, screenshot, and actions tried.
  - Assign an owner to every unresolved issue.

### Access-Path Decision

| Path | Choose When | Verify |
| --- | --- | --- |
| **Green button** | Oracle-managed environment | Booking, credentials, event size, provisioning, first screen |
| **Brown button** | Customer OCI tenancy | Region, OCI scope, policies, quotas, credentials, first screen |

Give attendees one supported path. Put it in the invitation and runbook.

### Event Size and Lab Start Choice

![Event-size and provisioning decision](../lab-2-request-livelabs-event-code/images/event-size-decision.svg " ")

- **Under 50, ready before the event:** verify available space, credentials, ready time, and first screen.
- **Under 50, live booking:** reserve first. Present product context while environments build.
- **50 or more:** contact William and LiveLabs. Confirm available space and pre-provision.

### Event-Day Timing Pattern

For a 9:00 AM live-booking event:

- **9:00-9:10:** attendees sign in, connect, and reserve.
- **During provisioning:** present goals, architecture, customer context, credentials, and the next screen.
- **When ready:** confirm the first screen, then begin hands-on work.
- **Individual blockers:** use chat, breakout help, or watch-only mode.

### Stop and Escalate

Do not declare the event ready when:

- The event code opens the wrong workshop.
- The launch path differs from the dry run.
- The green button opens the wrong environment.
- LiveLabs has not confirmed space for 50+ attendees.
- Network, browser, or Secure Desktop needs remain unknown.
- A delivery role, fallback, or support owner is missing.
- Broken content has no workaround or proof.
## Acknowledgements

- **Author:** Oracle LiveLabs Team, July 2026