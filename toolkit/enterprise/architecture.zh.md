---
title: 企业级 Harness 架构总览
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# 企业级 Harness 架构总览

这份参考给出的结论很直接：企业级 harness 不该从单个 prompt
或单次 tool call 出发设计，而要从六个持续协作的组件出发。真正稳定
的系统，不是模型更聪明，而是 Control Plane、Query Loop、Tool
Pipeline、Context Management、Error Recovery、Multi-Agent
六个组件的边界更清楚。

## 六组件关系图

先看全局图。这个图强调的不是调用顺序，而是谁为谁提供约束。

```text
+--------------------+      +--------------------+      +--------------------+
|   Control Plane    | ---> |     Query Loop     | ---> |   Tool Pipeline    |
| rules / policy /   |      | state / continue / |      | validate / auth /  |
| permissions        |      | stop / resume      |      | execute / process  |
+--------------------+      +--------------------+      +--------------------+
          |                            |                            |
          v                            v                            v
+--------------------+      +--------------------+      +--------------------+
| Context Management | <--> |   Error Recovery   | <--> |    Multi-Agent     |
| cache / compact /  |      | retry / abort /    |      | split / verify /   |
| memory boundary    |      | continuation       |      | coordinate         |
+--------------------+      +--------------------+      +--------------------+
```

## 六个组件分别解决什么

下面这张表把六个组件压缩成四个设计维度：核心问题、Claude Code
更偏运行时纪律的做法、Codex 更偏控制面结构的做法，以及企业实现时
必须自己拍板的设计决策。

| 组件 | 核心问题 | Claude Code approach | Codex approach | 需要拍板的设计决策 |
|------|----------|----------------------|----------------|--------------------|
| Control Plane | 谁能约束模型，约束放在哪一层？ | 动态 prompt 装配，`CLAUDE.md`、memory、hooks 一起进入运行时 | instruction fragments、tool schema、approval policy、sandbox 分层生效 | 规则来源是否单一；repo 规则与 session 规则谁优先；本地 override 如何审计 |
| Query Loop | 系统靠什么持续推进，而不是只答一轮？ | `while(true)` 主循环，continue 是显式状态转移 | thread / rollout / state bridge 承担连续性 | 状态存在内存、文件还是外部 store；continue 与 exit 条件如何观测 |
| Tool Pipeline | 工具是不是“说调就调”？ | 运行时 pipeline，危险工具有更细约束 | schema 校验、approval、sandbox、policy 链式裁决 | 哪些步骤 fail-closed；哪些工具默认不并发；谁能跳过 approval |
| Context Management | 上下文预算怎么花，压缩到什么程度？ | Prompt Cache 边界、snip / micro / collapse / compact | 结构化 state + thread continuity，减少对长会话单线程依赖 | 静态前缀如何缓存；何时压缩；压缩失败时是否切换恢复路径 |
| Error Recovery | 错误算异常还是主路径？ | prompt too long、max tokens、hook 阻塞都当主路径 | tool error、approval deny、sandbox reject 被结构化返回 | 重试预算、反复失败的 anti-loop guard、abort 语义、恢复后如何续写 |
| Multi-Agent | 什么时候该拆 agent，谁负责验证？ | 运行时角色分离，Verification Agent 独立于实现 | 显式委派、持久状态、可跟踪的 agent 协作 | 以复杂度还是不确定性切分；fork cache 如何复用；verifier 有哪些只读工具 |

## 设计判断顺序

企业实现时，顺序比组件清单更重要。建议先定 Control Plane，再定
Query Loop 和 Tool Pipeline，最后才优化 Context、Recovery
和 Multi-Agent。原因是前三者决定了谁有权做事、系统如何持续执行、
工具如何真正落地；后三者是在前者确定后才能稳定优化的能力。

## 推荐的最小企业落地顺序

如果你要从零做一套 enterprise harness，最小落地顺序如下。

1. 先定义 Control Plane 的规则来源、优先级链和审计面。
2. 再定义 Query Loop 的状态机、continue 条件和 abort 语义。
3. 然后给 Tool Pipeline 建 8 步治理链和 fail-closed 默认值。
4. 接着补 Context Management 的压缩层级和 cache 边界。
5. 再把 Error Recovery 提升为主路径，而不是散落在异常处理里。
6. 最后引入 Multi-Agent，把 split 和 verify 从单线程里拆出来。

## 这个架构最常见的误判

最常见的误判不是“少了某个组件”，而是把某个组件的职责偷偷塞给另一个
组件。例如，拿 prompt 文本代替权限系统，拿长摘要代替状态机，或拿“让
另一个 agent 再看一遍”代替独立验证。企业级 harness 的关键不是功能堆满，
而是每个组件只做自己的那一层控制。
