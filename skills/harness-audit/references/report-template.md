# Report Template

Two output formats: terminal (always shown) and Markdown (optional, via `--output`).

---

## Terminal Format

Output this exactly, substituting placeholders with actual values. Use 2-space indentation throughout.

```
  ╦ ╦╔═╗╦═╗╔╗╔╔═╗╔═╗╔═╗  ╔═╗╦ ╦╔╦╗╦╔╦╗
  ╠═╣╠═╣╠╦╝║║║║╣ ╚═╗╚═╗  ╠═╣║ ║ ║║║ ║
  ╩ ╩╩ ╩╩╚═╝╚╝╚═╝╚═╝╚═╝  ╩ ╩╚═╝═╩╝╩ ╩
  v1.0.0 · Harness Engineering Compliance Audit

  Project    {project_name}
  Root       {root_path}
  Commit     {commit} ({branch})
  Scanned    {timestamp}

  ──────────────────────────────────────────────

  SCORE  {total} / 100                    {grade}

  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  {progress_bar}
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

  ──────────────────────────────────────────────

  {dimension_rows}

              Script  {script_score}/{script_max} ·  LLM  {llm_score}/{llm_max}

  ──────────────────────────────────────────────

  TOP 3 ACTIONS

  {action_1}

  {action_2}

  {action_3}

  ──────────────────────────────────────────────

  GRADE SCALE
  ■ 80-100 EXCELLENT   ■ 60-79 SOLID
  ■ 40-59 GAPS         ■  0-39 AT RISK

  ──────────────────────────────────────────────

  Full report: harness-audit --output report.md
  Toolkit:     toolkit/README.md
```

### Placeholder Definitions

- `{project_name}`: basename of the root directory
- `{root_path}`: absolute path to the scanned root
- `{commit}`: short commit hash from scan output
- `{branch}`: current git branch name
- `{timestamp}`: scan timestamp in `YYYY-MM-DD HH:MM:SS` format
- `{total}`: overall score (0-100)
- `{grade}`: one of EXCELLENT, SOLID, GAPS, AT RISK
- `{progress_bar}`: 42 characters wide. Filled blocks = `round(total / 100 * 42)` using `█`, unfilled using `░`
- `{script_score}` / `{script_max}`: deterministic scan subtotals
- `{llm_score}` / `{llm_max}`: LLM evaluation subtotals

### Dimension Row Format

Each dimension row follows this format:

```
  P{n}  {name_padded}  {bar}  {score}/10  {status}
```

- `{name_padded}`: dimension name padded to 24 characters
- `{bar}`: 10-character bar using `█` for filled and `░` for empty, proportional to score/10
- `{score}`: total score for this dimension (script + LLM, 0-10)
- `{status}`: PASS (>= 7), WARN (4-6), FAIL (<= 3)

### Action Row Format

Each action row:

```
  {rank}  P{n}  {name}  ·····················
     {one_line_recommendation}
     → {toolkit_template_path}
```

- `{rank}`: 1, 2, or 3
- Dot leaders fill to a consistent width for visual alignment
- `{one_line_recommendation}`: a brief, actionable recommendation
- `{toolkit_template_path}`: relative path to the recommended toolkit template

### Grade Scale

| Range   | Grade     |
|---------|-----------|
| 80-100  | EXCELLENT |
| 60-79   | SOLID     |
| 40-59   | GAPS      |
| 0-39    | AT RISK   |

---

## Markdown Format

The Markdown report is a full document written to the `--output` path.

