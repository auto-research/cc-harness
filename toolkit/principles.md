---
title: Harness Engineering Design Principles — Distilled from Claude Code and Codex Source
domain: tech
type: decision
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, codex, agent-architecture, design-principles]
sources:
  - Xiao Tan AI, Claude Code 源码架构深度解析 V2.0
  - "@wquguru, Harness Engineering — Claude Code 设计指南"
  - "@wquguru, Claude Code 和 Codex 的 Harness 设计哲学"
---

[中文版](./principles.zh.md)

# Harness Engineering Design Principles

This document synthesizes three source materials to distill harness design principles for AI coding agents.

## Core Position

> Prompt decides how it talks. Harness decides how it acts.

The harness is not a supplementary tool — it is the prerequisite for a model to operate in an engineering environment. Without this layer of constraint, risk ultimately transfers to users, teams, and maintainers.

## Ten Principles

### 1. Treat the Model as an Unstable Component, Not a Colleague

Models make mistakes, lose context, and conflate the confidence of their tone with the correctness of their conclusions. Systems must be designed around this fact.

**Implementation mapping**: `governance/dont.md` — encode lessons as institutional rules, not ad-hoc model judgment.

### 2. Prompt Is Part of the Control Plane, Not Personality Decoration

In an agent, the prompt is not character copy — it is a layered assembly of behavior blocks. What actually matters is the priority chain: override > coordinator > agent > custom > default.

**Implementation mapping**: `CLAUDE.md` trimmed to a 26-line entry point that delegates to `governance/` and `knowledge/` — no descriptive padding.

### 3. The Query Loop Is the Heartbeat of an Agent System

The first sign of a mature agent system is whether it has a loop. State belongs to the main process: budget concepts, recovery concepts, self-rescue mechanisms when context bloats, and the ability to keep moving after a tool call fails.

**Implementation mapping**: Each workflow in `workflows/` has step numbers + quality gates + `progress.md` for interrupt recovery.

### 4. Tools Are Managed Execution Interfaces

Tool invocation is not "call whatever the model says." In between: input validation, permission checks, risk assessment, execution, and post-processing. The more capable the tool, the finer the constraints. Bash is the most dangerous.

**Implementation mapping**: `.claude/settings.json` hooks — PreToolUse intercepts sensitive commands, PostToolUse checks immediately after.

### 5. Context Is Working Memory, Not a Trash Can

Every token has a cost. Cache what can be cached, load on demand what doesn't need to be front-loaded, compress what can be compressed. `CLAUDE.md` carries long-term instructions; memory is a short-term buffer — they must not be conflated.

**Implementation mapping**: `knowledge/` organized by domain with layered loading — only load the domain needed for the current task. Memory is treated as short-term buffer; long-term knowledge is migrated by librarian into `knowledge/`.

### 6. The Error Path Is the Main Path

Failures in agent systems are not sporadic — they are stable and recurrent: prompt too long, max_output_tokens, tool rejection, user interruption, hook blocking, API retries. All of these must be treated as main-path concerns.

**Implementation mapping**: `governance/verification.md` — anti-rationalization rules that prevent "looks fine" from passing as verification.

### 7. The Goal of Recovery Is to Continue Working

Recovery is not rolling back to the initial state — it is primarily about resumption. The next session after an interruption should be able to pick up from `progress.md` and keep going.

**Implementation mapping**: `templates/workflow-progress.md` — standard progress file maintained automatically by every multi-step workflow.

### 8. Multi-Agent Systems Depend on Role Separation, Not Headcount

The real value of multi-agent systems lies in responsibility partitioning and independent verification. The person writing the code should not be the one verifying it.

**Implementation mapping**: `agents/` — 5 roles each with `knowledge_access` and `tools` constraints. Librarian is read-only.

### 9. Verification Must Be Independent — the System Cannot Grade Itself

Verification must be independent from the implementation phase. "The code looks correct" is not verification. "AI already checked it" is not independent review.

**Implementation mapping**: `governance/verification.md` — four anti-rationalization rules + `governance/quality-gates.md` — mandatory checks by content type.

### 10. Team Institution Matters More Than Individual Skill

Usable by one person does not mean sustainable for a team. Skills are reusable institutional slices; hooks attach institutions to lifecycle events; approvals draw responsibility boundaries.

**Implementation mapping**: The entire `governance/` layer — rules, prohibitions, gates, and hooks are all institutional, not personal preferences.

## Claude Code vs Codex: Two Approaches to Taming Models

| Dimension | Claude Code | Codex |
|-----------|-------------|-------|
| Disposition | Runtime discipline first | Policy and local rules first |
| Control plane | Dynamic prompt assembly pipeline | Numbered instruction fragment document system |
| Continuity | Embedded in the query loop | Split across thread/rollout/state bridge |
| Tool governance | Runtime orchestration + dangerous-action constraints | Schema + approval policy + sandbox |
| Local rules | CLAUDE.md brings local rules into the session | AGENTS.md brings local rules into the institution |
| Multi-agent | Runtime responsibility partitioning, verification independent of implementation | Explicit delegation + persistent state + tool-based coordination |

**Where they converge**: Both acknowledge that models cannot be trusted. Only the constraint structure can be.

**Where they diverge**: Claude Code grew from runtime incident experience, prioritizing continuity and on-site governance. Codex grew from explicit structural design, prioritizing control-plane naming, policy expression, and composability.

## Implementation Guidance

A validated **hybrid approach**:

- **Layered knowledge loading** (Principle 5) → organize knowledge by domain, load on demand
- **Behavior as institution** (Principles 1, 10) → governance independent of the knowledge layer
- **Role separation** (Principles 8, 9) → each agent is constrained, verification roles are read-only
- **Interrupt recovery** (Principle 7) → workflow definitions + progress tracking
- **Tool governance** (Principle 4) → automated checks via hooks
- **Independent verification** (Principle 9) → anti-rationalization rules

Rather than copying any product directly, later practitioners should identify their primary sources of uncertainty and decide where to place the ordering.
