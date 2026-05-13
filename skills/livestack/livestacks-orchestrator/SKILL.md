---
name: livestacks-orchestrator
description: Orchestrate production-ready LiveStacks solutions from PRDs, working PRDs, or minimal business-first inputs such as industry, pain point, category, Oracle feature mapping, deployment target, and implementation notes. Use when Codex needs to turn a business or industry pain point, PRD, workbook-style brief, or solution concept into a secure, portable, Oracle Database-first LiveStacks application bundle with architecture, data design, ORDS-mediated APIs, container artifacts, implementation guidance, documentation, and customer rebuild instructions.
---

# LiveStacks Orchestrator

Turn a PRD, partial PRD, or sparse business brief into one converged LiveStacks package. When the source input is only a brief, synthesize a compact working PRD before any specialist delegation begins. Prefer installed specialist skills first; if a specialist skill is missing or ambiguous, use the orchestrator's dedicated built-in fallback references and still deliver one production-ready recommendation.

## Quick Start

- Run `python3 scripts/self_update.py --auto --json` from this skill directory before substantial orchestration work. If it reports `"updated": true`, re-read this `SKILL.md` from disk before continuing. If the check skips because GitHub, `git`, or validation is unavailable, continue with the current skill and mention the warning only if it affects the run.
- Accept three input modes: full `PRD`, partial `Merge`, or brief-only `Bootstrap`.
- Require `industry` and `pain_point` for `Bootstrap` mode.
- Accept workbook-style input, bullets, free-form notes, or full PRDs. Normalize them with `references/input-normalization.md`.
- Use `references/golden-core-overlay-contract.md` before shaping the default app/runtime path. Treat `/Users/mkowalik/projects/codey/workspace/livestack-template` as an industry overlay corpus, not as separate raw golden templates.
- Use `references/prd-build-contract.md` whenever you need to preserve a source PRD, merge partial PRD material, or synthesize a working PRD from a brief.
- Persist the raw brief or notes in `input/business-input.md`.
- Persist the source PRD in `input/product-requirements.md`; if no source PRD exists, record that explicitly.
- Create `input/working-prd.md` before the role ledger or specialist wave begins. Mark every inferred item as `Assumption:` until the user or implementation confirms it.
- Start a visible role ledger before detailed work. Use the template in `references/role-playbooks.md`, with `subagent` as the default owner for independent specialist roles.
- If the user invokes or mentions `$livestacks-orchestrator`, treat that as an explicit request to start the delegated specialist team immediately unless the user explicitly asks for no delegation. This is a required orchestration behavior, not an optional speed-up.
- Run `python3 scripts/ensure_oracle_db_skill.py` before specialist discovery when Oracle database guidance may be needed. It installs the bundled `oracle-db-skills` snapshot into `$CODEX_HOME/skills/oracle-db-skills` when the sibling skill is missing.
- Run `python3 scripts/ensure_livestack_guide_builder.py` before specialist discovery or guide authoring when the required `guide/` deliverable is in scope. It installs the bundled `livestack-guide-builder` snapshot into `$CODEX_HOME/skills/livestack-guide-builder` when the sibling skill is missing.
- Run `python3 scripts/ensure_redwood_creator.py` before specialist discovery when app UI is in scope. It installs the bundled `redwood-creator` snapshot into `$CODEX_HOME/skills/redwood-creator` when the sibling skill is missing.
- Run `python3 scripts/discover_specialist_skills.py` from this skill directory to identify matching installed specialist skills.
- When app UI is in scope and `$redwood-creator` is installed, including when it was installed earlier from the bundled snapshot, use it as the Oracle JET / Redwood app UI source of truth for UI/UX and frontend implementation decisions.
- Treat first-iteration app quality as a product requirement: the opening screen must be an interactive operator workflow, not a static welcome page, generic overview dashboard, or scaffold reminder.
- Treat `Upload Your Own Data` as a first-iteration acceptance requirement whenever demo data is replaceable. It must be visible in the first app iteration and wired as a real operator dataset flow, not deferred to documentation.
- Treat the built-in fallbacks for Project Manager, Solution Engineer, Full Stack Developer, and Devil's Advocate as first-class execution modes. Those roles should not degrade into vague placeholders just because no sibling skill is a strong match.
- Keep the skill portable even when sibling specialist skills are missing. For database work, `$oracle-db-skills` is preferred; this skill first tries to install the bundled snapshot and only falls back to the bundled Oracle reference if installation is unavailable or fails.
- Keep the skill portable even when sibling specialist skills are missing. For guide authoring, `$livestack-guide-builder` is preferred; this skill first tries to install the bundled snapshot and only falls back to local guide rules if installation is unavailable or fails.
- Keep the skill portable even when sibling specialist skills are missing. For app UI work, `$redwood-creator` is preferred; this skill first tries to install the bundled snapshot and only falls back to the built-in UI/UX playbook if installation is unavailable or fails.
- Plan for a required sibling `guide/` deliverable. Use `$livestack-guide-builder` when it is installed, including when it was installed earlier from the bundled snapshot.
- When a canonical local LiveStack guide already exists, use it as the structure and cadence baseline for guide authoring, then apply only the solution-specific deltas.
- Treat `$playwright` or `$webapp-testing` as optional screenshot helpers. Prefer them when already installed, but do not auto-install them by default because browser or Node runtime prerequisites vary by machine.
- Run `python3 scripts/validate_livestack_bundle.py <solution-root>` before calling a bundle production-ready. Use it after scaffold markers are cleared to catch cross-file drift in compose, env, docs, guide manifests, screenshot inventory, Oracle-evidence wiring, mock-backed runtime fallbacks, missing automated database bootstrap, and ORDS routes that exist only on paper.
- Run `python3 scripts/grade_livestack_bundle.py <solution-root>` after semantic validation. A bundle only passes when it receives `A+`, the report says `Pass: yes`, and `validation/test-evidence.md` records tests that failed before the change and passed after the change.
- Run `python3 scripts/check_skill_package.py` before sharing, zipping, or embedding this skill. It catches stale version metadata, missing bundled helpers, Python syntax errors, and transient cache or macOS metadata files that should not ship.
- If a skill is a strong match, invoke it explicitly.
- Require subagents for independent specialist roles when the runtime and session policy allow it. Fall back to local role simulation only when subagents are unavailable, the work is too tightly coupled to split cleanly, or the user explicitly asks for no delegation. Record the exception reason in the role ledger.