```markdown
# Harness Engineering Audit Report

| Field    | Value            |
|----------|------------------|
| Project  | {project_name}   |
| Root     | {root_path}      |
| Commit   | {commit} ({branch}) |
| Scanned  | {timestamp}      |
| Score    | **{total} / 100** ({grade}) |
| Script   | {script_score} / {script_max} |
| LLM      | {llm_score} / {llm_max} |

---

## Score Summary

| Dimension | Name | Script | LLM | Total | Status |
|-----------|------|--------|-----|-------|--------|
| P1 | Constraint Codification | {s}/5 | {l}/5 | {t}/10 | {status} |
| P2 | Control Plane Layering | {s}/5 | {l}/5 | {t}/10 | {status} |
| ... | ... | ... | ... | ... | ... |

---

## Dimension Details

### P1 Constraint Codification

**Principle**: Model is an unstable component

**Script Checks** ({script_score}/5):

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | Prohibition file exists | PASS | governance/dont.md |
| 2 | Item count >= 3 | PASS | 5 rules |
| 3 | Non-empty content > 200 chars | PASS | — |
| 4 | Structured format | PASS | Each item has ## heading |
| 5 | File is git-tracked | FAIL | untracked |

**LLM Evaluation** ({llm_score}/5):

| # | Criterion | Result | Justification |
|---|-----------|--------|---------------|
| 1 | Specific trigger scenarios | PASS | Each rule opens with a specific trigger ("before publishing...") |
| 2 | Traceable lessons | PASS | References 2026-02-16 incident with specific details |
| 3 | Actionable prohibitions | PASS | "Don't publish without running data-verification-checklist.md" |
| 4 | No overlapping rules | PASS | 5 rules cover 5 distinct failure modes |
| 5 | Covers high-frequency incidents | FAIL | Missing rule for secret leak prevention |

*(Repeat for all 10 dimensions)*

---

## Top 3 Actions

### 1. P{n} — {dimension_name}

**Score**: {total}/10 ({status})

**Recommendation**: {one_line_recommendation}

**Template**: [{toolkit_template_path}]({toolkit_template_path})

*(Repeat for top 3)*

---

## Remediation Mapping

| Dimension | Recommended Template | Section |
|-----------|---------------------|---------|
| P1 Constraint Codification | toolkit/team/governance-starter.md | dont.md section |
| P2 Control Plane Layering | toolkit/team/claude-md-template.md | Three-layer structure |
| P3 Workflow Continuity | toolkit/team/workflow-template.md | Full workflow |
| P4 Tool Governance | toolkit/team/hooks-starter.md | Four hook types |
| P5 Context Budget | toolkit/team/claude-md-template.md | Directory-level section |
| P6 Error Path | toolkit/team/hooks-starter.md | PostToolUse section |
| P7 Interruption Recovery | toolkit/team/workflow-template.md | Progress section |
| P8 Role Separation | toolkit/team/agent-roles-template.md | Three preset roles |
| P9 Independent Verification | toolkit/team/governance-starter.md | Verification section |
| P10 Team Institution | toolkit/team/governance-starter.md | Rules + quality-gates section |

---

*Generated by [cc-harness](https://github.com/auto-research/cc-harness) v1.0.0*
```

---

## Remediation Mapping Reference

This table maps each dimension to the toolkit template that addresses it. Used by both the terminal TOP 3 ACTIONS and the Markdown report.

| Dimension | Template Path | Focus Area |
|-----------|--------------|------------|
| P1 Constraint Codification | `toolkit/team/governance-starter.md` | dont.md section — explicit prohibition rules |
| P2 Control Plane Layering | `toolkit/team/claude-md-template.md` | Three-layer structure: repo, directory, on-demand |
| P3 Workflow Continuity | `toolkit/team/workflow-template.md` | Step-based workflow with quality gates and progress tracking |
| P4 Tool Governance | `toolkit/team/hooks-starter.md` | PreToolUse, PostToolUse, UserPromptSubmit, Stop hooks |
| P5 Context Budget | `toolkit/team/claude-md-template.md` | Directory-level entry files and token budget strategy |
| P6 Error Path | `toolkit/team/hooks-starter.md` | PostToolUse lint/typecheck hooks and escalation paths |
| P7 Interruption Recovery | `toolkit/team/workflow-template.md` | Progress template with frontmatter and resume guidance |
| P8 Role Separation | `toolkit/team/agent-roles-template.md` | Role definitions with tools, knowledge, and constraints |
| P9 Independent Verification | `toolkit/team/governance-starter.md` | Verification section with anti-rationalization rules |
| P10 Team Institution | `toolkit/team/governance-starter.md` | Rules, quality-gates, and maintenance mechanism |
