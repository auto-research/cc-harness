---
title: Error recovery 设计参考
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Error recovery 设计参考

企业 harness 的恢复设计要先接受一个前提：agent failure 是稳定存在的，
不是偶发噪声。prompt too long、max output tokens、tool deny、
auto compact 失败、用户中断、hook 阻塞，这些都必须被当成生命周期事件。
如果你的系统还把它们放在“异常分支”，那主路径其实还没设计完。

## 错误为什么是主路径

错误路径之所以要升格为主路径，不是为了更保守，而是为了保护执行叙事一致性。
用户需要知道系统做到了哪一步、为什么停下、恢复后会从哪里继续，而不是只看到
一条泛化的 error message。

## 常见恢复事件

下面这些事件，建议直接进入统一 recovery taxonomy，而不是交给不同模块
各自处理。

| 事件 | 正确看法 | 推荐动作 |
|------|----------|----------|
| prompt too long | 生命周期事件，不是异常角落 | 触发 reactive compact，保留原始目标和最近失败证据 |
| max_output_tokens | 输出被截断，不等于任务失败 | 启动 continuation，带上 partial result 续写 |
| tool execution failed | 失败是结构化反馈 | 记录错误类型、次数、是否同构重复 |
| auto compact failed | recovery 需要 recovery | 进入更保守的恢复模式，必要时切新 thread |
| hook blocked | 制度层阻断，不是“工具坏了” | 暴露 deny reason，等待人工或策略调整 |
| user abort | 主动停止的一部分 | 写 checkpoint，保留 resume path |

## Reactive compact with anti-loop guard

reactive compact 常见的失败，不是压缩不够，而是进入 compact loop：
上下文太长，于是压缩；压缩结果又太长，于是再压缩；最后系统只剩下一串摘要，
目标和证据都被抹平。

因此 reactive compact 必须有 anti-loop guard：

1. 同一 checkpoint 上连续 reactive compact 超过阈值就停止。
2. 每次 compact 后都校验原始目标、最近失败证据、当前预算是否仍存在。
3. 如果 compact 后仍无法继续，升级为 `budget_exhausted` 或 `unsafe_state`，
   不要无限救火。

## max_output_tokens recovery by continuation

`max_output_tokens` 的正确恢复姿势通常不是重跑，而是 continuation。
因为这类失败说明模型正在推进，但输出被截断；如果你直接重跑，往往会重复生成、
浪费预算，甚至改变叙事。

一个最小 continuation 方案包含三部分：

| 必需信息 | 作用 |
|----------|------|
| partial result | 告诉下一轮已生成到哪里 |
| last intent | 告诉下一轮本来在完成什么动作 |
| output budget hint | 防止续写时再次撞上同样限制 |

## Auto compact failure: recovery needs recovery

auto compact 失败时，系统会暴露一个更底层的问题：你依赖的恢复机制本身也会
失败。企业实现里必须预留“恢复的恢复”路径，例如：

1. 从自动摘要降级为模板化 collapse。
2. 从同 thread 压缩降级为 checkpoint + new thread continuation。
3. 从自动恢复降级为人工 operator handoff。

如果系统没有这些降级层，auto compact 失败通常会直接把整个任务打进死路。

## Abort semantics

abort 语义一定要单独设计。它既不是 failure，也不是 completion，更不是
“暂时没做完”。建议至少区分下面三种：

| abort 类型 | 含义 | 恢复方式 |
|------------|------|----------|
| user_abort | 用户主动停下 | 等用户 resume |
| policy_abort | 权限或安全策略阻断 | 改策略或人工批准后 resume |
| operator_abort | 系统操作者主动终止 | 由 control plane 决定是否重开 |

把 abort 和 failure 混在一起，会直接伤害恢复体验。因为 failure
默认意味着“系统试过但被阻塞”，而 abort 意味着“系统被要求停下”。

## 恢复设计要保护什么

恢复机制最该保护的，不是某一轮模型输出来没出来，而是执行叙事是否连贯。
至少要保护下面四类信息。

1. 原始目标和验收标准。
2. 最近一次关键失败的证据。
3. 当前所处阶段与已完成成果。
4. 为什么停下，以及谁有权让它继续。

## 企业实现建议

如果你现在只想把 recovery 从“能报错”提升到“能续跑”，优先做下面四件事。

1. 把 prompt too long 和 max_output_tokens 都建成显式 event type。
2. 给 reactive compact 单独加 anti-loop guard。
3. 给 continuation 保存 partial result，而不是只写一句“继续”。
4. 区分 abort、failure、budget_exhausted 三种终止语义。
