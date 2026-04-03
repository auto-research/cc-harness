---
title: 企业级 Harness 设计检查清单
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# 企业级 Harness 设计检查清单

这份清单把企业 harness 拆成六个组件来审计。目标不是打分，而是快速看清你的
系统更像 Claude Code 式的 runtime discipline，还是更像 Codex
式的 control plane structure，以及最脆弱的地方到底在哪。

## 如何使用这份清单

每一项只回答 `Yes`、`No` 或 `Partial`。`Yes` 表示已有可验证机制；
`Partial` 表示有做法但不稳定或未制度化；`No` 表示还没有明确设计。

## 1. Control Plane

这一组问题检查你的规则是不是已经脱离“口头约定”，进入了可执行制度层。

1. 你是否有单独的 control plane，而不是把规则散落在 prompt 文本里？
2. 规则优先级是否明确定义，例如 override > repo > agent > session？
3. settings deny、policy deny、sandbox deny 是否能分别追溯来源？
4. 本地规则修改是否有审计面，而不是静默生效？

## 2. Query Loop

这一组问题检查系统是否真的拥有持续执行能力，而不是被动多轮对话。

5. query loop 是否有显式 continue 条件，而不是“只要还没停就继续”？
6. exit reason 是否区分 completion、failure、abort、budget_exhausted？
7. authoritative state 是否有明确位置，而不是分散在对话历史里？
8. 中断恢复是否能从 checkpoint 继续，而不是靠人工复制上下文？

## 3. Tool Pipeline

这一组问题检查工具调用是否已经进入治理链，而不是模型自由发挥。

9. 工具发现、校验、风险评估、权限裁决是否是分离步骤？
10. 新工具未声明关键元数据时，系统是否默认 fail-closed？
11. hook allow 是否无法绕过 settings deny 或 sandbox deny？
12. 写操作后是否默认进入 post-hook 或 verification 流程？

## 4. Context Management

这一组问题检查你的上下文预算是否被管理，而不是被动消耗。

13. 你是否定义了 static prefix 和 dynamic suffix 的边界？
14. 你是否至少有 snip 和 context collapse 两层压缩？
15. 原始目标、验收标准、最近失败证据是否被单独保留？
16. 子 agent fork 时是否尽量复用主线程的 cacheable prefix？

## 5. Error Recovery

这一组问题检查系统是否把失败当成稳定事件来设计。

17. prompt too long 是否被建模为显式 recovery event？
18. `max_output_tokens` 是否通过 continuation 恢复，而不是简单重跑？
19. reactive compact 是否有 anti-loop guard？
20. abort 是否与 failure 分开建模，并保留恢复语义？

## 6. Multi-Agent

这一组问题检查多 agent 是否真的服务于不确定性分区和独立验证。

21. 你拆 agent 的标准是否是不确定性 partitioning，而不是任务看起来复杂？
22. verifier 是否拥有独立 prompt，而不是 implementer prompt 的副本？
23. verifier 是否默认只读，不直接修改主产物？
24. coordinator 是否维护 authoritative state，而不是只转发消息？
25. discover、plan、implement、verify、reconcile 五类 task type
    是否在系统中有清晰 owner？

## 诊断：你更像哪一类系统

下面这个诊断不是高低分判断，而是风格判断。目的是帮助你识别“秩序安放在哪”。

### 更像 Claude Code：runtime discipline

如果你对下面的问题大多回答 `Yes`，你的系统更偏 Claude Code 式运行时纪律。

- 是否更重视 query loop、context compact、resume path、hook 治理？
- 是否把错误恢复和执行连续性放在最核心的位置？
- 是否经常通过 workflow、checkpoint、Verification Agent 来补强稳定性？

### 更像 Codex：control plane structure

如果你对下面的问题大多回答 `Yes`，你的系统更偏 Codex 式控制面结构。

- 是否更重视 instruction layering、schema、approval policy、sandbox？
- 是否把权限边界和工具契约看得比长会话连续性更核心？
- 是否通过 thread/state bridge、显式委派和结构化工具结果来管理复杂度？

## 如何解读结果

如果你的系统明显偏向其中一侧，这不一定是问题。真正的问题是：你的主要不确定性
在另一侧，但设计资源却还没投过去。

- 更像 Claude Code，但权限边界混乱：先补 Control Plane 和 Tool Pipeline。
- 更像 Codex，但长任务容易失控：先补 Query Loop、Context、Recovery。
- 两边都不强：先做最小治理链，再考虑高级多 agent。

## 最小通过线

如果这 25 项里，`No` 超过 8 项，说明系统还不适合承接企业级长任务。
优先补的顺序建议如下。

1. 先补 Control Plane 和 Tool Pipeline。
2. 再补 Query Loop 和 Error Recovery。
3. 然后补 Context Management。
4. 最后再把 Multi-Agent 从“能拆”做成“拆得对”。
