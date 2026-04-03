---
title: Multi-agent 模式参考
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Multi-agent 模式参考

企业系统里是否拆 agent，不该先问任务有多复杂，而该先问不确定性是否可以
被分区。复杂但高度耦合的工作，拆 agent 往往只会制造 handoff 成本；不确定性
来源清晰、证据域不同、验证需要独立性的工作，才是真正适合 multi-agent
的对象。

## 何时拆 agent

最有效的判断标准不是复杂度，而是不确定性 partitioning。下面这张表可以
直接拿来做 split 判断。

| 情况 | 建议 | 原因 |
|------|------|------|
| 一个问题需要不同证据域，例如代码、文档、线上状态同时判断 | 拆 | 每个 agent 可携带更窄上下文 |
| 一个问题需要独立验证，避免实现者自我说服 | 拆 | verifier 必须与 implementer 解耦 |
| 一个问题只是文件很多，但决策高度耦合 | 不拆 | handoff 会放大上下文损耗 |
| 一个问题可并行探索多个假设 | 拆 | 多个探索路径天然适合 fork |
| 一个问题高度顺序化，下一步完全依赖上一步细节 | 谨慎 | coordinator 会成为瓶颈 |

## Fork path cache optimization

multi-agent 成本控制的关键，不是让更多 agent 并发，而是让它们的 fork path
尽量长时间共享同一段 static prefix。主线程先放稳定规则、工具定义、
项目约束，再按不同任务只追加最小的动态上下文。这样做的结果，是多个 agent
共享 cache 命中，而不是每个 agent 各自烧一遍前缀 token。

## Verification agent 设计

Verification Agent 的价值，不是“再看一遍”，而是用独立 prompt、
只读工具和 anti-rationalization 规则，打断实现者的叙事惯性。

| 设计点 | 建议 |
|--------|------|
| Prompt | 不复用 implementer 的目标叙事，改为“找证据判断是否通过” |
| Tools | 默认只读：Read、Grep、test runner、browser verify、日志查看 |
| Output | 强制 PASS / FAIL + evidence + open risks |
| Constraints | 不允许修改源文件，不允许把“看起来对”当验证 |
| Input | 只喂成果物、验收标准、必要上下文，不喂完整实现过程 |

独立 verifier 的关键不是更聪明，而是更少被实现过程污染。验证是天然适合
black-box 的任务，这也是它特别适合单独 agent 的原因。

## 从 Claude Code 可抽象的 5 类 task lifecycle

下面这五类 task type 适合作为企业 multi-agent 的最小生命周期模型。
这里的命名是架构抽象，不必与具体产品内部 class 名一字不差。

| task type | 目标 | 常见 owner |
|-----------|------|------------|
| discover | 找证据、建局部地图、缩小问题空间 | explorer / librarian |
| plan | 明确方案、边界、风险和验收标准 | planner / architect |
| implement | 产生改动、执行命令、推进主任务 | implementer / worker |
| verify | 独立检查结果是否满足标准 | verifier / reviewer |
| reconcile | 汇总结果、解决冲突、更新主叙事 | coordinator |

这个生命周期的重点在于：verify 和 implement 是不同 task type，不是
implement 的最后一步小尾巴。

## Coordinator pattern

Coordinator 不是“最强的 agent”，而是最克制的 agent。它的职责是维护主叙事、
分发子任务、合并结果、裁决下一步，而不是自己下场把所有事情做完。

一个合格的 coordinator 至少要做四件事：

1. 保存 authoritative task state。
2. 明确每个 sub-agent 的输入、输出和工具边界。
3. 在子任务返回后做 reconcile，而不是原样转发。
4. 在 verify 失败时阻断推进，而不是帮 implementer 合理化。

## 企业设计建议

如果你想把 multi-agent 做得稳，而不是做得热闹，优先落地下面三点。

1. 以不确定性分区做 split，而不是以文件数或步骤数做 split。
2. 给 verifier 单独 prompt、单独工具集和单独输出模板。
3. 让 coordinator 只拥有调度权和状态权，不默认拥有全部执行权。
