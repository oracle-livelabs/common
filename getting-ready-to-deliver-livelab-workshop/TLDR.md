# Getting Ready to Deliver a LiveLab: TL;DR

## Introduction

Use this author quick reference to prepare a customer-facing LiveLabs session without rereading the entire guide.

### Objectives

In this quick reference, you will:

- Confirm the minimum delivery path.
- Find the detailed lab for each decision.
- Identify conditions that require escalation before the event.

<!-- Estimated Time: intentionally not shown in this readiness guide. -->
Use this page as the delivery-team quick reference. Complete it before a customer-facing LiveLabs session, then use the detailed labs only when you need instructions or troubleshooting.

## The Minimum Successful Path

1. **Name the team.** Assign a lead facilitator, screen driver, chat/support owner, technical SME, and event coordinator. Put the handoff lines and support route in the runbook.
2. **Choose one attendee path.** Use the event-code page, the green-button LiveLabs Sandbox, or the brown-button customer tenancy. Put only that path in the invite and dry run it in a clean browser.
3. **Request and verify the event.** In WMS, confirm the workshop, dates, time zone, participant window, capacity, and links. Test the approved event-code URL before sharing it.
4. **Prepare accounts and prerequisites.** Attendees create or confirm an Oracle account, verify email, sign in, open the event link, and confirm the expected first screen before event day.
5. **Plan capacity and time.** For 50 or more attendees, coordinate capacity and pre-provisioning with William and the LiveLabs team. If reservations happen live, reserve first and use the buffer to present product context while environments build.
6. **Dry run as an attendee.** Test the selected launch path, credentials, booking, timing, network, browser, Secure Desktop need, and workshop steps. Capture the first ready screen and every blocker.
7. **Run a go/no-go check.** Confirm the URL, event code, access path, roles, attendee preflight, support route, and fallback. Print Lab 5 if the team needs a paper checklist.
8. **Keep the session moving.** Fix shared blockers once. Route individual blockers to chat or breakout support. Record broken content and report it with screenshots, exact URLs, and steps tried.

## Green Button and Brown Button

| Choice | Use It When | Author Must Verify |
| --- | --- | --- |
| **Green button: LiveLabs Sandbox** | Attendees need an Oracle-provided managed environment. | Booking or reservation, expected credentials, launch, provisioning time, first ready screen, and capacity. |
| **Brown button: Run on your own tenancy** | Attendees use an approved OCI tenancy. | Tenancy, region, compartment, policies, quotas, and the first OCI or APEX screen. |

Do not ask attendees to choose between these paths during the event. State the selected path in the invite and show the expected first screen.

## Event-Size Decision

![Event-size and provisioning decision](./lab-2-request-livelabs-event-code/images/event-size-decision.svg " ")

- **Under 50:** use a verified pre-provisioned environment or a tested live-reservation plan.
- **50 or more:** contact William and the LiveLabs team, confirm capacity, and pre-provision. Do not plan live reservations.

## Event-Day Timing Pattern

For a 9:00 AM start with live reservations, use the first 10 minutes for sign-in, connection, and reservation. Present prerequisites and product context while environments build. Start hands-on work after the required environment is ready.

## Stop and Escalate Before the Event

- The event code opens the wrong workshop or the green button does not launch the expected environment.
- The access path differs from the dry run.
- Capacity is unconfirmed for 50 or more participants.
- WiFi, network reachability, browser, or Secure Desktop requirements are unknown.
- The owner for support, broken content, or customer follow-up is missing.

## Resource Map

| Need | Open This Guide Section |
| --- | --- |
| Roles, handoffs, and event timing | [Lab 1: Build the Facilitation Runbook](./workshops/tenancy/index.html?lab=lab-1-build-facilitation-runbook) |
| Event code, accounts, access path, capacity, and reservation timing | [Lab 2: Request a LiveLabs Event Code](./workshops/tenancy/index.html?lab=lab-2-request-livelabs-event-code) |
| Attendee dry run and launch testing | [Lab 3: Run the Workshop and Test the Green-Button Path](./workshops/tenancy/index.html?lab=lab-3-run-workshop-test-green-button-path) |
| Attendee checklist and preflight email | [Lab 4: Send Attendee Preflight Prerequisites](./workshops/tenancy/index.html?lab=lab-4-send-attendee-preflight-prerequisites) |
| Printable readiness and go/no-go check | [Lab 5: Run Live Prep Checks](./workshops/tenancy/index.html?lab=lab-5-run-live-prep-checks) |
| Live issue triage and evidence collection | [Lab 6: How to Troubleshoot Common Issues](./workshops/tenancy/index.html?lab=lab-6-how-to-troubleshoot-common-issues) |
| Blank owner, time, backup, and status fields | [One-page facilitator run-of-show template](./workshops/tenancy/index.html?lab=facilitator-run-of-show-template) |

## What to Record

Keep these details in the runbook: event-code URL, selected access path, expected first screen, event and support contacts, capacity decision, provisioning estimate, backup plan, workshop owner, and evidence for any unresolved issue.

## Acknowledgements

- **Author:** Oracle LiveLabs Team, July 2026