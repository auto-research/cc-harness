[中文版](./query-loop-design.zh.md)

---
title: Query Loop Design Reference
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Query Loop Design Reference

The core conclusion of this reference is: a query loop is not simply "multi-turn conversation" — it is the execution heartbeat of an enterprise agent. You need to decide where state lives, what conditions drive continuation, what conditions drive exit, and what enables recovery after an interruption — before you write any code. Do it in the reverse order and the system typically degrades into a "runs but is hard to recover" long-prompt automaton.

## Where State Should Live

State placement should be layered by recovery radius, not by implementation convenience. In-loop variables handle high-frequency, short-lived, current-turn state; the external store handles cross-turn, cross-session, and cross-agent recovery anchors.

| State category | Recommended location | Typical contents | Decision criterion |
|----------------|---------------------|------------------|--------------------|
| Loop vars | In-process memory | Current step, tool queue, retry count, active turn budget | Safe to lose — recoverable from checkpoint |
| External store | File or database | `progress.md`, task graph, summary, abort reason, checkpoint id | Must survive process exit |
| Shared bridge | Thread / state bridge | Sub-agent handoff, resume token, coordinator note | Required for cross-thread or cross-agent continuation |

## Continue Conditions

Continue conditions define "why run another turn." Do not collapse them into a single boolean — make each source observable separately, or during production incidents all you will see is "it continued again" with no visibility into why.

| Continue source | How to evaluate | Design notes |
|----------------|-----------------|--------------|
| Tool calls pending | Model output contains a tool request and the pipeline returns `continue` | Tool replays must be structured into the next turn |
| Stop hook not fired | No explicit stop / abort / human handoff received | Stop hooks should take higher priority than natural completion |
| Token budget available | Current turn and global budget can sustain another turn | Budget must distinguish hard limits from soft warnings |
| Reactive compact needed | Context is near the limit but can continue after compression | Compact triggering is not a failure — it is a pre-step for continuation |
| Sub-agent result pending | Coordinator is still awaiting an async result | Waiting state requires a timeout and a fallback strategy |

## Exit Conditions

Exit conditions define "why not run again." The most dangerous pattern in enterprise systems is writing all exits as `done=true`. The correct approach is to preserve semantic exit reasons — these directly determine how recovery, alerting, and the user interface interpret the result.

| Exit reason | Semantics | Recoverable? | Common action |
|-------------|-----------|--------------|---------------|
| completion | Goal achieved and acceptance criteria satisfied | Not needed | Generate result, write checkpoint, end thread |
| failure | Goal not achieved due to a blocking error | Depends on error | Record failure narrative, provide next-step suggestions |
| abort | User, policy, or stop hook triggered an intentional stop | Yes | Preserve the scene, wait for an explicit resume |
| budget_exhausted | Token / time / retry budget exceeded | Yes | Compress, downgrade, or switch to a new thread |
| unsafe_state | Policy deny, state corruption, or recovery failure | Requires human | Fail-closed and hand off to operator |

## Interrupt Recovery

The most important design question for interrupt recovery is not "can it recover?" but "does it preserve execution narrative coherence when it does?" There are generally two approaches, each suited to different product shapes.

| Approach | More like | Strengths | Risks | Best for |
|----------|-----------|-----------|-------|----------|
| `progress.md` checkpoint | Claude Code | Simple, visible, human-editable | Can lag behind; insufficient structure | File-driven workflows, long-running repo tasks |
| Thread / state bridge | Codex | Strongly structured, stable across threads and agents | Heavier system, harder to debug | SaaS control planes, multi-agent orchestration |

A common enterprise pattern is not either/or but dual-write: write structured state for the recovery program, and write `progress.md` for human operators. The former serves automatic resumption; the latter serves human intervention.

## Minimum Query Loop State Machine Pseudocode

The pseudocode below is not production code — it is the minimum viable design skeleton. The emphasis is on state transitions, not language specifics.

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

## Four Questions You Must Answer Before Implementation

Answer these four questions clearly before writing the loop. If any are unclear, resolve them before writing code.

1. Where does the authoritative state live in the current system — in-process memory, a file, or an external control plane?
2. Is `continue` decided by the model itself, or adjudicated by the harness based on structured conditions?
3. Are `completion` and `budget_exhausted` displayed as distinct states in the user interface?
4. When resuming after an interrupt, who is responsible for reconstructing the execution narrative — the model, the coordinator, or a human operator?