## Non-Negotiable Guardrails

- Keep Oracle Database 26ai, or the Oracle AI Database Free local variant, as the protagonist of the solution.
- When the brief does not name Oracle capabilities explicitly, use `$oracle-db-skills` to infer the minimum credible Oracle-native feature set from the pain point, workflow, and desired operator experience.
- Do not add Oracle features just for spectacle. Every chosen capability must map to a business need, a visible application scene or operator flow, and an Oracle evidence surface.
- Every production LiveStack should include at least one visible AI capability unless the working PRD explicitly rejects AI for a documented reason. Prefer Oracle AI Vector Search or DBMS_VECTOR/DBMS_VECTOR_CHAIN for semantic matching, search, triage, recommendations, evidence retrieval, and RAG-style assistance. Use Select AI / DBMS_CLOUD_AI only when the app truly needs NL-to-SQL, explain SQL, summarize, translate, chat, or agent workflows.
- For AI features, record `ai_capability_mode`, `provider_boundary`, `data_egress_caveat`, chosen Oracle package or SQL feature, and UI evidence fields in the working PRD before build roles begin. The app must expose those details in Oracle Internals or Database X-Ray.
- Do not expose arbitrary generated SQL execution in the first iteration. NL-to-SQL flows should default to scoped views, deterministic templates or `SHOWSQL` review, read-only SELECT execution, ambiguous-prompt clarification, and blocked DML, DDL, or PL/SQL unless a separately protected operator flow justifies it.
- Treat every generated LiveStack as an external-facing production application by default: fail closed on upstream dependencies, protect destructive/admin routes, externalize secrets, document CORS/HTTPS/token boundaries, and keep `/healthz` tied to real app, ORDS, Oracle, and model readiness where those dependencies are in scope.
- Derive story mode and scene count from workflow complexity and inferred Oracle feature breadth rather than defaulting to one fixed narrative template.
- Default sparse briefs to an `operator_workbench` first iteration unless the working PRD justifies `converged_showcase` or `hybrid`. The first screen must open on a concrete operator job, with a primary CTA that changes state and an Oracle evidence panel that explains the current scene.
- Bundle an installable snapshot of `$oracle-db-skills` inside this skill for portability. When the sibling skill is missing, prefer installing that bundled snapshot into the local skills directory before falling back to the compact Oracle reference.
- Bundle an installable snapshot of `$livestack-guide-builder` inside this skill for portability. When the sibling skill is missing, prefer installing that bundled snapshot into the local skills directory before falling back to local guide rules.
- Bundle an installable snapshot of `$redwood-creator` inside this skill for portability. When the sibling skill is missing, prefer installing that bundled snapshot into the local skills directory before falling back to the built-in UI/UX guidance.
- Keep AI close to the data. Prefer Oracle-native capabilities, PL/SQL package APIs, and ORDS modules before app-side reinvention.
- Route application APIs through ORDS. Direct app-to-database access is acceptable only for bootstrap, migrations, or strictly justified admin paths.
- Unless the user explicitly asks for a prototype or mock, do not ship mock-backed, in-memory, fake-data, or demo-state runtime fallbacks and then call the bundle production-ready.
- If the current brief only supports a prototype, label it clearly as a prototype and record the production gaps. Do not blur that state into the production-ready contract.
- Produce Podman-first, portable container artifacts for compose-based deployment across hyperscalers and on-prem environments.
- Treat baseline runtime services as `db`, `ords`, `app`, and `ollama`. Default to the newer four-service contract with bootstrap work embedded inside those services rather than separate `ords-bootstrap`, `ollama-bootstrap`, or `init-brain` sidecars unless the user explicitly requires an exception.
- Treat host-side Ollama bootstrap scripts as fallback or pre-seed tools, not as the default happy-path startup contract. For the normal local-run flow, prefer `podman compose up -d --build` and let the stack warm models internally when the solution uses the four-service contract.
- The normal startup path must also bring the Oracle schema and ORDS layer into a usable state automatically. Do not require a manual post-start `sqlplus`, `sqlcl`, Liquibase, or ad hoc SQL apply step after `podman compose up -d --build`.
- If the bundle ships ORDS SQL or package APIs, the runtime app must actually proxy or call those ORDS routes. It is not enough to mention `ORDS_BASE_URL` in env files, health payloads, or placeholder copy.
- Treat direct app-to-database runtime access as an exception, not an alternate architecture. If used for bootstrap, migrations, readiness, or admin tasks, document the exception and keep normal business APIs ORDS-first.
- For Podman LiveStacks, make `compose.yml` follow the neutral golden LiveStack core contract: use hard-coded published ports in the compose file rather than env-overridable port mappings, declare top-level `networks.default`, and give every service an explicit `hostname` plus matching `networks.default.aliases` entry.
- Treat `stack/compose.yml` and `stack/.env.example` as invariant golden-core files for default generated LiveStacks. They must match the baseline assets under `assets/templates/golden-livestack-baseline/`; do not customize them with industry names, app image names, schema names, ORDS module names, story labels, or customer-specific values.
- Keep the default published ports fixed unless the user explicitly requires an exception: `db` `1521:1521`, `ords` `8181:8080`, `ollama` `11434:11434`, and `app` `8505:3001`.
- Keep published port numbers in `compose.yml`, not in `.env` or `.env.example`. Do not generate `APP_PORT`, `DB_PORT`, `ORDS_PORT`, or `OLLAMA_PORT` in the default LiveStacks env surface.
- Use the canonical ORDS config bind mount `./ords-config:/etc/ords/config:Z,U` so generated stacks remain SELinux-friendly and portable under Podman, including Oracle Linux 9 hosts.
- Treat `$redwood-creator` as the default UI system owner for LiveStacks app surfaces. Generated applications must use Oracle JET framework patterns, the Oracle JET Redwood theme, Oracle JET typography/font variables backed by Oracle Sans, documented Redwood colors, JET-compliant controls, and Oracle JET glyph/icon classes for navigation, sidebar entries, buttons, titles, status, dataset actions, and Oracle Internals. Do not use Redwood marketing pictograms in app chrome or navigation.
- Do not use Tailwind or utility-first replacement styling in generated LiveStacks. Tailwind config files, `tailwindcss` dependencies, `@tailwind` directives, and Tailwind-style class systems are non-compliant unless the user explicitly changes this contract.
- Keep Redwood app UI geometry restrained: default to rectangular surfaces with minimal corner radii, structural backgrounds, and no decorative flares, glow blooms, or gratuitous radial-gradient atmosphere unless the user explicitly asks for them.
- Treat polished premium Redwood/JET UI as a first-iteration acceptance criterion, not a later styling pass. The first generated app surface should be credible for an Oracle customer walkthrough before screenshots or guide authoring begin.
- Make the app service actually listen on `3001` inside the container when using the default LiveStack app contract, and align the `Containerfile`, startup command, healthcheck, docs, and API examples to that same port instead of only changing the host mapping.
- When no target app framework is specified, start from the neutral golden LiveStack core and apply overlays for industry vocabulary, pain-point workflow, story scenes, Oracle capability mapping, data/import contract, and guide/runbook content. The default runtime remains one Node.js / Express app service that serves a built Oracle JET / Redwood frontend shell from the same `app` container while honoring the fixed port, ORDS-first, and Oracle-evidence requirements. The default frontend must not include Tailwind.
- If the user explicitly asks for another app stack such as Flask, FastAPI, ASP.NET, or another web framework, use that requested stack instead of the default scaffold. Treat the user’s framework choice as sufficient justification as long as the fixed LiveStacks runtime contract is preserved.
- Add optional services such as GoldenGate Free only when the pain point clearly requires them.
- When demo data is meant to be replaceable, include an operator-only dataset administration flow from the golden core: one persistent top-right masthead utility labeled `Upload Your Own Data` that opens an overlay dataset manager, plus template download, validate-only preview, destructive upload or replace, active Oracle-backed dataset state, job status, and restore-demo. Only deviate from that trigger pattern when the user explicitly asks for a different dataset-entry experience.
- Destructive dataset routes such as upload, replace, restore-demo, reseed, and generated admin actions must fail closed behind `ADMIN_TOKEN`, `Authorization`, CSRF, JWT, or an equivalent operator-admin boundary. A visible `Upload Your Own Data` control is incomplete unless the runtime also exposes template, validate, upload, restore-demo validate, restore-demo execute, active dataset state, and job-status routes.
- Never delegate straight from a raw brief. Persist and reconcile source input into `input/working-prd.md` first, even when the user did not provide a PRD.
- Require a sibling `guide/` workshop deliverable authored as a LiveStack demo runbook through `$livestack-guide-builder` when it is installed, or to the same runbook contract when it is not.
- Keep the guide deliverable self-contained in this skill. If `$livestack-guide-builder` is unavailable, first try the bundled-install path and only then fall back to the guide authoring contract shipped inside `$livestacks-orchestrator`.
- Treat `$playwright` and `$webapp-testing` as optional guide-capture helpers rather than mandatory bundled dependencies. Do not auto-install them by default.
- Keep the guide scene-by-scene aligned to the real application and `stack/` runtime behavior. Treat the running app, local compose workflow, and visible scene navigation as source of truth for guide authoring.
- Treat every guide scene lab as a demo runbook: it must explain what is happening in that scene, what the user should interact with, what changes on screen, and what expected outcome or business signal the user should take away.
- When a canonical local LiveStack guide exists, mirror its structure, cadence, and tone for `introduction`, `download-livestack`, scene labs, and `conclusion` before applying solution-specific names, ports, assets, and labels.
- Write scene labs like an application user guide, not a validation memo. Tell the user exactly what to click, what opens, what changes on screen, and what to notice; keep raw API calls as optional verification callouts instead of the main narrative.
- For `guide/download-livestack/download-livestack.md`, derive the downloadable archive name, clean target-directory naming, and extracted folder layout from the actual packaged artifact. If the archive expands directly into the current directory, document that flow and do not invent an extra `stack/` path.
- Use either paired `<copy>` markers before and after a command, or wrapped `<copy> ... </copy>` tags, for actionable command snippets.
- In LiveStack guides, use `## Credits & Build Notes` as the closing section. Do not add `## Acknowledgements` to LiveStack guide labs; if a validator complains, treat that as a profile or validator mismatch to resolve rather than changing the guide contract.
- Require `guide/workshops/desktop`, `guide/workshops/sandbox`, and `guide/workshops/tenancy` for every guide. Accept both paired `<copy>` command markers and wrapped `<copy>...</copy>` command markers.
- Never edit `guide/workshops/*/index.html`. Treat those files as read-only canonical LiveLabs shell files owned by another repo and potentially invoked by external JavaScript. Update manifests and markdown only unless the user explicitly asks to modify the workshop shell itself.
- Capture guide screenshots from the real running app with automated browser tooling, store the capture inventory under `output/guide-screenshots/`, and integrate selected images into `guide/**/images` rather than using mockups or aspirational placeholders.
- Require one app-visible Oracle evidence surface: either a dedicated database X-Ray mode or a scene-aware Oracle Internals experience from the golden core. It must show how Oracle powers the current screen through real ORDS routes, SQL or PL/SQL activity, Oracle feature usage, or request-flow evidence rather than generic marketing copy.
- Converge on one recommended implementation. Do not stop at parallel opinions.
- Use `references/architecture-guardrails.md` before finalizing architecture, data, or deployment choices.
- Use `references/guide-deliverable.md` before finalizing the workshop guide or screenshot capture plan.

