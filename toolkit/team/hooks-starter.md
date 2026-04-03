---
title: Claude Hooks Starter Templates
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, hooks, template, team]
---

[中文版](./hooks-starter.zh.md)

# Claude Hooks Starter Templates

This set of starter hooks brings principles 4, 6, 7, and 10 into the Claude Code lifecycle:

- Tools are managed execution interfaces
- The error path is the main path
- Recovery means getting back to work
- Team institution must be enforced automatically, not by memory

The content below follows the official Claude Code hooks/settings structure and can be copied directly into `.claude/settings.json` and `.claude/hooks/*.sh`. Scripts depend on `jq` and a standard Node toolchain.

## `.claude/settings.json` Complete Hooks Block

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/user-prompt-health-check.sh",
            "timeout": 25
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/write-guard.sh",
            "timeout": 10
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/bash-guard.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-write-lint.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Hook 1: UserPromptSubmit Health Check

Purpose:

- Inject repo health context on every prompt submission
- Run `git status`
- Attempt `typecheck`
- Detect dirty state left behind by an interrupted session

Script path: `.claude/hooks/user-prompt-health-check.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT"

payload="$(cat)"
prompt="$(printf '%s' "$payload" | jq -r '.prompt // ""')"

git_summary="not a git repository"
dirty_count=0
dirty_files=""
interrupted_resume_hint=""

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_summary="$(git status --short)"
  dirty_files="$(printf '%s\n' "$git_summary" | sed '/^$/d' || true)"
  dirty_count="$(printf '%s\n' "$dirty_files" | sed '/^$/d' | wc -l | tr -d ' ')"

  if [ "${dirty_count:-0}" -gt 0 ]; then
    progress_file="$(find "$ROOT/workflows" -name 'progress.md' -print -quit 2>/dev/null || true)"
    if [ -n "$progress_file" ]; then
      current_step="$(grep -E '^current_step:' "$progress_file" | head -n 1 | cut -d':' -f2- | xargs || true)"
      status="$(grep -E '^status:' "$progress_file" | head -n 1 | cut -d':' -f2- | xargs || true)"
      interrupted_resume_hint="Dirty working tree detected. Possible interrupted session. Resume from progress file: ${progress_file#$ROOT/} (status=${status:-unknown}, current_step=${current_step:-unknown})."
    else
      interrupted_resume_hint="Dirty working tree detected but no progress.md found. Confirm whether these edits are intentional before continuing."
    fi
  fi
fi

typecheck_summary="typecheck skipped: no package.json"

if [ -f package.json ]; then
  if jq -e '.scripts.typecheck' package.json >/dev/null 2>&1; then
    if typecheck_output="$(npm run -s typecheck 2>&1)"; then
      typecheck_summary="typecheck passed"
    else
      typecheck_summary="typecheck failed: $(printf '%s' "$typecheck_output" | tail -n 20)"
    fi
  else
    typecheck_summary="typecheck skipped: package.json has no typecheck script"
  fi
fi

additional_context=$(
  cat <<EOF
Prompt health summary
- Prompt length: ${#prompt}
- Dirty file count: ${dirty_count:-0}
- Git status:
${dirty_files:-clean}
- ${typecheck_summary}
- ${interrupted_resume_hint:-No interrupted-session signal detected.}
EOF
)

jq -n \
  --arg additionalContext "$additional_context" \
  '{
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: $additionalContext
    }
  }'
```

## Hook 2: PreToolUse Write Guard

Purpose:

- Inject package-specific constraints based on `file_path`
- Turn directory rules into runtime constraints
- Prevent missing local boundaries before a write

