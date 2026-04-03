---
title: Governance 启动模板
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, governance, template, team]
---

# Governance 启动模板

这份 starter 覆盖四个团队治理文件：`rules.md`、`dont.md`、`quality-gates.md`、
`verification.md`。它对应原则 1、6、9、10：把经验沉淀成制度，把失败路径写成主路径，
把验证独立化，把团队约束显式化。

## `rules.md` 模板

说明：这个文件定义共享行为基线。重点不是列口号，而是把可执行的输出规则、验收标准、
风险披露、维护性、知识加载、agent 边界写清楚。

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

## `dont.md` 模板

说明：每一条禁令都要有触发场景、来源教训、具体禁止行为。没有 source lesson 的禁令，
很容易退化成个人口味。

```md
# Governance don'ts

This file turns repeated mistakes into non-negotiable prohibitions.
If a task matches one of these scenarios, stop the prohibited behavior before
continuing.

## [禁令标题 1]

触发场景：填写会触发本禁令的具体工作类型。

来源教训：写明事故、复盘、客户反馈、线上故障或历史文档来源。

具体禁止行为：
- 禁止行为 1
- 禁止行为 2
- 禁止行为 3

## [禁令标题 2]

触发场景：填写会触发本禁令的具体工作类型。

来源教训：写明事故、复盘、客户反馈、线上故障或历史文档来源。

具体禁止行为：
- 禁止行为 1
- 禁止行为 2
- 禁止行为 3
```

### 可直接改写的示例条目

```md
## 未验证就宣称完成

触发场景：代码、模板、工作流或内容交付前需要宣称“已完成”。

来源教训：历史交付中多次出现实现者把“自己读了一遍”当成验证，导致回归和漏检进入主线。

具体禁止行为：
- 禁止在没有独立验证证据的情况下宣称“已通过验证”。
- 禁止把“AI 已检查过”当成独立审查。
- 禁止省略失败日志或跳过关键命令后直接给 PASS。

## 临时上下文污染长期知识

触发场景：把一次会话中的临时状态、调试笔记或未定结论写入知识库或全局规则。

来源教训：历史上曾把 session 级 TODO 写进共享入口文件，导致后续会话加载过期信息。

具体禁止行为：
- 禁止把临时调试状态直接写进根级入口文件。
- 禁止把未验证结论沉淀为 reusable knowledge。
- 禁止用 durable knowledge 代替 progress tracking。
```

## `quality-gates.md` 模板

说明：按内容类型组织，不按工具组织。每种内容都要能指向外部 checklist 或补充规范。

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

## `verification.md` 模板

说明：这个文件专门处理反合理化。它不讲“最好怎么做”，只讲“什么不算验证”以及
PASS/FAIL 输出格式。

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

## 使用顺序

1. 先写 `rules.md`，定义行为基线。
2. 再补 `dont.md`，把事故写成制度。
3. 然后写 `quality-gates.md`，按输出类型挂检查。
4. 最后写 `verification.md`，堵住“自我说服式通过”。