## Workflow

1. Classify the input mode as `PRD`, `Merge`, or `Bootstrap`.
2. Persist source material:
   - copy the raw user brief or notes into `input/business-input.md`
   - copy the source PRD into `input/product-requirements.md`, or explicitly state that the run started without a source PRD
3. Normalize the business input into an explicit brief and synthesize `input/working-prd.md` using `references/prd-build-contract.md`.
   - Keep the working PRD compact, execution-oriented, and aligned to the current solution scope.
   - Mark inferred items as `Assumption:`.
   - Do not start subagents until the working PRD is stable enough to serve as the build contract.
   - When the brief does not name Oracle capabilities clearly, use `$oracle-db-skills` to infer candidate database features from the pain point, operator workflow, and desired demo outcome.
   - Narrow the inferred Oracle features to the minimum credible set that keeps Oracle Database 26ai as the engine of the solution.
   - Record the chosen story mode, `scene_count_target`, `primary_user_loop`, `primary_cta_path`, `first_scene_goal`, `first_interaction`, `first_decision_point`, `first_oracle_evidence`, `upload_your_own_data`, `redwood_jet_ui_quality_bar`, `ai_capability_mode`, `provider_boundary`, `data_egress_caveat`, and feature-to-scene mapping in the working PRD before the UI/UX and full-stack roles begin detailed execution.
