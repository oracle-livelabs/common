# Oracle JET UI Rules

## Official sources to verify when current behavior matters

- Oracle JET GitHub repo: `https://github.com/oracle/oraclejet`
- Oracle JET cookbook: `https://www.oracle.com/webfolder/technetwork/jet/jetCookbook.html`
- Supporting source: bundled Oracle JET notes maintained with this skill snapshot

Use the bundled rules for normal guidance. Re-check the official sources whenever component availability, APIs, or release-specific details could have changed.

## What Oracle JET means here

- Oracle JET is Oracle's modular JavaScript Extension Toolkit for client-side applications.
- Redwood is the standard Oracle JET theme and the default for new JET apps.
- Modern JET app UI should prefer Core Pack components with the `oj-c-*` prefix when suitable.
- Legacy `oj-*` components remain valid when no Core Pack equivalent exists or compatibility matters.
- Oracle JET's current architecture includes the virtual-DOM and Preact path; older MVVM-era infrastructure also still exists.
- Oracle JET styling means the frontend uses Oracle JET components, the Redwood theme, JET typography/font variables, Oracle Sans, and JET glyph/icon classes for app chrome.

At the April 21, 2026 review point, the public repo published `20.0.0`. Do not hardcode that version. Verify the current release when version-sensitive behavior matters.

## Practical creation rules

- Treat Oracle JET as the primary component vocabulary for Oracle app UI.
- Mirror official cookbook patterns for forms, controls, collections, layout, navigation, and visualizations.
- Use documented theme variables, public classes, and supported styling hooks rather than overriding internal component structure.
- Use Oracle JET typography/font variables such as the JET HTML font family and Redwood theme text tokens. Keep Oracle Sans as the app font family fallback and bundle source when the generated app needs explicit font assets.
- Do not use Tailwind. Tailwind config files, `tailwindcss` dependencies, `@tailwind` directives, and utility-first class systems are non-compliant with this app UI lane.
- When building a custom Redwood masthead or hero banner, prefer your own semantic wrapper/title classes over Oracle JET shell helper classes unless you are intentionally reproducing the stock JET shell pattern.
- Use real image markup for logos and brand marks. Avoid CSS `content`-based image hacks because they are brittle across browsers, zoom modes, and responsive states.
- Keep default Redwood/JET surface geometry rectangular and restrained. If the user has not explicitly requested rounded geometry, avoid large-radius cards, pill chips, capsule badges, over-rounded buttons, and other soft, highly curved shapes.
- Keep Redwood app UI backgrounds clean and functional. Avoid decorative flares, glow blooms, viewport-corner light effects, abstract atmosphere layers, and gratuitous radial gradients unless the user explicitly requests that mood.
- For dark custom regions, prefer Oracle JET's contrasting-background model: set the dark surface explicitly, then use `oj-color-invert` for inverted foreground behavior and `oj-contrast-marker` where supported components need the contrasting-background marker.
- Do not trust hand-picked dark-region colors just because they look fine. Verify rendered contrast on the actual composed background when custom colors or transparency are involved.
- Be careful with semi-transparent or secondary inverted text on custom brand-color headers. A token that is safe in a stock JET dark shell may drop below target contrast on a different branded dark surface.
- When using `oj-fwk-icon` classes inside buttons or other controls, verify that the icon color matches the control foreground. If needed, force icon color inheritance instead of leaving framework icons on their default dark tone.
- Use JET glyph/icon classes such as `oj-ux-ico-*` for sidebar navigation, buttons, titles, status indicators, dataset actions, and Oracle Internals. Avoid hand-drawn SVGs for control chrome when a JET glyph exists.
- For logos or brand marks placed on dark custom headers, verify the mark itself remains legible. If the source asset is dark-on-transparent, use a light-on-dark asset variant or an equivalent readable treatment; do not assume adjacent white text is enough.
- Keep the UI recognizably Redwood and Oracle JET rather than generic Tailwind, Material, Ant, or other design-system output.
- If a user explicitly requests another stack, apply Redwood styling where possible but state that full Oracle JET compatibility is not met unless the controls and interactions map back to JET expectations.

## Shell and masthead guardrails

- Oracle JET app-shell classes can encode specific shell assumptions. Example: some shell title classes carry metrics that are safe in the stock shell but unsafe in custom hero/masthead compositions.
- Do not assume a visually harmless class is metrically harmless. Check computed `line-height`, element height, and wrapping behavior when mixing JET shell classes with custom branded headers.
- For custom Redwood/JET banners at narrow widths, verify:
  - the logo has a real image source
  - the logo block does not overlap the adjacent text block
  - kicker/title/tagline blocks do not overlap each other
  - the title retains a nonzero computed line-height and height

## Icons and styling

- Oracle JET provides documented icon and styling guidance.
- Framework icon classes exist, but framework icon classes are deprecated.
- Documented icon-color utility classes remain part of the supported styling surface.
- Do not replace JET control icons or navigation glyphs with the Redwood marketing pictogram library.

## Flag as non-compliant

- Generic HTML widgets used where Oracle JET controls should exist
- Non-JET component libraries used for Oracle JET app UI without explicit user exception
- Tailwind config files, `tailwindcss` dependencies, `@tailwind` directives, or utility-first class systems used as the app styling foundation
- Missing Oracle JET typography/font variables or missing Oracle Sans fallback in custom app CSS
- Marketing pictograms used in application chrome, navigation, forms, or data controls
- Hand-rolled SVG control icons used where JET glyphs are available
- Custom CSS that depends on internal component DOM instead of public hooks
- CSS-`content` image hacks used where a semantic logo/image element should exist
- Oracle JET shell typography classes mixed into custom branded headers without verifying their computed metrics
- Dark custom regions built with ad hoc foreground/background choices instead of JET contrast semantics or rendered contrast verification
- Pill/capsule geometry or heavily rounded cards/chips used by default in Redwood app UI work without explicit user request
- Decorative atmospheric effects such as sun flares, glow blooms, abstract blobs, or gratuitous radial gradients in Redwood app UI work without explicit user request
- Redesigns that look like another design system instead of Redwood
