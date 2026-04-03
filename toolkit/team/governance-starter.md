---
title: Governance Starter Templates
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, governance, template, team]
---

[中文版](./governance-starter.zh.md)

# Governance Starter Templates

This starter covers four team governance files: `rules.md`, `dont.md`, `quality-gates.md`, and `verification.md`. It corresponds to principles 1, 6, 9, and 10: distill experience into institution, write failure paths as the main path, make verification independent, and make team constraints explicit.

## `rules.md` Template

Note: This file defines the shared behavior baseline. The focus is not on listing slogans, but on clearly writing out executable output rules, acceptance criteria, risk disclosure, maintainability, knowledge loading, and agent boundaries.

```md
# Governance rules

These rules define how every agent in this repository must work.
They are intentionally short and binding.

## Output rules

Every deliverable must lead with the conclusion, then the supporting
explanation.
Every task must define concrete acceptance criteria before implementation or
publication.
High-impact work must disclose the main risks and a rollback path.
When speed conflicts with maintainability, choose the more maintainable path.

## Acceptance criteria

Acceptance criteria must be observable, specific, and testable.
Avoid vague checks such as "looks good" or "seems complete."
Each criterion must state what passes and what fails.

## Risk disclosure

Surface risks explicitly when work affects user-facing behavior, shared
templates, reusable workflows, repository structure, security, or financial
impact.
If a risk is accepted, name the tradeoff and the fallback path.

## Maintainability

Prefer solutions that remain understandable, editable, and easy to verify
later.
Do not introduce one-off shortcuts that increase future ambiguity.

## Knowledge loading

Load shared governance and common knowledge first.
Then load only the domain knowledge required for the active task.
Do not preload unrelated domains just because they exist.

## Agent boundaries

One task has one owner at a time.
Implementation and verification must not be owned by the same role.
Cross-domain work requires an explicit handoff instead of overlapping
ownership.
```

## `dont.md` Template

Note: Every prohibition must have a trigger scenario, a source lesson, and specific prohibited behaviors. Prohibitions without a source lesson easily degrade into personal taste.

```md
# Governance don'ts

This file turns repeated mistakes into non-negotiable prohibitions.
If a task matches one of these scenarios, stop the prohibited behavior before
continuing.

## [Prohibition Title 1]

Trigger scenario: Describe the specific type of work that activates this prohibition.

Source lesson: Name the incident, postmortem, customer feedback, production failure, or historical document.

Prohibited behaviors:
- Prohibited behavior 1
- Prohibited behavior 2
- Prohibited behavior 3

## [Prohibition Title 2]

Trigger scenario: Describe the specific type of work that activates this prohibition.

Source lesson: Name the incident, postmortem, customer feedback, production failure, or historical document.

Prohibited behaviors:
- Prohibited behavior 1
- Prohibited behavior 2
- Prohibited behavior 3
```

### Ready-to-Adapt Example Entries

```md
## Claiming Completion Without Verification

Trigger scenario: Any delivery of code, templates, workflows, or content that requires claiming "done."

Source lesson: Multiple past deliveries where the implementer treated "reading it myself" as verification, allowing regressions and missed checks to enter the mainline.

Prohibited behaviors:
- Do not claim "verification passed" without independent verification evidence.
- Do not treat "the AI already checked it" as an independent review.
- Do not skip failure logs or bypass key commands and give a PASS.

## Contaminating Durable Knowledge With Temporary Context

Trigger scenario: Writing temporary session state, debugging notes, or unsettled conclusions from a single session into the knowledge base or global rules.

Source lesson: In the past, session-level TODOs were written into shared entry files, causing subsequent sessions to load stale information.

Prohibited behaviors:
- Do not write temporary debugging state directly into root-level entry files.
- Do not crystallize unverified conclusions into reusable knowledge.
- Do not use durable knowledge as a substitute for progress tracking.
```

## `quality-gates.md` Template

Note: Organize by content type, not by tool. Every content type should be able to point to an external checklist or supplementary specification.

```md
# Quality gates

These gates define the minimum checks required before content is published or
handed off as final.
Each content type has distinct failure modes, so checks are grouped by output
category.

## Code changes

Reference checklist:
- `docs/checklists/code-review.md`
- `docs/checklists/release-readiness.md`

Required checks:
- Lint passes.
- Typecheck passes.
- Relevant tests pass.
- Any skipped verification is explicitly disclosed.

## Documentation

Reference checklist:
- `docs/checklists/docs-quality.md`

Required checks:
- Commands and examples are accurate in the stated environment.
- Links and file references are valid at review time.
- Screenshots or UI descriptions match the current behavior.

## Reusable workflows and templates

Reference checklist:
- `docs/checklists/workflow-quality.md`

Required checks:
- Steps are numbered and unambiguous.
- Inputs, outputs, and owner per step are explicit.
- Resume path exists for interrupted work.
- Quality gate references are present.

## Sensitive or high-risk work

Reference checklist:
- `docs/checklists/security-review.md`
- `docs/checklists/approval-boundaries.md`

Required checks:
- Risks are disclosed explicitly.
- Approval boundary is documented.
- Rollback path is defined.
- Unresolved critical risks block handoff.
```

## `verification.md` Template

Note: This file specifically addresses anti-rationalization. It does not describe best practices — it only describes what does not count as verification and the required PASS/FAIL output format.

```md
# Verification rules

Verification must be independent from implementation.
This file exists to block rationalization and self-certification.

## Anti-rationalization rules

1. "It looks correct" is not verification.
2. "The AI already checked it" is not independent review.
3. "It probably works because similar code works" is not evidence.
4. "We ran out of time" does not convert an unchecked item into PASS.

## Required output format

Every verification result must use this format:

STATUS: PASS | FAIL
SCOPE: <what was verified>
EVIDENCE:
- <command, file, or observation>
- <command, file, or observation>
OPEN RISKS:
- <remaining risk or "none">
NEXT ACTION:
- <required fix, follow-up verification, or "handoff allowed">

## PASS criteria

PASS is allowed only when:
- The stated scope was actually checked.
- Evidence is concrete and reproducible.
- Any residual risk is minor and disclosed.

## FAIL criteria

FAIL is mandatory when:
- A required check was not run.
- Evidence is missing or indirect.
- A blocking issue or unresolved risk remains.
```

## Setup Order

1. Write `rules.md` first — define the behavior baseline.
2. Then add `dont.md` — turn incidents into institution.
3. Then write `quality-gates.md` — attach checks by output type.
4. Finally write `verification.md` — close the loop on self-convincing passes.
