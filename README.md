# cc-harness

> Harness Engineering audit tool + toolkit for AI coding agents, distilled from Claude Code source architecture.

Scan any project. Score it against 10 engineering principles. Get actionable fix suggestions.

## What is this

**cc-harness** evaluates whether your AI coding agent workflow (Claude Code, Codex, Cursor, or any custom system) follows proven Harness Engineering principles — extracted from analyzing Claude Code's 4756-file TypeScript source and Codex's Rust codebase.

It combines two layers:
- **Deterministic scan** (50 points) — script checks file existence, structure, configuration
- **LLM semantic analysis** (50 points) — Claude evaluates content quality and design intent

Total score: **/100**, with per-dimension breakdown and remediation links.

## Quick Start

### As a Claude Code skill

```bash
# Clone the repo
git clone https://github.com/auto-research/cc-harness.git

# Install the skill
cp -r cc-harness/audit ~/.claude/skills/harness-audit

# Run in your project
cd your-project
# Type: /harness-audit
```

### Script-only mode (no LLM needed)

```bash
git clone https://github.com/auto-research/cc-harness.git
cd cc-harness && npm install

# Scan any project
npx tsx audit/scripts/scan.ts --root /path/to/your/project
```

## Sample Output

```
  ╦ ╦╔═╗╦═╗╔╗╔╔═╗╔═╗╔═╗  ╔═╗╦ ╦╔╦╗╦╔╦╗
  ╠═╣╠═╣╠╦╝║║║║╣ ╚═╗╚═╗  ╠═╣║ ║ ║║║ ║
  ╩ ╩╩ ╩╩╚═╝╚╝╚═╝╚═╝╚═╝  ╩ ╩╚═╝═╩╝╩ ╩
  v0.1.0 · Harness Engineering Compliance Audit

  Project    ai-assistant-hub
  Score      41 / 50 (script layer)

  ──────────────────────────────────────────

  P1  Constraint Codification  █████████░  5/5  PASS
  P2  Control Plane Layering   ████████░░  4/5  PASS
  P3  Workflow Continuity      █████████░  5/5  PASS
  P4  Tool Governance          █████████░  5/5  PASS
  P5  Context Budget           ████████░░  4/5  PASS
  P6  Error Path               ████░░░░░░  2/5  WARN
  P7  Interrupt Recovery       ██████░░░░  3/5  WARN
  P8  Role Separation          █████████░  5/5  PASS
  P9  Independent Verification ██████░░░░  3/5  WARN
  P10 Team Institution         █████████░  5/5  PASS
```

With Claude Code skill (`/harness-audit`), you also get the LLM layer for a full **/100** score.

## The 10 Principles

These principles were extracted from Claude Code's source architecture and validated against Codex's design:

| # | Principle | What it means |
|---|-----------|---------------|
| 1 | Model is unstable | Don't trust it as a colleague — constrain it as an executor |
| 2 | Prompt is control plane | Not personality text — it's a priority chain of behavior blocks |
| 3 | Query loop is heartbeat | The core isn't single answers — it's continuous execution |
| 4 | Tools are managed interfaces | More power needs finer constraints. Bash is most dangerous |
| 5 | Context is working memory | Not a trash can — it's a budgeted resource |
| 6 | Error path = main path | `prompt too long` is inevitable, not exceptional |
| 7 | Recovery means continuation | Not rollback — pick up where you left off |
| 8 | Multi-agent needs role separation | Not cloning — it's uncertainty partitioning |
| 9 | Verification must be independent | Don't let the writer judge the writing |
| 10 | Institution > individual skill | Skills are reusable policy slices, hooks attach to lifecycle |

Full details: [toolkit/principles.md](toolkit/principles.md)

## Toolkit

The `toolkit/` directory contains ready-to-use templates:

### Team (3-10 person teams)

| Template | What you get |
|----------|-------------|
| [claude-md-template.md](toolkit/team/claude-md-template.md) | Three-layer CLAUDE.md structure |
| [hooks-starter.md](toolkit/team/hooks-starter.md) | 4 ready-to-use hooks (health check, write guard, bash guard, lint) |
| [agent-roles-template.md](toolkit/team/agent-roles-template.md) | 3 preset roles (Implementer, Reviewer, Architect) |
| [governance-starter.md](toolkit/team/governance-starter.md) | rules + dont + quality-gates + verification templates |
| [workflow-template.md](toolkit/team/workflow-template.md) | Workflow definition + progress tracking |
| [checklist.md](toolkit/team/checklist.md) | 10-minute team audit (10 yes/no questions) |

### Enterprise (building your own agent system)

| Reference | What you learn |
|-----------|---------------|
| [architecture.md](toolkit/enterprise/architecture.md) | 6-component harness architecture |
| [query-loop-design.md](toolkit/enterprise/query-loop-design.md) | Query loop state machine design (the most important one) |
| [tool-governance.md](toolkit/enterprise/tool-governance.md) | 8-step tool execution pipeline |
| [context-management.md](toolkit/enterprise/context-management.md) | 5-stage compression strategy |
| [multi-agent-patterns.md](toolkit/enterprise/multi-agent-patterns.md) | Multi-agent scheduling + verification separation |
| [error-recovery.md](toolkit/enterprise/error-recovery.md) | Error path design for agent systems |
| [checklist.md](toolkit/enterprise/checklist.md) | 25-item enterprise design audit |

## How it Works

```
  ┌─────────────────────────────┐
  │  /harness-audit             │
  └──────────┬──────────────────┘
             │
  ┌──────────▼──────────────────┐
  │  Layer 1: scan.ts           │
  │  Deterministic file scan    │
  │  10 dims × 5 checks = 50   │──→ JSON (reproducible)
  │  Same commit = same score   │
  └──────────┬──────────────────┘
             │
  ┌──────────▼──────────────────┐
  │  Layer 2: LLM Analysis      │
  │  Read discovered files      │
  │  10 dims × 5 semantic = 50  │──→ Quality judgment
  │  "Is this actually good?"   │
  └──────────┬──────────────────┘
             │
  ┌──────────▼──────────────────┐
  │  Report                     │
  │  Score /100 + PASS/WARN/FAIL│
  │  Top 3 actions + toolkit    │──→ Terminal or Markdown
  │  links to fix templates     │
  └─────────────────────────────┘
```

## Tool Compatibility

cc-harness is **tool-agnostic**. It probes configuration paths for multiple AI coding tools:

| Tool | Files Detected |
|------|---------------|
| Claude Code | CLAUDE.md, .claude/settings.json, .claude/agents/ |
| Codex | AGENTS.md, .codex/hooks/, .codex/agents/ |
| Cursor | .cursorrules |
| Windsurf | .windsurfrules |
| GitHub Copilot | copilot-instructions.md, .github/copilot-instructions.md |
| Generic | governance/, workflows/, agents/, .husky/, lint-staged |

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for how to:
- Add probe paths for new AI tools
- Add new check items
- Contribute toolkit templates

## Sources

The 10 principles were distilled from three source-code analysis documents:

- **Xiao Tan AI** — *Claude Code 源码架构深度解析 V2.0* (4756-file TypeScript source analysis)
- **@wquguru** — *Harness Engineering: Claude Code 设计指南* (10 principles from CC source)
- **@wquguru** — *Claude Code 和 Codex 的 Harness 设计哲学* (CC vs Codex comparative analysis)

Full source details: [docs/sources.md](docs/sources.md)

## License

MIT
