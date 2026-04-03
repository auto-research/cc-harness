[中文版](./checklist.zh.md)

---
title: 10-Minute AI Workflow Audit Checklist
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, checklist, audit, template, team]
---

# 10-Minute AI Workflow Audit Checklist

This checklist is organized around the 10 Harness Engineering principles. Answer each question with `Yes` or `No`.
The goal is not a high score — it is to quickly locate the most vulnerable control surfaces in your team's current setup.

## Audit Questions

### Principle 1: Treat the Model as an Unreliable Component

1. Have you recorded past incidents in `dont.md`, rather than expecting the model to "remember next time"?

### Principle 2: Prompt Is Part of the Control Surface

2. Is your repo-level `CLAUDE.md` kept to around 5 KB, with stable rules first and dynamic state deferred?

### Principle 3: The Query Loop Is the System Heartbeat

3. Do your critical workflows have explicit workflow files, rather than being driven by a single long prompt?

### Principle 4: Tools Are Managed Execution Interfaces

4. Do you have at least one `PreToolUse` Bash guard that blocks publish, force-push, or `rm -rf`?

### Principle 5: Context Is Working Memory

5. Have you placed package-specific constraints in directory-level entry points, rather than stuffing all details into the root `CLAUDE.md`?

### Principle 6: The Error Path Is the Main Path

6. Do you have a `PostToolUse` hook that automatically runs lint after writes, surfacing failures early?

### Principle 7: Recovery Means Getting Back to Work

7. Can a new session resume interrupted work from `progress.md` alone, without depending on the previous conversation context?

### Principle 8: Multi-Agent Systems Depend on Role Separation

8. Are implementation, review, and architecture responsibilities clearly separated by different role files or different steps?

### Principle 9: Verification Must Be Independent

9. Do you have a verification step independent of the Implementer that uses the PASS/FAIL evidence format?

### Principle 10: Team Institution Matters More Than Individual Technique

10. Can every rule in `dont.md` be traced back to a source lesson, rather than personal preference?

## Scoring

- `Yes` = 1 point
- `No` = 0 points
- Total range: 0 to 10

## Interpreting Results

- `8–10`: Solid foundation. Your harness shows clear institutionalization and is unlikely to lose control from a single session's drift.
- `5–7`: Predictable gaps exist. Typically at least one of hooks, progress recovery, or independent verification is missing.
- `<5`: Significant risk. The current setup looks more like "a person who can use the model holding things together" rather than "a system the team can sustain."

## Recommended Repair Order

If your score is below 8, address gaps in this order:

1. First: `dont.md` and `verification.md`
2. Next: `PreToolUse` / `PostToolUse` hooks
3. Then: workflow + `progress.md`
4. Finally: optimize `CLAUDE.md` / `AGENTS.md` layering

The reasoning is simple: block accidents first, build process next, then refine entry files last.
