---
title: CLAUDE.md 三层模板指南
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, prompt-cache, template, team]
---

# CLAUDE.md 三层模板指南

这份模板指南面向团队级 Claude Code harness 设计。核心目标不是把
`CLAUDE.md` 写成“超长人设”，而是把稳定制度、按需加载和个人偏好拆到正确层级。
它主要服务原则 2、5、7、10：把 prompt 当控制面、把上下文当工作内存、把恢复能力
写入流程、把团队制度与个人偏好分离。

## 三层结构

### Layer 1: repo-level

- 文件位置：仓库根目录 `CLAUDE.md`
- 推荐大小：约 3 KB，宁短勿散
- 目标：放团队共享且稳定的边界、命令、目录地图、按需加载入口
- 不要放：当前分支状态、临时 TODO、个人口头禅、易变上下文

### Layer 2: directory-level

- 文件位置：子目录内 `CLAUDE.md`
- 推荐大小：每个 package 或 domain 约 300 bytes 到 800 bytes
- 目标：进入目录后再注入的局部约束，例如 package-specific commands、
  schema 要求、测试位置、禁改边界
- 不要放：仓库级重复规则

### Layer 3: personal-level

- 文件位置：`.claude/settings.local.json`
- 目标：只属于个人、不应提交的本地设置，例如个人 hook、沙箱偏好、
  本地 URL、实验性 override
- 不要放：要求团队共同遵守的制度

## Layer 1 模板要点

repo-level `CLAUDE.md` 要回答五个问题：

1. 先读什么。
2. 绝对不能做什么。
3. 常用验证命令是什么。
4. 仓库结构怎么分层。
5. 哪些内容按需加载，而不是开局全塞。

### Layer 1 完整示例

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

这个层级对应原则 2 和 10：规则先进入团队制度，再进入每次会话。

## Layer 2 模板要点

directory-level `CLAUDE.md` 只写“进入这个目录后必须立刻知道的事”。
如果一条规则离开该目录仍成立，它就不该写在这里。

### Layer 2 完整示例

下面示例假设目录是 `packages/payments/CLAUDE.md`。

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

这个层级对应原则 5：需要时才注入，不把 package 细节提前塞进根级记忆。

## Layer 3 模板要点

个人层不应该污染团队制度。适合放：

- 本地开发 URL
- 临时实验 hook
- 个人允许列表或提醒
- 机器相关路径

### Layer 3 完整示例

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

这个层级对应原则 10：个人效率手段不等于团队默认制度。

## Prompt Cache optimization

Prompt Cache 友好的关键不是“少写”，而是把稳定内容和易变内容分开，并把稳定内容放在
文件前部。Claude Code 的 memory 会自动加载，越稳定的内容越适合被缓存复用。

### 推荐静态区

放在 repo-level `CLAUDE.md` 前半部分：

- 项目定位
- 硬边界
- 常用命令
- 目录结构
- 角色分工
- 固定验证规则

这些内容跨 session 变化少，适合原则 2 和原则 5 所说的控制面与工作内存分离。

### 推荐动态区

不要直接写进 repo-level `CLAUDE.md`，而应放到以下位置：

- `progress.md`：当前做到哪一步，对应原则 3 和原则 7
- `.claude/settings.local.json`：个人实验设置
- 子目录 `CLAUDE.md`：局部领域约束
- hook 注入上下文：当前 dirty state、最新 typecheck 结果

### 静态与动态拆分示例

错误写法：

- 在根 `CLAUDE.md` 写“当前正在重构支付模块，记得看 `src/new/`”
- 在根 `CLAUDE.md` 写“今天 lint 挂在 `checkout.ts`”

正确写法：

- 根 `CLAUDE.md` 只写“多步骤任务必须维护 `progress.md`”
- 当前重构状态写进 workflow 对应的 `progress.md`
- 当次 lint / typecheck 结果由 `UserPromptSubmit` hook 注入

## 落地建议

1. 先把 repo-level `CLAUDE.md` 压到 3 KB 左右，只保留硬边界与入口。
2. 再为高风险目录补最小可用的 directory-level `CLAUDE.md`。
3. 最后把个人偏好和本地实验迁到 `.claude/settings.local.json`。

这样做的结果是：团队规则稳定、目录约束按需注入、个人偏好不污染共享制度，符合
Harness Engineering 的分层控制思路。
