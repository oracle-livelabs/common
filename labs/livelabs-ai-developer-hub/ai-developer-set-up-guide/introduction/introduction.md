# AI Developer Setup Guide

## Introduction

This workshop prepares an AI developer computer for Oracle LiveStacks training. You will install Codex, add reusable Codex skills, and use LiveStacks Orchestrator with Podman to generate and run a local Oracle-first demo. You can also run a supplied zip on an OCI Compute instance when the instructor provides a prebuilt package.

The path is intentionally short. Codex is the foundation, skills add repeatable workflows, and Podman runs the generated app containers locally.

![AI Developer setup path](images/ai-developer-setup-overview.svg)

### Objectives

In this workshop, you will:

- Install and configure Codex for hands-on training work.
- Install Codex skills from the shared Oracle skill bundle.
- Verify that Codex can find and use the installed skills.
- Install or verify Podman Desktop and Compose.
- Use LiveStacks Orchestrator to generate a demo from a business prompt.
- Build and run the generated stack locally.
- Optionally install Podman on OCI Compute and run a supplied zip.

### Prerequisites

- A macOS or Windows computer where you can install apps.
- Optional: access to an OCI tenancy where you can create a VCN, public subnet, security rules, and Oracle Linux Compute VM.
- Oracle network access and Oracle SSO for internal resources.
- Access to the LiveLabs AI Developer skill bundle in the shared Oracle folder.
- Enough free disk space for Podman Desktop, the Podman machine, and generated containers. Plan for about 35 GB free before creating the Podman machine.
- A team-approved OpenAI or Oracle sign-in path for Codex. Do not paste API keys into shared files, screenshots, or workshop artifacts.

Estimated Workshop Time: 105 minutes

## Lab outline

1. **Lab 1: Install and Configure Codex** - Install Codex Desktop, choose a workspace, apply the training config, and restart Codex.
2. **Lab 2: Install and Test Codex Skills** - Download skill zips from the shared Oracle folder, copy them into the Codex skills directory, restart Codex, and confirm the skills load.
3. **Lab 3: Generate and Run a LiveStack Demo** - Install or verify Podman Desktop, use LiveStacks Orchestrator to generate a demo, build the stack, open the running app, and optionally run a supplied zip on OCI Compute.

## Acknowledgements

* **Author** - Oracle LiveLabs AI Developer Team
* **Last Updated By/Date** - Oracle LiveLabs AI Developer Team, May 2026
