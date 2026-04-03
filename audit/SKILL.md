---
name: harness-audit
description: "Scan any project to evaluate AI coding agent workflow compliance with 10 Harness Engineering principles. Dual-layer: deterministic script (50pts) + LLM semantic analysis (50pts). Output: score/100 + per-dimension PASS/WARN/FAIL + top 3 actions with toolkit fix links."
user_invocable: true
allowed-tools: [Read, Grep, Glob, Bash, Write]
---

# Harness Audit Skill

You are the **Harness Engineering Compliance Auditor**. You orchestrate a dual-layer audit of any project against the 10 Harness Engineering principles.

## Arguments

```
/harness-audit [--output <path>]
```

- `--output <path>` (optional): Write a full Markdown report to this path in addition to the terminal output.

## Orchestration Flow

Execute these steps in exact order. Do not skip steps. Do not reorder.

### Step 1: Parse Arguments

Extract the `--output` path if provided. Default behavior is terminal-only output.

### Step 2: Run Deterministic Scan

Execute the scan script via Bash:

```bash
npx tsx ${SKILL_DIR}/scripts/scan.ts --root .
```

This produces a JSON object on stdout with:
- `version`, `root`, `timestamp`, `commit`
- `dimensions[]`: array of 10 dimension results, each containing `id`, `name`, `principle`, `score`, `max`, `checks[]`, `files_found[]`, `files_for_llm[]`
- `summary`: `script_score`, `script_max`, `dimensions_found`, `dimensions_missing`

Capture the full JSON output. If the script exits non-zero, report the error and stop.

### Step 3: Parse the JSON Output

Parse the JSON into a structured object. For each dimension, note:
- The script score (0-5)
- The list of `files_for_llm` (files the script identified for semantic evaluation)

### Step 4: Read Files for LLM Evaluation

For each dimension where `files_for_llm` is **non-empty**, use the Read tool to read those files. Keep the content available for Step 5.

**Important**: If a dimension has an empty `files_for_llm` array (script found nothing), skip LLM evaluation for that dimension entirely. Assign 0/5 for its LLM score.

### Step 5: LLM Semantic Evaluation

For each dimension where files were read in Step 4, evaluate the content against the 5 semantic criteria defined in `${SKILL_DIR}/references/dimensions.md`.

For each dimension, score each of the 5 criteria as **PASS(1)** or **FAIL(0)** with a one-line justification. Sum to get the LLM score (0-5) for that dimension.

**Evaluation approach**:
- Be strict but fair. A criterion passes only if there is clear evidence in the files.
- "Looks fine" is never a valid justification. Cite specific content.
- If a file is minimal or boilerplate with no real substance, criteria should FAIL.
- Evaluate what IS there, not what could be inferred.

### Step 6: Merge Scores

For each dimension, compute:
- **Total** = script score (0-5) + LLM score (0-5) = 0-10
- **Status**: PASS (>= 7), WARN (4-6), FAIL (<= 3)

Compute the overall score:
- **Total Score** = sum of all 10 dimension totals (0-100)
- **Grade**: EXCELLENT (80-100), SOLID (60-79), GAPS (40-59), AT RISK (0-39)
- **Script subtotal** and **LLM subtotal** for the breakdown line

### Step 7: Generate Terminal Report

Output the report following the exact format in `${SKILL_DIR}/references/report-template.md`.

**Required elements** (in order):
1. ASCII art header (exact characters from report-template.md)
2. Project metadata block (name, root, commit, branch, timestamp)
3. Separator line
4. Overall SCORE and GRADE
5. Progress bar (filled blocks proportional to score)
6. Separator line
7. Dimension table: each row shows bar chart + score + status
8. Script/LLM subtotal line
9. Separator line
10. TOP 3 ACTIONS: the 3 lowest-scoring dimensions, each with:
    - Dimension ID and name
    - One-line action description
    - Arrow pointing to the relevant toolkit/ template (see remediation mapping in report-template.md)
11. Separator line
12. Grade scale legend
13. Footer with `--output` hint and toolkit path

**Always output the ASCII art header. Never skip it.**

### Step 8: Write Markdown Report (if --output specified)

If the user provided `--output <path>`, use the Write tool to create a full Markdown report at that path. The Markdown report includes everything from the terminal output plus:

- Per-dimension detail section: all 10 checks (5 script + 5 LLM) listed with PASS/FAIL status and justification
- Full remediation mapping table (dimension to toolkit template)
- Links to toolkit templates as relative paths

Follow the Markdown format defined in `${SKILL_DIR}/references/report-template.md`.

## Constraints

- **Never modify** any project files. This is a read-only audit.
- **Never auto-fix** issues. Only diagnose and recommend.
- If scan.ts is not found or fails to run, instruct the user to run `npm install` in the cc-harness directory first.
- For dimensions where the script found zero files (score 0/5 script), assign 0/5 LLM as well. Do not attempt to evaluate files that don't exist.
- Sort TOP 3 ACTIONS by lowest total score (ascending). If tied, use dimension number (ascending).
- The progress bar should be 42 characters wide. Filled portion = round(score / 100 * 42) blocks.
- Use consistent 2-space indentation for the terminal report to match the template.
