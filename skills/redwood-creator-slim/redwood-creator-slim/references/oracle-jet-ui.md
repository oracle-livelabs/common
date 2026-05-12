# Oracle JET UI Rules

## Official sources to verify when current behavior matters

- Oracle JET GitHub repo: `https://github.com/oracle/oraclejet`
- Oracle JET cookbook: `https://www.oracle.com/webfolder/technetwork/jet/jetCookbook.html`
- Supporting note: extracted into this portable reference file; the original local research note is not bundled.

Use the bundled rules for normal guidance. Re-check the official sources whenever component availability, APIs, or release-specific details could have changed.

## What Oracle JET means here

- Oracle JET is Oracle's modular JavaScript Extension Toolkit for client-side applications.
- Redwood is the standard Oracle JET theme and the default for new JET apps.
- Modern JET app UI should prefer Core Pack components with the `oj-c-*` prefix when suitable.
- Legacy `oj-*` components remain valid when no Core Pack equivalent exists or compatibility matters.
- Oracle JET's current architecture includes the virtual-DOM and Preact path; older MVVM-era infrastructure also still exists.

At the April 21, 2026 review point, the public repo published `20.0.0`. Do not hardcode that version. Verify the current release when version-sensitive behavior matters.

## Practical creation rules

- Treat Oracle JET as the primary component vocabulary for Oracle app UI.
- Mirror official cookbook patterns for forms, controls, collections, layout, navigation, and visualizations.
- Use documented theme variables, public classes, and supported styling hooks rather than overriding internal component structure.
- Keep the UI recognizably Redwood and Oracle JET rather than generic Tailwind, Material, Ant, or other design-system output.
- If a user explicitly requests another stack, apply Redwood styling where possible but state that full Oracle JET compatibility is not met unless the controls and interactions map back to JET expectations.

## Icons and styling

- Oracle JET provides documented icon and styling guidance.
- Framework icon classes exist, but framework icon classes are deprecated.
- Documented icon-color utility classes remain part of the supported styling surface.
- Do not replace JET control icons or navigation glyphs with the Redwood marketing pictogram library.

## Flag as non-compliant

- Generic HTML widgets used where Oracle JET controls should exist
- Non-JET component libraries used for Oracle JET app UI without explicit user exception
- Marketing pictograms used in application chrome, navigation, forms, or data controls
- Custom CSS that depends on internal component DOM instead of public hooks
- Redesigns that look like another design system instead of Redwood
