# Manifest Variants

Every LiveStack guide must include a sandbox workshop variant. Desktop and tenancy variants are required when the guide includes a portable download/run lab or cloud-tenancy flow.

## Common Rules

Each manifest must include:

- `workshoptitle`
- `help`
- `tutorials`

Every local tutorial filename must resolve from its `workshops/<variant>/` folder. Local scene refs in each manifest must exactly match the scene labs on disk.

Required local refs for every manifest:

- `../../introduction/introduction.md`
- every `../../scene-*/scene-*.md`

Required when present on disk:

- `../../download-livestack/download-livestack.md`
- `../../conclusion/conclusion.md`

`Need Help?` should point to a common LiveLabs help lab. External LiveLabs cloud-login labs are allowed as variant-specific first steps.

## Sandbox

Use sandbox for LiveLabs-hosted access. Recommended order:

1. Get Started
2. Introduction
3. scene labs in scene-number order
4. Take it home when `download-livestack` exists
5. Need Help?

## Desktop

Use desktop for local or downloaded LiveStack runbooks. Recommended order:

1. Introduction
2. Download and Run the LiveStack when `download-livestack` exists
3. scene labs in scene-number order
4. Conclusion when present
5. Need Help?

## Tenancy

Use tenancy for cloud tenancy access. Recommended order:

1. Introduction
2. Get Started
3. scene labs in scene-number order
4. Download the LiveStack when `download-livestack` exists
5. Conclusion when present
6. Need Help?
