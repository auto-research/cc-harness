[中文版](./tool-governance.zh.md)

---
title: Tool Governance Design Reference
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Tool Governance Design Reference

The conclusion on tool governance in an enterprise harness is clear: tools are not the model's "hands" — they are managed execution interfaces. A complete tool pipeline requires at least 8 steps, from find to process, each one reducing the degrees of freedom for error. What is truly dangerous is not that a tool is powerful, but that a powerful tool bypasses the intermediate layers.

## The Eight-Step Tool Pipeline

The 8-step pipeline below is the minimum enterprise version. Omitting any step will not necessarily cause an immediate incident, but it creates a structural gap in permissions, recovery, auditability, or explainability.

| Step | Goal | Default output | Key design decision |
|------|------|----------------|---------------------|
| 1. find | Locate candidate tools in the registry | candidate set | Is tool discovery by name, schema, or capability? |
| 2. validate | Validate parameters, schema, and context compatibility | valid / invalid | If validation fails, can the model auto-correct and retry? |
| 3. risk assess | Determine danger level, write permissions, and concurrency safety | risk profile | Is risk static metadata or dynamically evaluated? |
| 4. pre-hook | Execute pre-execution hooks | allow / deny / mutate | Can hooks rewrite input, or only deny? |
| 5. permission | Make settings / policy / approval decisions | allow / ask / deny | How is a deny reason communicated back to the model and user? |
| 6. execute | Actually run the tool | raw result | How are timeout, isolation, retry, and resource quotas defined? |
| 7. post-hook | Post-execution checks and supplementary governance | pass / block / enrich | If post-write verification fails, does the system roll back or flag dirty state? |
| 8. process | Structure the result and return it to the query loop | normalized result | Return inline summary, full output, or external artifact reference? |

## What Each Step Should Ask

The value of the pipeline is that each step asks exactly one primary question. Do not let a single step simultaneously "check permissions" and "format results" — this becomes increasingly hard to debug over time.

### 1. find

find answers exactly one question: given the current intent, what are the legitimate tool candidates in the system? The most important design decision here is whether to treat tools as "names" or as "capabilities." Enterprise systems are better served by capability-first discovery, because it makes it easier to uniformly restrict "all tools that write to disk" or "all tools that access the network."

### 2. validate

validate handles schema, parameter ranges, preconditions, and context compatibility. The recommendation here is fail-closed: any unknown field, missing required parameter, or unsatisfied context prerequisite should return `invalid` immediately — not let the execution layer guess.

### 3. risk assess

risk assess decides whether the tool is dangerous, whether it can run concurrently, and whether it requires human confirmation before running. The metadata most worth modeling explicitly includes `is_read_only`, `writes_external_state`, `is_concurrency_safe`, and `requires_human_confirmation`.

### 4. pre-hook

pre-hook connects institutional policy to the lifecycle. It can deny, record an audit event, or enrich context — but it should not carry complex business logic. An overly intelligent hook obscures the causal chain of the main pipeline.

### 5. permission

permission is a decision layer, not a hint layer. Settings deny, sandbox deny, approval deny, and policy deny should all preserve the original reason and return it to the loop in structured form. The model must not receive only a vague "permission denied."

### 6. execute

execute is only responsible for running the tool — not for deciding whether it should run. The execution layer should be as thin as possible, covering timeout, stdout/stderr truncation, resource limits, sandboxing, and network isolation.

### 7. post-hook

post-hook elevates "should we check immediately after writing?" to a default capability. Typical actions include: running lint, performing a secret scan, writing an audit log, updating the progress checkpoint, and flagging output as requiring independent verification.

### 8. process

process converts raw results into a structure the query loop can consume. The recommendation is to distinguish three categories: short text inlined into the next turn, large results converted to an external artifact, and failure results carrying a recovery hint. Without this, the model's next turn will see an undifferentiated wall of log output.

## Fail-Closed Default Policy

Fail-closed is not a slogan — it is a default-value strategy. When a new tool has not declared a safety attribute, the system should collapse toward the more restrictive side, not the more permissive side.

| Metadata | Recommended default | Reason |
|----------|--------------------|---------| 
| `is_read_only` | `false` | When read-only is forgotten, treat it as a write |
| `is_concurrency_safe` | `false` | Concurrency misjudgments are usually more destructive than serial conservatism |
| `network_access` | `deny` | External network access is an enterprise-level audit surface and should not be open by default |
| `writes_external_state` | `true` | When undeclared, assume it leaves side effects |
| `requires_post_verification` | `true` | Write operations should require a check by default |

## Permission Layering

The hard rule of permission layering is: an upper-layer `allow` cannot override a lower-layer `deny`. A hook `allow` cannot override a settings `deny`; a policy `allow` cannot bypass a sandbox `deny`.

```text
effective_permission =
  settings
  -> policy
  -> approval
  -> sandbox

if any layer returns deny:
  final = deny
else if any layer returns ask:
  final = ask
else:
  final = allow
```

The significance of this rule is not "being stricter" — it is system explainability. Users and operators must be able to identify which layer issued the final `deny`, rather than seeing only a result that has been obscured by an upper-layer override.

## Enterprise Implementation Advice

If your system already has tool calling but lacks a complete governance chain, prioritize these three things.

1. Add risk metadata to every tool — not just schema.
2. Structure permission results and preserve the deny source and recovery hint.
3. Treat post-hook as a default capability, especially for tools that write files, execute commands, or call external systems.
