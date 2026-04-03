[中文版](./context-management.zh.md)

---
title: Context Management Design Reference
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Context Management Design Reference

Context management in an enterprise harness is not "summarize the history" — it is a tiered compression and cache boundary design. The most reliable approach is to organize compression into five stages: snip, micro, context collapse, auto compact, and reactive compact. The later the stage, the higher the cost, the larger the side effects, and the stronger the recovery requirements.

## Five-Stage Compression Model

The table below provides the minimum decision framework for the five-stage compression model. Use it directly as a design table before implementation.

| Stage | What it does | When to trigger | Cost | Failure modes |
|-------|-------------|-----------------|------|---------------|
| snip | Remove low-information noise: repeated confirmations, trailing verbose logs | When content within a single turn is clearly worthless | Very low | Accidentally deletes local evidence, causing gaps in later retrospectives |
| micro | Compress a short recent window into fine-grained summaries | When the last few turns are growing but details still matter | Low to medium | Compresses temporary failures too aggressively, losing the failure sequence |
| context collapse | Fold a completed segment of work into a checkpoint summary | When a sub-task completes, a phase boundary is crossed, or before a handoff | Medium | Goal drift — a phase goal gets collapsed to "done" |
| auto compact | Trigger compression automatically before approaching the budget limit | When the next turn is predicted to approach the budget ceiling | Medium to high | Poor auto-compact quality leaves insufficient recovery information |
| reactive compact | Emergency compression after entering the danger zone or after an error | When `prompt too long`, context over-budget, or thread is too heavy | Very high | Recovery narrative breaks, or the system enters a compact loop |

## Role Boundaries Between Stages

Do not mix compression stages. Snip and micro target local cleanup; context collapse targets phase archiving; auto compact targets budget prevention; reactive compact targets survival recovery. You may share an underlying summarizer, but you must not treat the five stages as different parameter values of the same command — otherwise it becomes impossible at runtime to tell "is this an optimization or a rescue operation?"

## Static / Dynamic Boundary

The benefit of Prompt Cache comes from maximizing a stable prefix, not from "turning the cache switch on." Enterprise systems must therefore explicitly define the static/dynamic boundary.

| Region | What belongs here | What does not belong here |
|--------|------------------|--------------------------|
| static prefix | System rules, tool schema, stable repo constraints, long-lived style instructions | Current-turn state, temporary TODOs, real-time budget |
| dynamic suffix | Current task, latest checkpoint, active budget, pending tool result | Long-unchanged rules, repeated tool descriptions |

A practical heuristic: if a piece of content will not change across ten turns, put it in the static prefix; if it changes every one or two turns, put it in the dynamic suffix.

## Fork Cache Reuse

In multi-agent scenarios, the key optimization for Prompt Cache is not "cache once more" — it is ensuring that forked agents share as long a prefix as possible. That means the main thread and sub-threads should share the same static prefix, diverging only in the dynamic suffix.

This yields two direct benefits:

1. Lower token cost, because cache hits are concentrated in the high-proportion prefix.
2. Less prompt drift, because the main thread and sub-threads share a more consistent behavioral baseline.

## Design Reminders for Each Stage

Each stage must answer the question: "After compression, who will consume this result?" A summary intended for the model, a checkpoint intended for the coordinator, and a progress update intended for a human operator are usually not the same document. Enterprise implementations should prefer a structured state object plus a human-readable summary — not just natural language.

## When Not to Compress

There are three categories of content that should not go directly into the compressor, even when the budget is tight.

1. The original goal and acceptance criteria. These must be preserved separately to prevent goal drift.
2. The key evidence from the most recent failure. Without it, the next turn is likely to repeat the same mistake.
3. The original reason for a permission deny, abort, or policy block. Recovery requires knowing why the system stopped.

## Enterprise Implementation Advice

If you can only build one version of context management right now, prioritize these four things.

1. Define the static / dynamic boundary first.
2. Implement snip and context collapse as the two foundational tiers.
3. Set a soft threshold for auto compact — do not wait for `prompt too long` before triggering it.
4. Build reactive compact last, and give it a dedicated anti-loop guard.
