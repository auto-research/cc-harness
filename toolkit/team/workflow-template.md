---
title: Workflow Template and Progress Tracking
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, workflow, progress, template, team]
---

[中文版](./workflow-template.zh.md)

# Workflow Template and Progress Tracking

This template serves principles 3, 7, 8, and 9: the query loop is the heartbeat of an agent system, interrupted work must be resumable, implementation and verification must belong to separate roles, and workflows must have explicit quality gates attached.

## Workflow Definition Template

Below is a copyable `workflows/<name>.md` template. The YAML frontmatter consistently includes:

- `name`
- `description`
- `agents`
- `quality_gates`
- `steps`

```md
---
name: <workflow-name>
description: <What problem this workflow solves and what it produces>
agents:
  - <agent-1>
  - <agent-2>
quality_gates:
  - <path-to-quality-gate-1>
  - <path-to-quality-gate-2>
steps:
  - id: 1
    name: <step-name>
    owner: <agent-or-role>
  - id: 2
    name: <step-name>
    owner: <agent-or-role>
---

# <workflow title>

## Goal

State the final deliverable, acceptance criteria, and blocking conditions.

## Inputs

- Required input 1
- Required input 2

## Outputs

- Output 1
- Output 2

## Step 1: <step-name>

Owner: <role>

Actions:
1. Describe the action to take.
2. Describe the knowledge or rules to read.
3. Describe how to determine this step is complete.

Quality gate:
- The corresponding check or external checklist

Update progress:
- After completion, update `progress.md` with `current_step`, `last_updated`, and the completed checklist.

## Step 2: <step-name>

Owner: <role>

Actions:
1. Describe the action to take.
2. Describe the evidence to preserve.
3. Describe how to determine this step is complete.

Quality gate:
- The corresponding check or external checklist

Update progress:
- Sync progress after completion and record the minimum next action.
```

## `progress.md` Template

Below is a tracking template for interrupted-session recovery. The frontmatter must include:

- `workflow`
- `slug`
- `started`
- `last_updated`
- `status`
- `current_step`
- `total_steps`

```md
---
workflow: <workflow-name>
slug: <short-slug>
started: 2026-04-02
last_updated: 2026-04-02
status: in_progress
current_step: 1
total_steps: 4
---

# Progress

## Completed steps

- [ ] Step 1 - <step-name>
- [ ] Step 2 - <step-name>
- [ ] Step 3 - <step-name>
- [ ] Step 4 - <step-name>

## Next action

Describe the minimum next action when resuming — no abstract slogans.

## Context for resume

- Currently confirmed facts
- Unresolved blockers
- Files or logs to read
- Verification status and gaps
```

## Complete Example: Feature Development Workflow

```md
---
name: feature-development
description: Standard feature development workflow from requirements clarification through implementation, review, verification, and handoff.
agents:
  - architect
  - implementer
  - reviewer
quality_gates:
  - governance/quality-gates.md
  - governance/verification.md
steps:
  - id: 1
    name: scope-and-acceptance
    owner: architect
  - id: 2
    name: implement-minimal-slice
    owner: implementer
  - id: 3
    name: run-verification
    owner: reviewer
  - id: 4
    name: package-handoff
    owner: implementer
---

# Feature development workflow

## Goal

Deliver a feature change that satisfies acceptance criteria, carries independent verification evidence, and can be resumed from an interrupted state.

## Inputs

- A clear user requirement
- Relevant domain knowledge and governance files
- Current code and test context

## Outputs

- Implemented change
- Updated `progress.md`
- Independent verification conclusion

## Step 1: scope and acceptance

Owner: architect

Actions:
1. Define scope, out-of-scope, and observable acceptance criteria.
2. Identify the modules, boundaries, and risks involved.
3. Determine whether the work needs to be split into smaller slices.

Quality gate:
- Acceptance criteria are testable.
- Risks and rollback path are written down.

Update progress:
- Update `current_step` to 2.
- Record approved scope and blockers in `Context for resume`.

## Step 2: implement minimal slice

Owner: implementer

Actions:
1. Start implementation from the smallest viable slice.
2. Run the corresponding lint/typecheck/test after each segment.
3. Keep `progress.md` in sync with the current state.

Quality gate:
- Implementation stays within scope.
- Intermediate verification commands have evidence.

Update progress:
- Check off completed steps.
- Write clearly what the reviewer needs to verify next.

## Step 3: run verification

Owner: reviewer

Actions:
1. Independently run lint/typecheck/test or content-type gates.
2. Prioritize finding behavioral regressions, evidence gaps, and missed risks.
3. Output conclusions in PASS/FAIL format.

Quality gate:
- `governance/verification.md`
- `governance/quality-gates.md`

Update progress:
- Update `status` to `verified` or `blocked`.
- Record failure reasons or remaining risks in `Context for resume`.

## Step 4: package handoff

Owner: implementer

Actions:
1. Fix issues or finalize the handoff summary based on Reviewer's findings.
2. Summarize acceptance criteria, risks, and verification conclusions.
3. Prepare for handoff or commit.

Quality gate:
- Handoff is not allowed while any failure items remain unresolved.
- Handoff summary must reference verification results.

Update progress:
- Set `status` to `done` when all steps are complete.
```

### Corresponding `progress.md` Example

```md
---
workflow: feature-development
slug: add-team-harness-toolkits
started: 2026-04-02
last_updated: 2026-04-02
status: in_progress
current_step: 2
total_steps: 4
---

# Progress

## Completed steps

- [x] Step 1 - scope and acceptance
- [ ] Step 2 - implement minimal slice
- [ ] Step 3 - run verification
- [ ] Step 4 - package handoff

## Next action

After completing the initial draft of template files, run a self-check and prepare the verification scope for the Reviewer.

## Context for resume

- Confirmed scope: add 7 team-level Harness Engineering template files.
- Key constraints: all files must have frontmatter, body text is primarily in Chinese, hooks examples must be complete and copyable.
- Items pending verification: hooks JSON structure, shell script readability, principle mapping coverage.
- Risk: without progress tracking, it is easy to lose track of "which step we were on" after an interruption.
```

## Usage Recommendations

- Every workflow with more than 2 steps should have a corresponding `progress.md`.
- Before every interruption, update `Next action` at least once.
- The Reviewer does not modify the implementation — only updates the verification conclusion or requests a fix.