4. Initialize the role ledger with role, status, skill or fallback mode, key outputs, and open issues.
5. Discover specialist skills:
   - Run `python3 scripts/ensure_oracle_db_skill.py`.
   - Run `python3 scripts/ensure_livestack_guide_builder.py`.
   - Run `python3 scripts/ensure_redwood_creator.py` when app UI is in scope.
   - Run `python3 scripts/discover_specialist_skills.py`.
   - Review confidence and reasons.
   - For database work, always load `$oracle-db-skills` if it is available. If it was missing at session start, the prior ensure step should have installed the bundled snapshot. Only if that install path is unavailable or fails should you load `references/oracle-database-fallback.md` plus `references/architecture-guardrails.md` and continue without blocking the run.
   - For app UI work, always load `$redwood-creator` if it is available. If it was missing at session start, the prior ensure step should have installed the bundled snapshot. Only if that install path is unavailable or fails should you use `references/role-playbooks.md#uiux-developer` as the built-in fallback while keeping the Oracle JET / Redwood app contract intact.
   - For the required `guide/` deliverable, always load `$livestack-guide-builder` if it is available. If it was missing at session start, the prior ensure step should have installed the bundled snapshot. Only if that install path is unavailable or fails should you use the local guide rules in this skill.
   - For each other role, invoke an installed skill only when it materially fits the role and scope. If the match is weak, use the orchestrator's dedicated fallback references from `references/role-playbooks.md` plus the role-specific fallback references rather than treating the role as absent.
   - For automated guide screenshots, prefer installed `$playwright` or `$webapp-testing` when available. Keep them optional rather than auto-installed defaults because local browser and Node prerequisites vary by machine.
