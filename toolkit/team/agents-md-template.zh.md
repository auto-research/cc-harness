---
title: AGENTS.md 模板指南
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, codex, agents-md, template, team]
---

# AGENTS.md 模板指南

这份模板面向 Codex 侧的团队制度设计。它主要服务原则 1、2、8、9、10：不要把模型当
可靠同事、把 prompt 视为控制面、用角色分离取代人海战术、把独立验证写进制度。

## AGENTS.md 与 CLAUDE.md 的哲学差异

`CLAUDE.md` 的重点是让现场规则进入 conversation，让 Claude Code 在运行时更快拿到
当前项目的约束与入口。

`AGENTS.md` 的重点是让规则进入 institution，让 Codex 在仓库边界内先理解：

- 谁负责什么
- 先读什么
- 哪些规则是全局绑定
- 哪些领域知识要按需加载

可以把它理解为：

- `CLAUDE.md` 偏运行时记忆入口
- `AGENTS.md` 偏制度入口与责任边界

这正对应原则 10：团队制度优先于个人技巧。

## 层级、作用域与优先级

团队写 `AGENTS.md` 时，建议明确以下优先级链：

1. 平台 system / developer instructions
2. 仓库根 `AGENTS.md`
3. 根 `AGENTS.md` 引用的治理文件，例如 `governance/rules.md`
4. 子目录或领域级 `AGENT.md`
5. 当前任务的用户要求

实践规则：

- 根 `AGENTS.md` 负责制度入口，不负责细节大全。
- 领域 `AGENT.md` 负责 domain ownership，不重写全局规则。
- 用户请求可以加任务目标，但不能推翻高优先级安全边界。

## 推荐结构

一个团队级 `AGENTS.md` 建议回答六件事：

1. 先读哪些共享规则。
2. 仓库有哪些层。
3. 领域 agent 在哪里。
4. 知识应如何按需加载。
5. 哪些质量门禁必须经过。
6. 哪些任务必须转交给明确 owner。

## 完整模板示例

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

## 写法建议

### 该写什么

- 仓库级行为基线
- 目录层次与知识入口
- agent 发现路径
- 责任边界
- 共享质量门禁

### 不该写什么

- 某个 package 的函数命名细节
- 临时调试步骤
- 个人快捷命令
- 会快速过期的 session 状态

## 与 Harness principles 的对应

- 原则 1：不要假设模型会自己找到正确边界。
- 原则 2：用层级化文本把控制面拆清楚。
- 原则 8：角色与责任先分离，再协作。
- 原则 9：验证不挂在实现者自己身上。
- 原则 10：把“怎么做事”写成团队制度，而不是口口相传。