Script path: `.claude/hooks/write-guard.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')"

case "$file_path" in
  packages/api/*)
    constraints=$'Editing packages/api\n- Validate all external input at the route boundary.\n- Keep handlers thin; move business rules into domain services.\n- Never concatenate SQL or build unsafe shell commands from request input.'
    ;;
  packages/web/*)
    constraints=$'Editing packages/web\n- Preserve established design tokens and accessibility semantics.\n- Do not introduce ad hoc colors or spacing values without updating tokens.\n- Keep data fetching and rendering concerns separated.'
    ;;
  knowledge/*)
    constraints=$'Editing knowledge\n- Keep frontmatter complete and accurate.\n- Prefer stable decisions, lessons, and reusable templates over session notes.\n- Use Chinese as the primary language when the knowledge base already does so.'
    ;;
  governance/*)
    constraints=$'Editing governance\n- Every new prohibition needs a source lesson.\n- Every quality gate must be testable by another reviewer.\n- Do not weaken verification language without naming the tradeoff.'
    ;;
  workflows/*)
    constraints=$'Editing workflows\n- Number steps explicitly.\n- Define quality gates and resume points.\n- Keep progress tracking compatible with interrupted-session recovery.'
    ;;
  *)
    constraints=$'General write guard\n- Preserve repository architecture boundaries.\n- Prefer maintainable structure over local shortcuts.\n- Surface risks when changing shared templates or rules.'
    ;;
esac

jq -n \
  --arg msg "$constraints" \
  '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Write guard applied"
    },
    systemMessage: $msg
  }'
```

## Hook 3: PreToolUse Bash Guard

Purpose:

- Intercept high-risk shell behaviors
- Block publish, force-push, and `rm -rf` by default
- Turn principles 4 and 10 into machine-enforceable boundaries

Script path: `.claude/hooks/bash-guard.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
command="$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')"

deny_reason=""

if printf '%s' "$command" | grep -Eq '(^|[[:space:]])(npm|pnpm|yarn)[[:space:]]+publish([[:space:]]|$)'; then
  deny_reason="Blocked: publish commands require explicit user approval and a release workflow."
elif printf '%s' "$command" | grep -Eq 'git[[:space:]]+push([^[:alnum:]]+.*)?[[:space:]]+--force($|[[:space:]])|git[[:space:]]+push([^[:alnum:]]+.*)?[[:space:]]+-f($|[[:space:]])'; then
  deny_reason="Blocked: force-push is forbidden by default."
elif printf '%s' "$command" | grep -Eq '(^|[;&|[:space:]])rm[[:space:]]+-rf([[:space:]]|$)'; then
  deny_reason="Blocked: rm -rf is forbidden by default."
fi

if [ -n "$deny_reason" ]; then
  jq -n \
    --arg reason "$deny_reason Command: $command" \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
else
  jq -n \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "Command passed bash guard"
      }
    }'
fi
```

## Hook 4: PostToolUse Write Lint

Purpose:

- Run `eslint` on modified `.ts` / `.tsx` files after a write
- Feed lint failures back to Claude immediately
- Surface errors as early as possible rather than letting them accumulate until the end

Script path: `.claude/hooks/post-write-lint.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT"

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')"

if ! printf '%s' "$file_path" | grep -Eq '\.tsx?$'; then
  exit 0
fi

changed_files="$(git diff --name-only -- '*.ts' '*.tsx' 2>/dev/null || true)"

if [ -z "$changed_files" ]; then
  exit 0
fi

if [ -x ./node_modules/.bin/eslint ]; then
  eslint_cmd="./node_modules/.bin/eslint"
elif command -v pnpm >/dev/null 2>&1; then
  eslint_cmd="pnpm exec eslint"
elif command -v npx >/dev/null 2>&1; then
  eslint_cmd="npx eslint"
else
  jq -n \
    '{
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: "eslint skipped: no runnable eslint binary found"
      }
    }'
  exit 0
fi

set +e
lint_output="$(printf '%s\n' "$changed_files" | xargs $eslint_cmd 2>&1)"
lint_exit=$?
set -e

if [ "$lint_exit" -ne 0 ]; then
  jq -n \
    --arg reason "eslint failed on modified TypeScript files" \
    --arg details "$lint_output" \
    '{
      decision: "block",
      reason: $reason,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: $details
      }
    }'
else
  jq -n \
    --arg details "eslint passed on modified TypeScript files" \
    '{
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: $details
      }
    }'
fi
```

## Activation Steps

1. Create the directory: `.claude/hooks/`
2. Save each script above to its corresponding path.
3. Run: `chmod +x .claude/hooks/*.sh`
4. Merge the hooks block into `.claude/settings.json`
5. Run `/hooks` in Claude Code to confirm registration

## Design Intent

- Hook 1 corresponds to principle 7: detects dirty state after an interruption and guides recovery.
- Hook 2 corresponds to principles 5 and 10: directory constraints are injected on demand and driven by institution.
- Hook 3 corresponds to principle 4: brings dangerous Bash operations under governance.
- Hook 4 corresponds to principle 6: exposes lint failures immediately after a write — no "write now, check later."
