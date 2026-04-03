---
title: Harness Engineering Toolkit
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, codex, toolkit]
---

[中文版](./README.zh.md)

# Harness Engineering Toolkit

> A practical engineering toolkit for AI coding agents, distilled from source analysis of Claude Code and Codex.

## What This Is

A collection of directly reusable templates, configurations, and design references to help development teams and agent system builders move AI coding agents from "it works" to "it's under control."

The core ideas come from three source analysis documents:
- Xiao Tan AI — *Claude Code 源码架构深度解析 V2.0*
- @wquguru — *Harness Engineering: Claude Code 设计指南*
- @wquguru — *Claude Code 和 Codex 的 Harness 设计哲学*

## Who Should Read What

| You are | Read | Output |
|---------|------|--------|
| **Small team (3–10 people)** sharing a repo with Claude Code / Codex | `team/` directory | Ready-to-copy CLAUDE.md, hooks, agent roles, governance templates |
| **Enterprise agent system builder** building your own similar system | `enterprise/` directory | Architecture design patterns, query loop reference, tool governance pipeline, multi-agent scheduling |
| **Both** | Start with `principles.md`, then go into the relevant directory | Ten principles establish shared understanding; specifics follow |

## Directory Structure

```
harness-toolkit/
├── README.md                    # You are here
├── principles.md                # → ../../../decisions/harness-engineering-principles.md
│
├── team/                        # Team edition (copy and use directly)
│   ├── claude-md-template.md    # Three-layer CLAUDE.md template
│   ├── agents-md-template.md    # AGENTS.md template (Codex side)
│   ├── hooks-starter.md         # Four ready-to-use hook configurations
│   ├── agent-roles-template.md  # Agent role definition templates × 3
│   ├── governance-starter.md    # rules + dont + quality-gates + verification skeleton
│   ├── workflow-template.md     # Workflow definition + progress tracking template
│   └── checklist.md             # 10-minute team self-audit checklist
│
└── enterprise/                  # Enterprise reference architecture (design patterns + decision frameworks)
    ├── architecture.md          # Harness architecture: six-component overview
    ├── query-loop-design.md     # Query loop design reference (the most critical)
    ├── tool-governance.md       # Tool governance pipeline design
    ├── context-management.md    # Context budget and compression strategy
    ├── multi-agent-patterns.md  # Multi-agent scheduling and verification separation
    ├── error-recovery.md        # Error path and recovery mechanism design
    └── checklist.md             # Enterprise agent design audit (~25 items)
```

## Ten Principles at a Glance

| # | Principle | One Line |
|---|-----------|----------|
| 1 | Model is unstable | Don't treat it as a colleague — constrain it as an executor |
| 2 | Prompt is the control plane | Not a personality description — it's a priority chain of behavior blocks |
| 3 | Query loop is the heartbeat | The core isn't a single answer — it's continuous execution |
| 4 | Tools are managed interfaces | More capability means finer constraints. Bash is most dangerous |
| 5 | Context is working memory | Not a trash can — it's a budgeted resource |
| 6 | Error path = main path | `prompt too long` is inevitable, not exceptional |
| 7 | Recovery goal is resumption | Not rollback — pick up and keep going |
| 8 | Multi-agent depends on role separation | Not cloning — it's responsibility partitioning |
| 9 | Verification must be independent | Don't let the writer verify; don't let the system self-grade |
| 10 | Institution > individual skill | Skills are institutional slices; hooks attach to lifecycle |

Full details in [harness-engineering-principles.md](../../decisions/harness-engineering-principles.md)

## How to Use

### Team Edition: Copy Directly

1. Read `team/checklist.md` — spend 10 minutes auditing your current configuration
2. Start with `team/claude-md-template.md` — rewrite your CLAUDE.md
3. Copy hook configurations from `team/hooks-starter.md` into `.claude/settings.json`
4. Use `team/agent-roles-template.md` and `team/governance-starter.md` as needed

### Enterprise Edition: Design Reference

1. Read `enterprise/architecture.md` to establish the six-component global view
2. Focus on `enterprise/query-loop-design.md` (the most critical design decision)
3. Dive into the section that matches your system's bottleneck
4. Use `enterprise/checklist.md` for design audit

## Sources and Credits

- Source analysis: [Xiao Tan AI](https://x.com/tvytlx) / [@wquguru](https://agentway.dev)
- Practical validation: workflow refactoring and design across multiple real projects
