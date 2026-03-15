# OCI Secure Desktops

## Overview

An **OCI Secure Desktop** is a browser-accessible remote desktop environment that allows participants to access LiveLabs workshops from within a secure, controlled environment.

Secure Desktops are primarily used for workshop participants joining from **corporate-managed laptops** where security policies restrict access to certain websites, protocols, or tools required by LiveLabs labs.

Many organizations, especially in **government, finance, and healthcare** restrict:

* Access to **HTTP (non-secure) websites**
* Certain downloads or executables
* Remote visualization tools such as **noVNC**
* External lab environments

Secure Desktops provide a **secure HTTPS-based remote desktop** that participants can access from their browser. From inside this desktop environment, they can then access LiveLabs normally.

In effect, the Secure Desktop acts as a **secure jump environment** for running workshops.

## Task 1: When to Use Secure Desktops

Secure Desktops are recommended when workshop participants may be using **restricted corporate laptops**.

Common indicators include:

* Participants cannot access workshop environments
* noVNC sessions fail to load
* Corporate firewalls block lab resources
* Browser security warnings appear due to non-HTTPS services

This commonly occurs for participants from:

* Government agencies
* Financial institutions
* Healthcare organizations
* Highly regulated enterprise environments

If participants cannot access the workshop normally, Secure Desktops can provide an alternative access path.

## Task 2: Testing Before an Event (Recommended)

Before enabling Secure Desktops for a large event, it is recommended to **test access two days before the event** with at least one to two participants from the target organization.

Suggested testing process:

1. Ask participants to open the **standard workshop environment** from their corporate laptop.
2. If access fails due to security restrictions, test access using a **Secure Desktop**.
3. Confirm that the participant can:

   * Launch the Secure Desktop
   * Log in successfully
   * Access the LiveLabs workshop from inside the desktop
   * Enable pop-ups

If the Secure Desktop works while the standard environment does not, then Secure Desktops should be enabled for the event.

* [Follow the steps in support document for a more thorough guide on how to test and access your LiveLabs workshop within an OCI secure desktop environment](https://oracle-livelabs.github.io/common/labs/testing-access/workshops/desktop/index.html?lab=livelabs-sandbox)

> **Note:** For larger events (for example **100+ participants**), testing multiple time in advance helps avoid access issues during the workshop.



