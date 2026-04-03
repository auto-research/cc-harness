[中文版](./checklist.zh.md)

---
title: Enterprise Harness Design Checklist
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Enterprise Harness Design Checklist

This checklist audits an enterprise harness across six components. The goal is not to produce a score, but to quickly identify whether your system leans more toward Claude Code-style runtime discipline or Codex-style control plane structure — and where your most fragile points actually are.

## How to Use This Checklist

Answer each item with `Yes`, `No`, or `Partial`. `Yes` means a verifiable mechanism is in place; `Partial` means an approach exists but is unstable or not institutionalized; `No` means no explicit design exists yet.

## 1. Control Plane

This set of questions checks whether your rules have moved beyond informal agreements into enforceable policy.

1. Do you have a dedicated control plane, rather than rules scattered across prompt text?
2. Is rule precedence explicitly defined — for example, override > repo > agent > session?
3. Can settings deny, policy deny, and sandbox deny each be traced back to their source separately?
4. Are local rule changes auditable rather than silently applied?

## 2. Query Loop

This set of questions checks whether the system has genuine continuous execution capability, rather than passive multi-turn conversation.

5. Does the query loop have explicit `continue` conditions, rather than "keep going as long as it hasn't stopped"?
6. Are exit reasons distinguished between `completion`, `failure`, `abort`, and `budget_exhausted`?
7. Is there a clearly defined location for authoritative state, rather than it being scattered across conversation history?
8. Can interrupt recovery resume from a checkpoint, rather than requiring manual context reconstruction?

## 3. Tool Pipeline

This set of questions checks whether tool calls have entered a governance chain rather than being freely issued by the model.

9. Are tool discovery, validation, risk assessment, and permission decisions separate steps?
10. When a new tool is missing required metadata, does the system default to fail-closed?
11. Is it impossible for a hook `allow` to bypass a settings deny or sandbox deny?
12. After a write operation, does the system default to entering a post-hook or verification flow?

## 4. Context Management

This set of questions checks whether your context budget is actively managed rather than passively consumed.

13. Have you defined the boundary between static prefix and dynamic suffix?
14. Do you have at least two compression tiers — snip and context collapse?
15. Are the original goal, acceptance criteria, and most recent failure evidence preserved separately?
16. When a sub-agent is forked, does it reuse the main thread's cacheable prefix as much as possible?

## 5. Error Recovery

This set of questions checks whether the system is designed to treat failures as stable, expected events.

17. Is `prompt too long` modeled as an explicit recovery event?
18. Is `max_output_tokens` handled via continuation rather than a simple re-run?
19. Does reactive compact have an anti-loop guard?
20. Is `abort` modeled separately from `failure`, with its own recovery semantics?

## 6. Multi-Agent

This set of questions checks whether multiple agents genuinely serve uncertainty partitioning and independent verification.

21. Is your criterion for splitting agents uncertainty partitioning — not "the task looks complex"?
22. Does the verifier have an independent prompt, rather than a copy of the implementer's prompt?
23. Is the verifier read-only by default — not allowed to directly modify the primary artifact?
24. Does the coordinator maintain authoritative state rather than merely relaying messages?
25. Do the five task types — discover, plan, implement, verify, and reconcile — each have a clear owner in your system?

## Diagnosis: Which Type of System Are You Closer To?

The diagnosis below is not a high-score / low-score judgment — it is a style judgment. Its purpose is to help you identify where order is anchored in your system.

### Closer to Claude Code: runtime discipline

If you answer `Yes` to most of the following questions, your system leans toward Claude Code-style runtime discipline.

- Do you prioritize query loop, context compact, resume path, and hook governance?
- Is error recovery and execution continuity your highest-priority concern?
- Do you frequently use workflows, checkpoints, and Verification Agents to reinforce stability?

### Closer to Codex: control plane structure

If you answer `Yes` to most of the following questions, your system leans toward Codex-style control plane structure.

- Do you prioritize instruction layering, schema, approval policy, and sandboxing?
- Do you treat permission boundaries and tool contracts as more fundamental than long-session continuity?
- Do you manage complexity through thread/state bridges, explicit delegation, and structured tool results?

## How to Interpret the Results

If your system leans clearly toward one side, that is not necessarily a problem. The real problem is when your main source of uncertainty lives on the other side, but your design investment has not gone there yet.

- Closer to Claude Code, but permission boundaries are unclear: prioritize Control Plane and Tool Pipeline first.
- Closer to Codex, but long tasks tend to lose control: prioritize Query Loop, Context, and Recovery first.
- Neither side is strong: build the minimum governance chain first, then consider advanced multi-agent patterns.

## Minimum Passing Bar

If more than 8 of the 25 items are `No`, the system is not yet ready to handle enterprise-level long-running tasks. The recommended remediation order is as follows.

1. First: Control Plane and Tool Pipeline.
2. Second: Query Loop and Error Recovery.
3. Third: Context Management.
4. Last: Evolve Multi-Agent from "can split" to "splitting correctly."
