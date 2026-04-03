---
title: Enterprise Harness Architecture Overview
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

[中文版](./architecture.zh.md)

# Enterprise Harness Architecture Overview

The core conclusion of this reference is straightforward: an enterprise harness should not be designed starting from a single prompt or a single tool call, but from six components that continuously collaborate. What makes a system truly stable is not a smarter model — it is cleaner boundaries among the six components: Control Plane, Query Loop, Tool Pipeline, Context Management, Error Recovery, and Multi-Agent.

## Six-Component Relationship Diagram

Start with the big picture. This diagram emphasizes not the call sequence, but which components constrain which others.

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

## What Each Component Addresses

The table below condenses the six components into four design dimensions: the core question each answers, the Claude Code approach (which leans toward runtime discipline), the Codex approach (which leans toward control plane structure), and the design decisions you must make yourself when building an enterprise implementation.

| Component | Core question | Claude Code approach | Codex approach | Design decisions you must make |
|-----------|---------------|----------------------|----------------|-------------------------------|
| Control Plane | Who can constrain the model, and at which layer do constraints live? | Dynamic prompt assembly; `CLAUDE.md`, memory, and hooks all enter the runtime together | instruction fragments, tool schema, approval policy, and sandbox take effect in separate layers | Is there a single source of truth for rules? Which takes precedence — repo rules or session rules? How are local overrides audited? |
| Query Loop | What keeps the system advancing continuously rather than answering just one round? | `while(true)` main loop; `continue` is an explicit state transition | thread / rollout / state bridge carries continuity | Is state stored in memory, a file, or an external store? How are `continue` and `exit` conditions observed? |
| Tool Pipeline | Are tools truly "called on demand"? | Runtime pipeline; dangerous tools have finer-grained constraints | schema validation, approval, sandbox, and policy form a chain of decisions | Which steps are fail-closed? Which tools are not concurrent by default? Who can bypass approval? |
| Context Management | How is the context budget spent, and how far should it be compressed? | Prompt Cache boundary, snip / micro / collapse / compact | Structured state + thread continuity, reducing reliance on long single-threaded sessions | How is the static prefix cached? When is compression triggered? If compression fails, is there a fallback recovery path? |
| Error Recovery | Are errors treated as exceptions or as main-path events? | prompt too long, max tokens, hook blocking are all treated as main-path events | tool errors, approval denies, and sandbox rejects are returned as structured results | Retry budget, anti-loop guard for repeated failures, abort semantics, and how execution narrative resumes after recovery |
| Multi-Agent | When should you split agents, and who is responsible for verification? | Runtime role separation; Verification Agent is independent of the implementer | Explicit delegation, persistent state, trackable agent collaboration | Split on complexity or on uncertainty? How is fork cache reused? Which read-only tools does the verifier have? |

## Recommended Design Sequencing

When building an enterprise implementation, the order matters more than the component list. The recommended sequence is: define the Control Plane first, then the Query Loop and Tool Pipeline, and optimize Context, Recovery, and Multi-Agent last. The reason is that the first three determine who has authority to act, how the system keeps running, and how tools are actually executed; the latter three are capabilities that can only be optimized stably once the first three are settled.

## Recommended Minimum Enterprise Roll-Out Sequence

If you are building an enterprise harness from scratch, the minimum viable sequence is as follows.

1. Define the Control Plane's rule sources, priority chain, and audit surface.
2. Define the Query Loop's state machine, `continue` conditions, and abort semantics.
3. Build the Tool Pipeline's 8-step governance chain with fail-closed defaults.
4. Add the Context Management compression tiers and cache boundaries.
5. Elevate Error Recovery to a main-path concern rather than scattered exception handling.
6. Introduce Multi-Agent, extracting split and verify responsibilities out of the single-threaded flow.

## The Most Common Architectural Misjudgment

The most common mistake is not "missing a component" — it is quietly folding one component's responsibilities into another. Examples include using prompt text as a substitute for a permission system, using a long summary in place of a state machine, or using "let another agent take another look" in place of independent verification. The key to an enterprise harness is not packing in every feature, but ensuring each component controls exactly its own layer — nothing more.
