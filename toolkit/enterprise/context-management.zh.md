---
title: Context management 设计参考
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Context management 设计参考

企业 harness 的上下文管理不是“摘要一下历史消息”，而是分层压缩与缓存边界
设计。最稳妥的做法，是把压缩分成五个阶段：snip、micro、context
collapse、auto compact、reactive compact。阶段越靠后，成本越高，
副作用越大，恢复要求也越强。

## 五阶段压缩模型

下面这张表给出五阶段压缩的最小决策框架。建议把它直接做成实现前的设计表。

| 阶段 | what | when | cost | failure modes |
|------|------|------|------|---------------|
| snip | 剪掉低信息噪音，如重复确认、冗长日志尾部 | 单次 turn 内就能判定无价值时 | 很低 | 误删局部证据，导致后续复盘缺细节 |
| micro | 把短时间窗口压成细粒度摘要 | 最近若干 turn 开始膨胀，但细节仍重要 | 低到中 | 把临时失败压得太短，丢失失败序列 |
| context collapse | 把一段已完成工作折叠成 checkpoint 摘要 | 子任务完成、阶段切换、handoff 前 | 中 | goal drift，阶段目标被压成“做过了” |
| auto compact | 在接近阈值前自动触发压缩 | 预测下一轮会接近 budget 上限 | 中到高 | 自动压缩质量差，恢复信息不足 |
| reactive compact | 已到危险区或已经报错后救火压缩 | prompt too long、上下文超预算、thread 太重 | 很高 | 恢复叙事断裂，甚至进入 compact loop |

## 各阶段的角色边界

压缩阶段不要混用。snip 和 micro 面向局部清理，context collapse
面向阶段归档，auto compact 面向预算预防，reactive compact 面向
生存恢复。你可以共享底层摘要器，但不能把五个阶段当成同一条命令的不同参数，
否则运行时很难知道“这是优化”还是“这是救火”。

## static / dynamic boundary

Prompt Cache 的收益，来自稳定前缀最大化，而不是来自“缓存开关已打开”。
因此企业系统必须显式定义 static / dynamic boundary。

| 区域 | 应放内容 | 不该放内容 |
|------|----------|------------|
| static prefix | system rules、tool schema、稳定 repo 约束、长期 style 指令 | 本轮状态、临时 TODO、实时预算 |
| dynamic suffix | 当前 task、最新 checkpoint、active budget、pending tool result | 长期不变规则、重复工具说明 |

一个实用判断法是：如果这段内容跨十个 turn 都不会变，就尽量放在 static
prefix；如果它每一两轮就变，就放 dynamic suffix。

## Fork cache reuse

多 agent 场景里，Prompt Cache 的关键优化不是“再缓存一次”，而是让 fork
出来的 agent 共享尽可能长的前缀。也就是说，主线程和子线程要尽量共用
同一套 static prefix，只在 dynamic suffix 上分叉。

这带来两个直接好处：

1. 降 token 成本，因为缓存命中集中在高占比的前缀部分。
2. 降 prompt drift，因为主线程和子线程的行为基线更一致。

## 五阶段的设计提醒

每个阶段都要回答“压缩后谁还能用这份结果”。面向模型的摘要、面向协调器的
checkpoint、面向人工 operator 的进度说明，通常不是同一份文本。企业实现
里更推荐一份结构化 state，加一份人类可读 summary，而不是只保留自然语言。

## 什么时候不该压缩

有三类内容不建议直接进入压缩器，即使 budget 很紧也一样。

1. 原始目标和验收标准。它们必须单独保留，防止 goal drift。
2. 最近一次失败的关键证据。没有证据，下一轮很容易重复犯错。
3. 权限、deny、abort 的原始原因。恢复时必须知道系统为什么停下。

## 企业落地建议

如果你现在只能做一版 context management，优先做下面四件事。

1. 先定义 static / dynamic boundary。
2. 再实现 snip 和 context collapse 两层。
3. 然后给 auto compact 设软阈值，不要等 prompt too long 才开始。
4. 最后才做 reactive compact，并为它单独加 anti-loop guard。
