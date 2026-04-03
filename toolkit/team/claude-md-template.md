[中文版](./claude-md-template.zh.md)

---
title: CLAUDE.md Three-Layer Template Guide
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, prompt-cache, template, team]
---

# CLAUDE.md Three-Layer Template Guide

This template guide is aimed at team-level Claude Code harness design. The core goal is not to write `CLAUDE.md` as an "extremely long system persona" — it is to distribute stable institution, on-demand loading, and personal preferences to the correct layers.
It primarily serves principles 2, 5, 7, and 10: treat prompt as a control surface, treat context as working memory, encode recovery capability into the process, and separate team institution from personal preferences.

## Three-Layer Structure

### Layer 1: repo-level

- File location: repository root `CLAUDE.md`
- Recommended size: around 3 KB — lean is better than sprawling
- Purpose: team-shared stable boundaries, commands, directory map, on-demand loading entry points
- Do not include: current branch state, temporary TODOs, personal idioms, volatile context

### Layer 2: directory-level

- File location: `CLAUDE.md` inside a subdirectory
- Recommended size: around 300 to 800 bytes per package or domain
- Purpose: local constraints injected only upon entering the directory — e.g. package-specific commands, schema requirements, test locations, edit-boundary restrictions
- Do not include: duplicated repo-level rules

### Layer 3: personal-level

- File location: `.claude/settings.local.json`
- Purpose: local settings that belong only to the individual and should not be committed — e.g. personal hooks, sandbox preferences, local URLs, experimental overrides
- Do not include: institution that the whole team must follow

## Layer 1 Template Essentials

A repo-level `CLAUDE.md` should answer five questions:

1. What to read first.
2. What is absolutely forbidden.
3. What the common verification commands are.
4. How the repository is structured in layers.
5. What content is loaded on demand rather than front-loaded at the start.

### Layer 1 Complete Example

````md
# Project entry

Read `governance/rules.md` for the binding behavior baseline.
Read `governance/dont.md` before any risky change.
Read `AI_GUIDE.md` for repository architecture.

## Hard boundaries

- Never publish, deploy, or force-push unless the user explicitly asks.
- Never change governance rules without recording the source lesson.
- Never claim verification without an independent check.
- Never turn temporary session notes into durable knowledge without review.

## Build and verification commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Targeted test: `pnpm test -- --runInBand <path>`

## Repository structure

- `knowledge/` reusable domain knowledge and decisions
- `governance/` rules, prohibitions, quality gates, verification
- `workflows/` repeatable procedures and progress tracking
- `agents/` domain ownership and role-specific instructions
- `packages/` implementation units

## On-demand loading guide

- For code changes, load the relevant `agents/<name>/AGENT.md` before editing.
- For documentation work, load the docs-writing guidance only when editing
  `.md` files.
- For package-specific work, read the nearest directory `CLAUDE.md`.
- For multi-step work, create or resume `progress.md` before implementation.

## Delivery rules

- Lead with the conclusion, then supporting detail.
- Define observable acceptance criteria before implementation.
- State risks and rollback path for high-impact changes.
- Prefer maintainable structure over one-off shortcuts.

## Verification handoff

- Implementer does not self-certify.
- Reviewer or an independent verification step must confirm lint, typecheck,
  tests, and any content-specific gate.
````

This layer corresponds to principles 2 and 10: rules enter team institution first, then enter each session.

## Layer 2 Template Essentials

A directory-level `CLAUDE.md` should only contain "things you absolutely need to know upon entering this directory."
If a rule would still apply outside this directory, it does not belong here.

### Layer 2 Complete Example

The example below assumes the directory is `packages/payments/CLAUDE.md`.

```md
# Payments package rules

Apply `governance/rules.md` first, then follow these package constraints.

## Scope

- This package owns payment intent creation, provider adapters, and webhook
  verification.
- UI copy and billing analytics are out of scope.

## Package-specific constraints

- Validate every external payload with Zod before business logic.
- Keep provider adapters behind `adapters/`; routes must not call SDKs
  directly.
- Webhook signature checks are mandatory before parsing event bodies.

## Commands

- Package test: `pnpm --filter @app/payments test`
- Package typecheck: `pnpm --filter @app/payments typecheck`

## Local map

- `src/routes/` request boundary
- `src/domain/` business rules
- `src/adapters/` provider integration
```

This layer corresponds to principle 5: inject on demand, do not pre-load package details into root-level memory.

## Layer 3 Template Essentials

The personal layer should not pollute team institution. Appropriate content:

- Local development URLs
- Temporary experimental hooks
- Personal allow lists or reminders
- Machine-specific paths

### Layer 3 Complete Example

```json
{
  "env": {
    "APP_BASE_URL": "http://localhost:3000",
    "PAYMENTS_SANDBOX_URL": "http://localhost:4010"
  },
  "permissions": {
    "allow": [
      "Bash(pnpm --filter @app/payments test:*)",
      "Bash(pnpm --filter @app/payments typecheck)"
    ]
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/local-reminder.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

This layer corresponds to principle 10: personal efficiency techniques are not the same as team default institution.

## Prompt Cache Optimization

The key to Prompt Cache friendliness is not "write less" — it is separating stable content from volatile content, and placing stable content at the top of the file. Claude Code's memory system loads automatically, and the more stable the content, the more it benefits from cache reuse.

### Recommended Static Zone

Place in the first half of the repo-level `CLAUDE.md`:

- Project purpose
- Hard boundaries
- Common commands
- Directory structure
- Role assignments
- Fixed verification rules

This content changes little across sessions and is well-suited to the control surface and working memory separation described in principles 2 and 5.

### Recommended Dynamic Zone

Do not write directly into the repo-level `CLAUDE.md` — instead place in:

- `progress.md`: current step, corresponding to principles 3 and 7
- `.claude/settings.local.json`: personal experiment settings
- Subdirectory `CLAUDE.md`: local domain constraints
- Hook-injected context: current dirty state, latest typecheck results

### Static vs. Dynamic Split Example

Wrong approach:

- Writing "currently refactoring the payments module, remember to check `src/new/`" in the root `CLAUDE.md`
- Writing "today lint is broken on `checkout.ts`" in the root `CLAUDE.md`

Correct approach:

- Root `CLAUDE.md` only says "multi-step tasks must maintain a `progress.md`"
- Current refactoring state goes in the workflow's corresponding `progress.md`
- Current lint / typecheck results are injected by the `UserPromptSubmit` hook

## Rollout Recommendations

1. First compress the repo-level `CLAUDE.md` to around 3 KB, keeping only hard boundaries and entry points.
2. Then add minimal directory-level `CLAUDE.md` files for high-risk directories.
3. Finally migrate personal preferences and local experiments to `.claude/settings.local.json`.

The result: team rules are stable, directory constraints are injected on demand, personal preferences do not pollute shared institution — consistent with the Harness Engineering layered control approach.
