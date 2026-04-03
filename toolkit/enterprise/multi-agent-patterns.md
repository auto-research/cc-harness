---
title: Multi-Agent Patterns Reference
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

[中文版](./multi-agent-patterns.zh.md)

# Multi-Agent Patterns Reference

When deciding whether to split agents in an enterprise system, the first question should not be "how complex is the task?" but "can the uncertainty be partitioned?" Work that is complex but tightly coupled will often produce nothing but handoff overhead when split into agents. Work where the sources of uncertainty are distinct, the evidence domains differ, and verification requires independence — that is what multi-agent is actually suited for.

## When to Split Agents

The most effective decision criterion is not complexity but uncertainty partitioning. The table below can be used directly as a split-decision guide.

| Situation | Recommendation | Reason |
|-----------|---------------|--------|
| A problem requires different evidence domains — e.g., code, documentation, and live system state must be assessed simultaneously | Split | Each agent can carry a narrower context |
| A problem requires independent verification to prevent the implementer from rationalizing their own work | Split | The verifier must be decoupled from the implementer |
| A problem involves many files but highly coupled decisions | Do not split | Handoff amplifies context loss |
| A problem allows parallel exploration of multiple hypotheses | Split | Multiple exploration paths are naturally suited to forking |
| A problem is highly sequential, where each step depends entirely on the details of the previous step | Proceed with caution | The coordinator will become a bottleneck |

## Fork Path Cache Optimization

Cost control in multi-agent is not about running more agents concurrently — it is about keeping their fork paths sharing the same static prefix for as long as possible. The main thread should first anchor stable rules, tool definitions, and project constraints; then each agent appends only the minimal dynamic context for its specific task. The result is that multiple agents share cache hits rather than each burning through the prefix tokens independently.

## Verification Agent Design

The value of a Verification Agent is not "having another look" — it is using an independent prompt, read-only tools, and anti-rationalization rules to break the implementer's narrative momentum.

| Design point | Recommendation |
|-------------|----------------|
| Prompt | Do not reuse the implementer's goal narrative; reframe as "find evidence to determine whether this passes" |
| Tools | Read-only by default: Read, Grep, test runner, browser verify, log viewer |
| Output | Force PASS / FAIL + evidence + open risks |
| Constraints | Not allowed to modify source files; not allowed to treat "looks right" as verification |
| Input | Feed only the artifact, acceptance criteria, and necessary context — not the full implementation process |

The key to an independent verifier is not being smarter — it is being less contaminated by the implementation process. Verification is naturally a black-box task, which is exactly why it is well-suited to a dedicated agent.

## 5 Task Lifecycle Types Abstracted from Claude Code

The five task types below are suitable as the minimum lifecycle model for enterprise multi-agent systems. The naming here is an architectural abstraction; it does not need to match any specific product's internal class names exactly.

| Task type | Goal | Typical owner |
|-----------|------|---------------|
| discover | Find evidence, build a local map, narrow the problem space | explorer / librarian |
| plan | Clarify the approach, boundaries, risks, and acceptance criteria | planner / architect |
| implement | Produce changes, execute commands, advance the primary task | implementer / worker |
| verify | Independently check whether results meet the criteria | verifier / reviewer |
| reconcile | Aggregate results, resolve conflicts, update the authoritative narrative | coordinator |

The key point of this lifecycle: `verify` and `implement` are different task types — not a small tail step at the end of `implement`.

## Coordinator Pattern

The coordinator is not "the most powerful agent" — it is the most restrained agent. Its role is to maintain the authoritative narrative, dispatch sub-tasks, merge results, and decide what comes next. It does not step in to do everything itself.

A well-designed coordinator must do at least four things:

1. Maintain authoritative task state.
2. Specify the input, output, and tool boundaries for each sub-agent.
3. Perform reconciliation after sub-tasks return — not raw-forward their outputs.
4. Block forward progress when verification fails — not rationalize on behalf of the implementer.

## Enterprise Design Advice

If you want to build multi-agent systems that are stable rather than just impressive, prioritize these three things.

1. Split on uncertainty partitioning, not on file count or step count.
2. Give the verifier its own prompt, its own tool set, and its own output template.
3. Let the coordinator own scheduling authority and state authority — not full execution authority by default.
