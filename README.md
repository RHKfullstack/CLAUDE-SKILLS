# Agent Skills

23 portable agent skills in the canonical `SKILL.md` format: three for design, three stack bridges, thirteen senior engineering audits, and three for workspace and sandbox discipline.

Written to be **model- and tool-agnostic**. The instructions are plain markdown with YAML frontmatter — no plugin runtime, no SDK, no build step required — so the same files work in Claude Code, the Claude apps, the Agent SDK, and any other agent that can read a file.

Every skill is a **claim-check procedure**, not an essay. Each phase ends in a named artifact, and a check that was not executed is labelled `PLANNED` or `UNAVAILABLE` — never `PASSED`.

## Compatibility

| Tool | How it loads | Adapter |
|---|---|---|
| **Claude Code** | native `SKILL.md` discovery in `~/.claude/skills/` or `.claude/skills/` | `CLAUDE.md` |
| **Claude.ai / Desktop** | Settings → Capabilities → Skills → upload a zipped skill folder | — |
| **Claude Agent SDK** | native, via the `skills` option | `CLAUDE.md` |
| **Cursor** | reads `.cursor/rules/*.mdc` | `adapters/cursor-skills.mdc` |
| **GitHub Copilot** | reads `.github/copilot-instructions.md` | `adapters/copilot-instructions.md` |
| **Codex, Gemini CLI, Aider, Zed, Cline, Roo, Windsurf** | read a repository `AGENTS.md` | `adapters/AGENTS.md` |
| **Anything else** | point it at `skills/*/SKILL.md` and add an index | `adapters/AGENTS.md` |

The adapters are **indexes**, not copies. There is exactly one place to edit a skill: its `SKILL.md`.

## Structure

```
skills/<name>/SKILL.md      canonical skill (YAML frontmatter: name, description)
skills/<name>/references/   optional supporting files, cited by relative path
adapters/AGENTS.md          index for AGENTS.md-reading agents
adapters/CLAUDE.md          project memory for Claude Code
adapters/copilot-instructions.md
adapters/cursor-skills.mdc
scripts/build-adapters.mjs  regenerates every adapter from skills/
scripts/validate-skills.mjs checks the contract and the adapter freshness
.github/workflows/validate.yml  runs the same checks on every push and PR
```

## The skills

### Design

| Skill | Use when |
|---|---|
| `creative-designer` | Any medium that is not a browser page: desktop app, mobile, print/PDF, slides, social graphics. Supplies the shared method and the per-medium constraint sets. |
| `ui-design` | Web visual craft: tokens, spacing rhythm, the eight component states, the rejection list, the pass/fail rubric, the screenshot-critique loop. |
| `senior-frontend-engineering` | React correctness, WCAG 2.2 AA, Core Web Vitals budgets, browser-level proof, client security, i18n. |

### Stack

| Skill | Use when |
|---|---|
| `stack-php-mysql` | Laravel/PHP + MySQL + Redis + Windows. Translates every senior phase into an executable command so an evidence gate resolves to something runnable instead of `UNAVAILABLE`. |
| `stack-index` | Any language that is not PHP or React. Routes 22 languages to their executable command set with a verification badge, and derives the set for any unlisted language. |
| `stack-python` | Python projects. venv, pytest, ruff, mypy, coverage and pip-audit, with absent tools recorded as blocked rather than passing. |

### Engineering

| Skill | Use when |
|---|---|
| `senior-code-review` | Judging a diff before it lands. |
| `senior-work-audit` | Certifying a change set, branch or subsystem as finished. |
| `senior-test-adequacy` | Deciding whether the tests actually prove the change. |
| `senior-data-migration-safety` | Schema change, backfill, index build, column drop. |
| `senior-performance-audit` | Something is slow, or a performance claim needs a number. |
| `senior-reliability-review` | SLOs, alerting, on-call, incident readiness. |
| `senior-release-gate` | Go/no-go before a deploy. |
| `senior-system-hardening` | Host, container, secrets and network posture. |
| `senior-supply-chain-audit` | Dependencies, lockfiles, provenance, CI trust. |
| `senior-threat-model` | A new service, integration or trust boundary. |
| `senior-architecture-review` | A design or RFC where the choice is between structures. |
| `senior-app-security` | Auth, permissions, uploads, rendered HTML, multi-tenancy. |
| `senior-background-jobs` | Queues, retries, workers, cron, `failed_jobs`, Redis. |