6. Required delegated execution:
   - Treat mention of `$livestacks-orchestrator` as explicit delegation permission for this orchestration run.
   - Keep Project Manager and final convergence in the main thread unless there is a strong reason to delegate PM artifacts separately.
   - Immediately spawn the opening role wave only after `input/working-prd.md` exists and the ledger plus skill-discovery pass are ready: Solution Engineer, Database Specialist, UI/UX Developer, Full Stack Developer, Security / Platform Engineer, and Technical Writer / Documentation Lead.
   - Add Devil's Advocate as a sidecar once there is enough concrete direction to challenge, or earlier when the solution is security or portability heavy.
   - Fall back to local execution only for tightly coupled slices, blocking decisions, unavailable subagents, or explicit user opt-out. Record every fallback reason in the role ledger.
7. Drive role work in this order:
   - Project Manager
   - Solution Engineer
   - Database Specialist
   - UI/UX Developer
   - Full Stack Developer
   - Security / Platform Engineer
   - Technical Writer / Documentation Lead
   - Devil's Advocate
8. Reconcile disagreements explicitly. Record the chosen direction and rejected alternatives in the architecture decisions.
9. Materialize the bundle:
   - Use `python3 scripts/init_livestack_bundle.py <output-dir> <solution-slug>` if a workspace folder does not already exist. The scaffold must carry `input/template-provenance.json` and then be adapted from the neutral golden core plus overlays before it can be called production-ready.
   - Record the selected overlay layers in `input/template-provenance.json`: industry vocabulary, pain-point workflow, story scenes, Oracle capability map, data contract, and guide runbook.
   - Replace scaffold placeholders with real content. Do not stop at a skeleton unless the user explicitly asked for one.
   - Keep `input/working-prd.md` as the source of truth for the bundle. If a later clarification changes scope, update the working PRD first and propagate the delta outward.
   - Keep `stack/compose.yml` and `stack/.env.example` byte-for-byte aligned to the neutral golden baseline unless the user explicitly approves a runtime-contract exception. Put domain-specific app/schema/ORDS/story choices in application code, database scripts, seed/config data, docs, guide content, and `input/template-provenance.json` instead.
   - For Podman LiveStacks, make the compose file conform to the canonical networking contract before calling it done: hard-coded published ports, top-level `networks.default`, explicit per-service `hostname`, matching `networks.default.aliases`, the canonical ORDS config bind mount `./ords-config:/etc/ords/config:Z,U`, no `APP_PORT` or `DB_PORT` or `ORDS_PORT` or `OLLAMA_PORT` keys in `.env` or `.env.example`, and app runtime wiring aligned to `8505:3001`.
   - Keep the generated compose syntax portable to Podman on Oracle Linux 9: prefer relative bind mounts, SELinux-safe mount suffixes where needed, and compose features that survive `podman compose config` cleanly.
   - Generate portable host bootstrap wrappers for Ollama model pull and warmup as fallback or pre-seed tools. At minimum, emit a POSIX `sh` script and a PowerShell script that target the published host Ollama endpoint and can be rerun safely, but do not require them for the normal startup path unless the user explicitly wants that contract.
   - Ensure the normal `podman compose up -d --build` path includes an automated database bootstrap path inside `stack/` when the bundle ships schema, ORDS, security, or seed SQL artifacts. Manual post-start SQL apply instructions are recovery notes, not the primary contract.
   - Run `podman compose config` from the `stack/` directory and fix every compose-contract mismatch it exposes before calling the bundle production-ready.
   - Run `python3 scripts/validate_livestack_bundle.py <solution-root>` after the compose contract is clean and fix every semantic error it reports before calling the bundle production-ready, including mock runtime fallbacks, missing automated bootstrap, and ORDS routes that are not actually wired into the app.
   - Run `python3 scripts/grade_livestack_bundle.py <solution-root>` and do not pass the bundle unless it gets `A+` with golden-core parity and red/green test evidence.
