---
title: Workflow 模板与 progress 跟踪
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, workflow, progress, template, team]
---

# Workflow 模板与 progress 跟踪

这份模板服务原则 3、7、8、9：query loop 才是代理系统的心跳，中断后要能续跑，
实现与验证要分角色，工作流必须显式挂上质量门禁。

## Workflow definition 模板

下面是可复制的 `workflows/<name>.md` 模板。YAML frontmatter 统一包含：

- `name`
- `description`
- `agents`
- `quality_gates`
- `steps`

```md
---
name: <workflow-name>
description: <这个工作流解决什么问题，输出什么结果>
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

写明最终交付物、验收标准和阻塞条件。

## Inputs

- 必需输入 1
- 必需输入 2

## Outputs

- 产出 1
- 产出 2

## Step 1: <step-name>

Owner: <role>

Actions:
1. 写明要做的动作。
2. 写明需要读取的知识或规则。
3. 写明本步骤完成判定。

Quality gate:
- 对应的检查项或外部 checklist

Update progress:
- 完成后更新 `progress.md` 的 `current_step`、`last_updated` 和已完成清单。

## Step 2: <step-name>

Owner: <role>

Actions:
1. 写明要做的动作。
2. 写明需要保留的证据。
3. 写明本步骤完成判定。

Quality gate:
- 对应的检查项或外部 checklist

Update progress:
- 完成后同步进度，并记录下一步最小动作。
```

## `progress.md` 模板

下面是中断恢复用的跟踪模板。frontmatter 必须包含：

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

写明恢复工作时的下一个最小动作，不要写抽象口号。

## Context for resume

- 当前已确认的事实
- 尚未解决的阻塞项
- 需要读取的文件或日志
- 验证状态和缺口
```

## 完整示例：feature development workflow

```md
---
name: feature-development
description: 从需求澄清到实现、审查、验证与交付的标准功能开发工作流。
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

交付一个满足验收标准、带独立验证证据、可从中断状态恢复的功能改动。

## Inputs

- 明确的用户需求
- 相关领域知识与治理文件
- 当前代码与测试上下文

## Outputs

- 已实现改动
- 更新后的 `progress.md`
- 独立验证结论

## Step 1: scope and acceptance

Owner: architect

Actions:
1. 定义范围、非范围和可观察验收标准。
2. 识别涉及的模块、边界和风险。
3. 判断是否需要拆分成更小切片。

Quality gate:
- 验收标准可测试。
- 风险与回滚路径已写明。

Update progress:
- 将 `current_step` 更新为 2。
- 在 `Context for resume` 记录批准范围和阻塞项。

## Step 2: implement minimal slice

Owner: implementer

Actions:
1. 从最小可用切片开始实现。
2. 每完成一段即运行对应 lint/typecheck/test。
3. 保持 `progress.md` 与当前状态一致。

Quality gate:
- 实现不越界。
- 中间验证命令有证据。

Update progress:
- 勾选已完成步骤。
- 写清楚 reviewer 下一步要验证什么。

## Step 3: run verification

Owner: reviewer

Actions:
1. 独立运行 lint/typecheck/test 或内容型 gate。
2. 优先查找行为回归、证据缺口和遗漏风险。
3. 以 PASS/FAIL 格式输出结论。

Quality gate:
- `governance/verification.md`
- `governance/quality-gates.md`

Update progress:
- 将 `status` 更新为 `verified` 或 `blocked`。
- 在 `Context for resume` 记录失败原因或剩余风险。

## Step 4: package handoff

Owner: implementer

Actions:
1. 根据 Reviewer 结果修复或整理交付说明。
2. 汇总验收标准、风险和验证结论。
3. 准备 handoff 或提交。

Quality gate:
- 不允许跳过失败项直接 handoff。
- 交付说明必须引用验证结果。

Update progress:
- 全部完成后将 `status` 改为 `done`。
```

### 对应的 `progress.md` 示例

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

完成模板文件初稿后，运行自检并整理给 Reviewer 的验证范围。

## Context for resume

- 已确认范围：新增 7 个 team-level Harness Engineering 模板文件。
- 关键约束：所有文件必须有 frontmatter，正文以中文为主，hooks 示例需完整可复制。
- 待验证项：hooks JSON 结构、shell 脚本可读性、原则映射覆盖。
- 风险：如果没有 progress 跟踪，中断后容易丢失“当前做到第几步”的状态。
```

## 使用建议

- 每个超过 2 步的工作流都应有配套 `progress.md`。
- 每次中断前，至少更新一次 `Next action`。
- Reviewer 不修改实现，只更新验证结论或要求修复。