### Workspace and sandbox

| Skill | Use when |
|---|---|
| `organizer` | Any task that creates, moves, cleans or backs up files: the artifact sink, classify-then-plan-then-gate deletion with an undo journal, the protected set, and backup disposition. Ships four reference modules under `references/organizer/`. |
| `plannable` | Multi-part implementation work that needs a tracked plan and evidence before a part is checked off. Ships seven guidance modules under `references/plannable/`. |
| `sandbox-mode` | Security research, pentest, reverse engineering, scraping, capture and fictional content, with the CAPTCHA, card-payment, RE, scraping and device references under `references/`. Targets are synthetic fixtures. |

**Prerequisites.** `plannable` is the only skill with an external binary — install the `plannable` CLI, otherwise its phases resolve to `UNAVAILABLE`. `organizer` is rules-only: its reference modules are included, and a separate engine is optional. `sandbox-mode` is rules plus reference files, no runtime.

## How a skill behaves

1. **Progressive disclosure.** Only the `name` and `description` sit in context until the skill is needed; the body loads on use.
2. **Evidence per phase.** Each phase ends in an `EVIDENCE:` artifact — a command output, a `file:line`, a measurement.
3. **No silent success.** `PLANNED` and `UNAVAILABLE` are explicit states. A missing tool is reported, not skipped.
4. **One authority per subject.** `senior-data-migration-safety` owns migration measurement and `senior-release-gate` only summarizes it; `senior-test-adequacy` judges tests while `senior-work-audit` judges the change.

## Install

### As a DSH plugin

```
https://github.com/RHKfullstack/CLAUDE-SKILLS.git
```

The repository root declares `dsh.bundle.patch` → `cordis.patch.yml`, and `index.js` registers all 23 skills with each skill's own folder as its resource base. Install this way when the DSH app is running a Claude model and you want the same pack mounted there; it is the same files, no second copy to maintain.

> Without `dsh.bundle` the installer reports *"This package declares no bundle, so it cannot be managed as a plugin"* — the bundle was added in 1.1.0.

### Everywhere else

See [INSTALL.md](INSTALL.md) — Claude Code, the Claude apps, the Agent SDK, Cursor, Copilot, and any AGENTS.md-reading agent.

## Validate

```bash
node scripts/validate-skills.mjs
```

| Check | Fails when |
|---|---|
| `E1` | `SKILL.md` has no frontmatter, or starts with a UTF-8 BOM |
| `E2` | `name` or `description` is missing |
| `E3` | `name` is not `^[a-z0-9-]{1,64}$`, or does not match the directory |
| `E4` | `description` exceeds 1024 characters |
| `E5` | the body is empty, or cites an absolute machine path |
| `E6` | a cited `references/...` file does not exist |
| `E7` | an adapter is stale |
| `E8` | README or INSTALL quotes the wrong skill count |

`W1` warns when a body passes 500 lines — the progressive-disclosure guidance — without failing the build. A skill over that line should move detail into `references/`.

## Regenerating the adapters

```bash
node scripts/build-adapters.mjs          # rewrite adapters/
node scripts/build-adapters.mjs --check  # exit 1 if any adapter is stale
```

The script validates every skill's frontmatter and fails if a directory name and its `name:` field disagree, so a broken skill cannot ship silently.

## Requirements

None for use — the skills are markdown. Node.js 18+ is needed only to run the adapter generator.

## Proof

The same pack, applied end to end, produced the storefront screenshotted in [RHKfullstack/DEEPSEEK-SKILLS](https://github.com/RHKfullstack/DEEPSEEK-SKILLS#proof): zero console errors, no horizontal scroll at 390px, 44px tap targets.