10. Author the LiveStack guide:
   - Use `$livestack-guide-builder` when it is installed, including when it was installed earlier from the bundled snapshot.
   - Use `python3 scripts/scaffold_livestack_guide.py <solution-root>` if the `guide/` folder does not already exist.
   - If `$livestack-guide-builder` remains unavailable after the bundled-install attempt, continue with the local guide rules and author the guide to the same LiveStack runbook contract.
   - Build `guide/` as a sibling to `stack/`, aligned to the visible scene flow, local run path, and operator workflow of the real app.
   - If a canonical local LiveStack guide exists, diff against it and match its section cadence, scene-lab tone, and local-run structure before inventing new guide patterns.
   - Keep scene labs in application-instruction tone: tell the user what to click, what panel or scene opens, what changes on screen, and what to notice; keep `curl` or API checks optional.
   - For `download-livestack`, derive the archive filename, target-folder naming, and extraction flow from the actual produced bundle or packaged archive. Do not assume the user should `cd .../stack` after extraction unless the archive really contains that extra level.
   - Use either paired `<copy>` markers or balanced `<copy> ... </copy>` wrappers for actionable commands, and keep `## Credits & Build Notes` as the LiveStacks closing section.
   - Capture real app screenshots with installed `$playwright` or `$webapp-testing` when available, store the raw capture inventory under `output/guide-screenshots/`, and copy selected images into `guide/**/images` with meaningful alt text and captions. Keep those screenshot helpers optional rather than auto-installed defaults.
   - Do not modify `workshops/*/index.html`. Treat those files as read-only, update the manifests instead, and run the official LiveLabs markdown validator until the guide is clean.
   - Run `python3 scripts/find_scaffold_markers.py <solution-root>` and clear every reported blocker in `stack/`, `database/`, `guide/`, and required docs before calling the bundle production-ready.
   - Run `python3 scripts/validate_livestack_bundle.py <solution-root>` and fix guide, screenshot-inventory, and cross-file alignment issues before calling the bundle production-ready.
11. Record red/green test evidence in `validation/test-evidence.md`: tests that failed before the final fix, the same tests passing after the fix, the A+ grading command, and the golden-parity result.
12. Run the devil's-advocate pass and revise weak areas.
13. Deliver the final package only when the grading report is `A+` / `Pass: yes`; otherwise report blockers and keep iterating.

