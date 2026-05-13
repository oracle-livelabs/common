# Manifest Variants

Every LiveStack guide must include `desktop`, `sandbox`, and `tenancy` workshop variants.

## Common Rules

Each manifest must include:

- `workshoptitle`
- `help`
- `tutorials`

Local tutorial paths must resolve within the guide folder. The local scene refs in every manifest must exactly match the scene labs on disk.

Required local refs:

- `../../introduction/introduction.md`
- every `../../scene-*/scene-*.md`
- `../../conclusion/conclusion.md`
- `../../download-livestack/download-livestack.md`

`Need Help?` should point to a common LiveLabs help lab.

## Desktop

Use the desktop variant for a local or downloaded LiveStack runbook. Recommended order:

1. Introduction
2. Download and run the LiveStack
3. scene labs
4. Conclusion
5. Need Help?

## Sandbox

Use the sandbox variant for LiveLabs-hosted access. Recommended order:

1. Get Started
2. Introduction
3. scene labs
4. Conclusion
5. Take it home
6. Need Help?

## Tenancy

Use the tenancy variant for cloud tenancy access. Recommended order:

1. Introduction
2. Get Started
3. scene labs
4. Conclusion
5. Download the LiveStack
6. Need Help?
