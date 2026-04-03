[中文版](./error-recovery.zh.md)

---
title: Error Recovery Design Reference
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Error Recovery Design Reference

Recovery design in an enterprise harness must start by accepting one premise: agent failure is a stable, recurring phenomenon — not an occasional anomaly. `prompt too long`, `max output tokens`, tool deny, auto compact failure, user interruption, hook blocking — all of these must be treated as lifecycle events. If your system still handles them as "exception branches," the main path is simply not finished yet.

## Why Errors Belong on the Main Path

Errors are elevated to the main path not to be more conservative, but to protect the coherence of the execution narrative. Users need to know what the system accomplished, why it stopped, and where it will resume — not just see a generic error message.

## Common Recovery Events

The events below should feed directly into a unified recovery taxonomy rather than being handled separately by different modules.

| Event | Correct framing | Recommended action |
|-------|-----------------|--------------------|
| prompt too long | Lifecycle event, not an edge-case exception | Trigger reactive compact; preserve the original goal and most recent failure evidence |
| max_output_tokens | Output was truncated — this is not a task failure | Start a continuation, carrying the partial result forward |
| tool execution failed | Failure is structured feedback | Record the error type, count, and whether it is a homogeneous repeat |
| auto compact failed | Recovery itself needs recovery | Enter a more conservative recovery mode; switch to a new thread if necessary |
| hook blocked | An institutional-layer block, not "the tool is broken" | Expose the deny reason; wait for human intervention or policy adjustment |
| user abort | Part of an intentional stop | Write a checkpoint; preserve the resume path |

## Reactive Compact with Anti-Loop Guard

The most common failure mode for reactive compact is not "not enough compression" — it is entering a compact loop: context is too long, so compress; the compressed result is still too long, so compress again; eventually the system holds only a chain of summaries with the original goal and all evidence erased.

Reactive compact must therefore have an anti-loop guard:

1. Stop triggering reactive compact on the same checkpoint after it exceeds a threshold of consecutive attempts.
2. After each compact, verify that the original goal, most recent failure evidence, and current budget are still present.
3. If progress is still impossible after compaction, escalate to `budget_exhausted` or `unsafe_state` — do not keep firefighting indefinitely.

## max_output_tokens Recovery by Continuation

The correct recovery approach for `max_output_tokens` is usually continuation, not a re-run. This type of failure indicates the model was making progress but the output was cut off. Re-running often regenerates the same content, wastes budget, and may alter the narrative.

A minimum viable continuation requires three pieces of information:

| Required information | Purpose |
|----------------------|---------|
| partial result | Tells the next turn what has already been generated |
| last intent | Tells the next turn what action was being completed |
| output budget hint | Prevents the continuation from hitting the same limit again |

## Auto Compact Failure: Recovery Needs Recovery

When auto compact fails, a deeper problem is exposed: the recovery mechanism itself can fail. Enterprise implementations must reserve a "recovery-of-recovery" path, for example:

1. Downgrade from automatic summarization to template-based collapse.
2. Downgrade from in-thread compression to checkpoint + new thread continuation.
3. Downgrade from automatic recovery to human operator handoff.

Without these fallback tiers, an auto compact failure typically drives the entire task into a dead end.

## Abort Semantics

Abort semantics must be designed independently. Abort is neither a failure nor a completion, and it is not "temporarily unfinished." At minimum, distinguish the following three types:

| Abort type | Meaning | Recovery path |
|------------|---------|---------------|
| user_abort | The user intentionally stopped the system | Wait for the user to resume |
| policy_abort | Blocked by a permission or safety policy | Resume after policy change or manual approval |
| operator_abort | Terminated by the system operator | Control plane decides whether to restart |

Conflating abort and failure directly degrades the recovery experience, because failure implies "the system tried but was blocked," while abort implies "the system was asked to stop."

## What Recovery Must Protect

The highest-priority concern for a recovery mechanism is not whether any single model turn produced output — it is whether the execution narrative remains coherent. At minimum, protect the following four categories:

1. The original goal and acceptance criteria.
2. The key evidence from the most recent critical failure.
3. The current phase and completed work so far.
4. Why the system stopped, and who has the authority to let it continue.

## Enterprise Implementation Advice

If you want to move recovery from "able to report errors" to "able to resume execution," prioritize these four things.

1. Model both `prompt too long` and `max_output_tokens` as explicit event types.
2. Add a dedicated anti-loop guard to reactive compact.
3. Persist the partial result for continuations — not just "continue from here."
4. Distinguish between `abort`, `failure`, and `budget_exhausted` as three separate termination semantics.