## Specialist Skill Detection And Invocation

- Use `scripts/discover_specialist_skills.py` first.
- Read both the per-role matches and any `support_matches` returned by the script.
- Expect `support_matches` to surface add-on helpers such as deployment-target skills and optional guide-capture skills like `$playwright` or `$webapp-testing`; use them as sidecars, not as primary role owners.
- Treat results as:
  - Strong match: top score `>= 80`, or an explicit known skill named for the role.
  - Borderline: top score `55-79`; only use it if the description clearly fits the role and task.
  - Orchestrator fallback: no strong installed skill, but the role has a first-class built-in fallback in this skill with dedicated references and owned artifacts.
  - No match: top score `< 55` and no dedicated built-in fallback; use the closest relevant references and continue without blocking delivery.
- Use `support_matches` for context-specific add-ons such as deployment-target skills. Do not confuse them with the primary owner of a role.
- Before invoking a borrowed skill, confirm that the current user request actually satisfies that skill's own trigger semantics. If the fit is only loosely role-related, prefer the built-in orchestrator fallback instead.
- Project Manager, Solution Engineer, Full Stack Developer, and Devil's Advocate each have dedicated built-in fallbacks inside this skill. When no sibling skill is a strong match, those built-in paths are the default owner, not a second-class contingency.
- For database work, `$oracle-db-skills` is the preferred dependency. This orchestrator should first try `python3 scripts/ensure_oracle_db_skill.py` so the bundled snapshot is installed locally when missing; only then fall back to `references/oracle-database-fallback.md` if install is unavailable or fails.
- For app UI work, `$redwood-creator` is the preferred dependency. This orchestrator should first try `python3 scripts/ensure_redwood_creator.py` so the bundled snapshot is installed locally when missing; only then fall back to `references/role-playbooks.md#uiux-developer` if install is unavailable or fails.
- For guide authoring, prefer `$livestack-guide-builder` over generic documentation simulation whenever that skill is installed. This orchestrator should first try `python3 scripts/ensure_livestack_guide_builder.py` so the bundled snapshot is installed locally when missing; only then fall back to local guide rules in this skill rather than blocking delivery.
- For automated guide screenshots, prefer `$playwright` or `$webapp-testing` when those skills are already installed and the stack can be exercised locally. Do not auto-install them by default because browser or Node prerequisites vary by machine.
- Invoke existing skills explicitly:
  - In local execution, note `Using $skill-name for <role>` and follow that skill for the relevant slice.
  - In delegated execution, include `Use $skill-name at <path> to own <role> for this LiveStacks solution.` in the subagent prompt.
- Specialist skills are helpers, not stopping conditions. If a borrowed skill naturally ends at a plan, review, or narrow artifact, continue the orchestration until the full LiveStacks package is delivered.
- Within this skill, the user's mention of `$livestacks-orchestrator` counts as the request for delegated parallel specialist work unless they explicitly opt out.
- Spawn subagents for independent role tracks when the runtime and session policy allow it. If the user explicitly says not to delegate, or if a role is too coupled to split safely, keep that slice in the main thread and record the exception in the role ledger.
- Never let a specialist skill drift the solution away from the Oracle-first and ORDS-first guardrails.

## Required Inputs

- Accepted modes:
  - `PRD`: user provides a full PRD
  - `Merge`: user provides a partial PRD plus notes, workshop material, or constraints
  - `Bootstrap`: user provides only a brief, and the skill must synthesize `input/working-prd.md` before delegation
- Mandatory for `Bootstrap` mode:
  - `industry`
  - `pain_point`
- Strongly encouraged in any mode:
  - `category`
  - `oracle_feature_mapping`
  - `implementation_notes`
  - `limitations_risks`
  - `target_users`
  - `desired_demo_outcome`
  - `deployment_target`
  - `optional_services`

## Output Contract

Always produce these sections:

1. Problem framing
2. Proposed solution
3. Architecture decisions
4. Data design
5. UI concept
6. Implementation plan
7. Risks and challenge review
8. Final recommended LiveStacks package contents

Also generate or specify:

