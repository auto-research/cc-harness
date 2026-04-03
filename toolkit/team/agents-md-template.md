[中文版](./agents-md-template.zh.md)

---
title: AGENTS.md Template Guide
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, codex, agents-md, template, team]
---

# AGENTS.md Template Guide

This template is aimed at institutional design for the Codex side of the team. It primarily serves principles 1, 2, 8, 9, and 10: don't treat the model as a reliable colleague, treat the prompt as a control surface, use role separation instead of headcount, and encode independent verification into the institution.

## The Philosophical Difference Between AGENTS.md and CLAUDE.md

The focus of `CLAUDE.md` is getting live rules into the conversation — helping Claude Code quickly retrieve the current project's constraints and entry points at runtime.

The focus of `AGENTS.md` is getting rules into the institution — helping Codex understand, within repository boundaries, upfront:

- Who is responsible for what
- What to read first
- Which rules are globally binding
- Which domain knowledge to load on demand

Think of it as:

- `CLAUDE.md` leaning toward a runtime memory entry point
- `AGENTS.md` leaning toward an institutional entry point and responsibility boundary

This maps exactly to principle 10: team institution takes precedence over individual technique.

## Hierarchy, Scope, and Priority

When writing `AGENTS.md`, teams should make the following priority chain explicit:

1. Platform system / developer instructions
2. Repository root `AGENTS.md`
3. Governance files referenced by the root `AGENTS.md`, e.g. `governance/rules.md`
4. Subdirectory or domain-level `AGENT.md`
5. User requirements for the current task

Practical rules:

- The root `AGENTS.md` is responsible for the institutional entry point, not a comprehensive reference.
- Domain `AGENT.md` is responsible for domain ownership — it does not rewrite global rules.
- User requests may add task goals but cannot override higher-priority safety boundaries.

## Recommended Structure

A team-level `AGENTS.md` should answer six things:

1. Which shared rules to read first.
2. What layers the repository has.
3. Where domain agents live.
4. How knowledge should be loaded on demand.
5. Which quality gates are mandatory.
6. Which tasks must be handed off to a clear owner.

## Complete Template Example

```md
# AGENTS.md

This file is the Codex entry point for this repository.

Read `governance/rules.md` for the binding behavior baseline.
Read `governance/dont.md` before risky work.
Read `AI_GUIDE.md` for architecture and layer responsibilities.

## Repository map

- `knowledge/` stores reusable domain knowledge and decisions.
- `governance/` stores rules, prohibitions, verification, and quality gates.
- `workflows/` stores repeatable execution procedures and progress tracking.
- `agents/` stores domain owners through per-agent `AGENT.md`.
- `packages/` stores implementation units.

## Knowledge loading

- Load `knowledge/common/` first.
- Then load only the domain material required for the active task.
- Do not preload unrelated domains.
- For multi-step tasks, create or resume `progress.md` before implementation.

## Agent discovery

Domain agents live in `agents/`.
Read the relevant `agents/<name>/AGENT.md` before acting in that domain.

## Shared governance

All work must satisfy:

- `governance/rules.md`
- `governance/dont.md`
- `governance/quality-gates.md`
- `governance/verification.md`

## Responsibility boundaries

- One task has one owner at a time.
- Implementation and verification must not be owned by the same role.
- Cross-domain work requires an explicit handoff instead of overlapping edits.

## Output expectations

- Lead with the conclusion, then supporting detail.
- Define observable acceptance criteria.
- Surface risk and rollback path for high-impact changes.
- Prefer maintainability over short-term speed.
```

## Writing Guidelines

### What to Include

- Repository-level behavior baseline
- Directory structure and knowledge entry points
- Agent discovery paths
- Responsibility boundaries
- Shared quality gates

### What to Exclude

- Function naming details for a specific package
- Temporary debugging steps
- Personal shortcut commands
- Session state that will quickly go stale

## Mapping to Harness Principles

- Principle 1: Don't assume the model will find the right boundaries on its own.
- Principle 2: Use layered text to decompose the control surface clearly.
- Principle 8: Separate roles and responsibilities before collaboration.
- Principle 9: Verification is not the implementer's responsibility alone.
- Principle 10: Write "how work gets done" as team institution, not tribal knowledge.
