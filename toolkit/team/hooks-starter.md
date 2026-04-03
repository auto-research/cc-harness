---
title: Claude hooks 启动模板
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, hooks, template, team]
---

# Claude hooks 启动模板

这组 starter hooks 把原则 4、6、7、10 落到 Claude Code 生命周期里：

- 工具是受管执行接口
- 错误路径就是主路径
- 恢复的目标是继续工作
- 团队制度必须自动挂钩，而不是靠人记

下面内容按 Claude Code 官方 hooks/settings 结构编写，可直接复制到
`.claude/settings.json` 与 `.claude/hooks/*.sh`。脚本依赖 `jq` 与常见 Node
工具链。

## `.claude/settings.json` 完整 hooks block

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

## Hook 1: UserPromptSubmit health check

用途：

- 每次提交 prompt 时注入 repo health context
- 执行 `git status`
- 尝试执行 `typecheck`
- 识别上次 session 中断后留下的 dirty state

脚本路径：`.claude/hooks/user-prompt-health-check.sh`

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

## Hook 2: PreToolUse Write guard

用途：

- 根据 `file_path` 注入 package-specific constraints
- 把目录规则变成运行时约束
- 避免在写入前遗漏局部边界

脚本路径：`.claude/hooks/write-guard.sh`

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

## Hook 3: PreToolUse Bash guard

用途：

- 拦截高风险 shell 行为
- 默认阻止发布、force-push、`rm -rf`
- 把原则 4 和原则 10 变成机器可执行的边界

脚本路径：`.claude/hooks/bash-guard.sh`

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

## Hook 4: PostToolUse Write lint

用途：

- 在写入后对已修改的 `.ts` / `.tsx` 文件执行 `eslint`
- 将 lint 失败立即反馈给 Claude
- 让错误路径尽早暴露，而不是堆到最后统一爆炸

脚本路径：`.claude/hooks/post-write-lint.sh`

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

## 启用步骤

1. 创建目录：`.claude/hooks/`
2. 将以上脚本分别保存到对应路径。
3. 执行：`chmod +x .claude/hooks/*.sh`
4. 将 hooks block 合并进 `.claude/settings.json`
5. 在 Claude Code 中运行 `/hooks` 确认已注册

## 设计意图

- Hook 1 对应原则 7：检测中断后的 dirty state，并引导恢复。
- Hook 2 对应原则 5 和原则 10：目录约束按需注入，且由制度驱动。
- Hook 3 对应原则 4：把危险 Bash 操作纳入治理。
- Hook 4 对应原则 6：写完即暴露 lint 失败，不允许“先写再说”。