- raw input, source PRD record, and working PRD artifacts under `input/`
- story architecture with a recommended story mode and scene count
- application architecture
- file and folder structure
- Podman-first `compose.yml`, validated with `podman compose config`, with hard-coded published ports, top-level `networks.default`, explicit service `hostname` plus matching aliases, the canonical ORDS config bind mount `./ords-config:/etc/ords/config:Z,U`, and no published-port env knobs in `.env` or `.env.example`
- `Containerfile`
- ORDS routing and API design
- admin/token boundary for destructive dataset and operator-admin routes
- database and schema SQL outline
- frontend screen map and Oracle JET / Redwood component plan, including Oracle JET typography/font usage and JET glyphs for app chrome
- feature inventory
- Oracle AI Database 26ai capability map, dependency guide, and feature-inference rationale
- Oracle AI implementation mode such as vector/RAG, DBMS_VECTOR/DBMS_VECTOR_CHAIN, Select AI / DBMS_CLOUD_AI, deterministic NL-to-SQL, or local Ollama-assisted app logic, including provider boundary and data-egress caveats
- feature-to-scene mapping for the visible app flow
- `guide/` workshop tree authored as a LiveStack demo runbook, with introduction, scene labs, local-run lab, conclusion, and desktop/sandbox/tenancy workshop manifests
- database X-Ray mode or Oracle Internals experience
- production external-readiness posture covering auth/token boundaries, protected destructive operations, fail-closed dependency behavior, CORS/HTTPS guidance, least-privilege identities, and real readiness checks
- dataset administration experience for loading customer data
- backend and service design
- fallback or pre-seed Ollama model bootstrap scripts or wrappers for host execution on macOS or Linux and Windows
- automated screenshot capture inventory under `output/guide-screenshots/`, with selected images integrated into `guide/**/images`
- dataset import, validate, restore, and job-status contract
- active dataset state and demo-vs-customer-data behavior
- environment variables and config guidance, including `ADMIN_TOKEN` or the documented equivalent for destructive route protection
- deployment guidance
- documentation set
- launch validation checklist
- data onboarding validation checklist
- red/green test evidence and A+ grading report in `validation/test-evidence.md`
- customer rebuild guidance for replacing demo data with customer data

Use `references/package-contract.md` as the detailed checklist.

## References

- `references/input-normalization.md` for parsing workbook-style input and conservative assumptions.
- `references/prd-build-contract.md` for preserving source PRDs, synthesizing a compact working PRD, and freezing the pre-delegation build contract.
- `references/role-playbooks.md` for role outputs, status ledger, and fallback specialist behavior.
- `references/project-manager-execution.md` for the built-in Project Manager fallback.
- `references/solution-engineering-execution.md` for the built-in Solution Engineer fallback.
- `references/full-stack-delivery.md` for the built-in Full Stack Developer fallback.
- `references/devils-advocate-review.md` for the built-in Devil's Advocate fallback.
- `references/architecture-guardrails.md` for Oracle-first, ORDS-first, security, and portability invariants.
- `references/oracle-database-fallback.md` for the bundled minimum Oracle design guidance when `$oracle-db-skills` is unavailable.
- `references/guide-deliverable.md` for the required LiveStack guide, workshop, and screenshot-capture contract.
- `references/package-contract.md` for the canonical bundle tree and done criteria.

## Scripts

- `scripts/ensure_oracle_db_skill.py` to install the bundled `oracle-db-skills` snapshot into the local skills root when the sibling skill is missing.
- `scripts/ensure_livestack_guide_builder.py` to install the bundled `livestack-guide-builder` snapshot into the local skills root when the sibling skill is missing.
- `scripts/ensure_redwood_creator.py` to install the bundled `redwood-creator` snapshot into the local skills root when the sibling skill is missing.
- `scripts/discover_specialist_skills.py` to inspect installed skills and recommend role-to-skill matches.
- `scripts/init_livestack_bundle.py` to scaffold a canonical LiveStacks solution folder before filling it with real artifacts.
- `scripts/scaffold_livestack_guide.py` to create the required `guide/` workshop by delegating to the sibling `$livestack-guide-builder` scaffold script when that skill is installed or after the bundled ensure step installs it.
- `scripts/check_skill_package.py` to validate release metadata, required package paths, script syntax, and cache/metadata hygiene before distribution.
- `scripts/grade_livestack_bundle.py` to grade generated bundles and pass only on `A+` golden-core parity, clean semantic validation, guide/screenshot evidence, and red/green test evidence.
- `scripts/sync_livestack_guide_builder_bundle.py` to refresh the bundled `livestack-guide-builder` snapshot from the installed live skill during maintainer updates.
- `scripts/find_scaffold_markers.py` to catch leftover placeholder content that must be replaced before delivery.
- `scripts/validate_livestack_bundle.py` to catch semantic cross-file drift after placeholder cleanup, including compose and env contract mismatches, weak guide-manifest wiring, screenshot inventory problems, missing Oracle-evidence surfaces, incomplete dataset-admin API routes, unprotected destructive dataset routes, and undocumented direct app-to-database runtime access.
