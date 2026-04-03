---
title: Query loop 设计参考
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Query loop 设计参考

这份参考的核心结论是：query loop 不是“多轮对话”这么简单，它是
企业 agent 的执行心跳。你需要先决定状态放哪里、什么条件继续、什么条件
退出、被打断以后靠什么恢复，然后再写代码。顺序反过来，系统通常会退化成
“能跑，但很难恢复”的长 prompt 自动机。

## 状态应该放在哪里

状态放置要先按恢复半径来分层，而不是按实现方便与否。loop 内变量负责
高频、短命、当前 turn 必需的状态；外部 store 负责跨 turn、跨 session、
跨 agent 的恢复锚点。

| 状态类别 | 建议位置 | 典型内容 | 判断标准 |
|----------|----------|----------|----------|
| Loop vars | 进程内内存 | 当前 step、tool queue、retry count、active turn budget | 丢了也能从 checkpoint 恢复 |
| External store | 文件或数据库 | `progress.md`、task graph、summary、abort reason、checkpoint id | 进程退出后还必须存在 |
| Shared bridge | thread/state bridge | sub-agent handoff、resume token、coordinator note | 需要跨线程或跨 agent 续写 |

## Continue 条件

continue 条件定义的是“为什么再跑一轮”。不要写成单个布尔值，而要分成
可观测的几个来源，否则线上排障时你只会看到“又继续了”，看不到“为何继续”。

| continue 来源 | 判定方式 | 设计要点 |
|---------------|----------|----------|
| Tool calls pending | 模型输出含 tool request，且 pipeline 返回 `continue` | 工具回放必须结构化进入下一轮 |
| Stop hook not fired | 没有收到显式 stop / abort / human handoff | stop hook 要比自然完成更高优先级 |
| Token budget available | 当前 turn 和全局 budget 仍可承受下一轮 | 预算要区分 hard limit 和 soft warning |
| Reactive compact needed | 上下文接近上限，但压缩后可以继续 | compact 触发本身不是失败，而是继续前置步骤 |
| Sub-agent result pending | 协调器仍在等待异步结果 | 等待状态需要超时和 fallback 策略 |

## Exit 条件

退出条件定义的是“为什么不再跑”。企业系统里最忌讳的，是把所有退出都写成
`done=true`。正确做法是保留语义化 exit reason，这会直接决定后续恢复、
告警和用户界面怎么解释结果。

| exit reason | 语义 | 是否可恢复 | 常见动作 |
|-------------|------|------------|----------|
| completion | 目标已完成，且验收条件满足 | 不需要 | 生成结果、写 checkpoint、结束线程 |
| failure | 目标未完成，且遇到阻塞错误 | 视错误而定 | 记录失败叙事、给出下一步建议 |
| abort | 用户、policy、stop hook 主动中止 | 可以 | 保留现场、等待显式恢复 |
| budget_exhausted | token / time / retry 超预算 | 可以 | 压缩、降级、切换新 thread |
| unsafe_state | policy deny、state corruption、recovery 失败 | 需要人工 | fail-closed 并交给 operator |

## Interrupt recovery

中断恢复最关键的设计，不是“能不能恢复”，而是“恢复时是否还能保持执行叙事
一致”。这里通常有两条路线，各自适用于不同的产品形态。

| 路线 | 更像谁 | 优点 | 风险 | 适用场景 |
|------|--------|------|------|----------|
| `progress.md` checkpoint | Claude Code | 简单、可见、可人工编辑 | 容易滞后，结构化不足 | 文件驱动工作流、repo 内长期任务 |
| thread/state bridge | Codex | 结构化强，跨 thread / agent 稳定 | 系统更重，调试难 | SaaS control plane、多 agent 编排 |

企业系统常见做法不是二选一，而是双写：面向恢复程序写结构化 state，
面向人类操作员写 `progress.md`。前者服务自动续跑，后者服务人类介入。

## 最小 query loop 状态机伪代码

下面的伪代码不是产品代码，而是最小可用的设计骨架。重点在状态转移，而不在
语言细节。

```text
state = load_checkpoint_or_init()

while true:
  if state.abort_requested:
    finalize("abort", state)
    break

  if over_hard_budget(state):
    save_checkpoint(state, reason="budget_exhausted")
    finalize("budget_exhausted", state)
    break

  if needs_reactive_compact(state):
    compact_result = reactive_compact(state)
    if compact_result.failed:
      state = enter_recovery_mode(state, compact_result)
      if state.recovery_blocked:
        finalize("unsafe_state", state)
        break
    else:
      state = compact_result.state
      continue

  response = model_turn(state)
  state = record_response(state, response)

  if response.stop_hook_fired:
    finalize("abort", state)
    break

  if response.completed and acceptance_passed(state, response):
    save_checkpoint(state, reason="completion")
    finalize("completion", state)
    break

  if not response.tool_calls:
    if response.failed:
      save_checkpoint(state, reason="failure")
      finalize("failure", state)
      break
    state = request_clarification_or_continue(state)
    continue

  tool_result = run_tool_pipeline(response.tool_calls, state)
  state = merge_tool_result(state, tool_result)

  if tool_result.abort:
    save_checkpoint(state, reason="abort")
    finalize("abort", state)
    break

  if tool_result.retry_same_turn:
    state.turn_retries += 1
    if too_many_retries(state):
      save_checkpoint(state, reason="failure")
      finalize("failure", state)
      break
    continue

  if tool_result.needs_new_thread:
    save_checkpoint(state, reason="budget_exhausted")
    finalize("budget_exhausted", state)
    break
```

## 设计时必须显式回答的四个问题

写实现前，先把下面四个问题答清楚。答不清楚，就先不要写 loop。

1. 当前系统的 authoritative state 到底在内存、文件还是外部 control
   plane？
2. continue 是由模型自己决定，还是由 harness 依据结构化条件裁决？
3. `completion` 和 `budget_exhausted` 对用户界面是否显示为不同状态？
4. 中断恢复时，谁负责续写执行叙事，是模型、协调器还是人工 operator？
