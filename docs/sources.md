# Sources

The 10 Harness Engineering principles in cc-harness were distilled from three independent source-code analyses, all published on April 1, 2026 — the day Claude Code's source maps became publicly accessible via its npm package.

## Primary Sources

### 1. Claude Code 源码架构深度解析 V2.0

**Author**: Xiao Tan AI ([@tvytlx](https://x.com/tvytlx))
**Published**: 2026-04-01
**Approach**: Extracted ~4756 TypeScript source files from Claude Code's `cli.js.map` sourcemap. Module-by-module analysis covering: query loop state machine (1729 lines), 42-tool system with 14-step execution pipeline, Prompt Cache economics, four-stage context compression, multi-agent fork path optimization, three-layer security model.

**Key contribution to cc-harness**: Provided the concrete architectural evidence that the 10 principles are grounded in production code, not theoretical ideals.

### 2. Harness Engineering — Claude Code 设计指南

**Author**: @wquguru ([agentway.dev](https://agentway.dev))
**Published**: 2026-04-01
**Approach**: Used Claude Code as a case study to extract general Harness Engineering principles. 9 chapters + 3 appendices covering: why harness engineering matters, prompt as control plane, query loop as heartbeat, tool governance, context management, error recovery, multi-agent verification, team institutionalization.

**Key contribution to cc-harness**: The 10 principles themselves — the conceptual framework that scan.ts dimensions and toolkit templates are organized around.

### 3. Claude Code 和 Codex 的 Harness 设计哲学

**Author**: @wquguru ([agentway.dev](https://agentway.dev))
**Published**: 2026-04-01
**Approach**: Comparative analysis of Claude Code and Codex as two different "domestication routes" for the same problem — constraining unreliable models in engineering environments. Five comparison axes: control plane, continuity, tool governance, local rules, multi-agent/verification.

**Key contribution to cc-harness**: Tool-agnostic perspective. The insight that probing should cover multiple AI tool ecosystems, not just Claude Code. The "where do you place order" diagnostic in the enterprise checklist.

## How Principles Map to Dimensions

| Principle | Source | Dimension |
|-----------|--------|-----------|
| Model is unstable | Book 1 Ch.1 + Xiao Tan §2.6 | P1 |
| Prompt is control plane | Book 1 Ch.2 + Xiao Tan §2.4 | P2 |
| Query loop is heartbeat | Book 1 Ch.3 + Xiao Tan §2.2 | P3 |
| Tools are managed interfaces | Book 1 Ch.4 + Xiao Tan §3 | P4 |
| Context is working memory | Book 1 Ch.5 + Xiao Tan §7 | P5 |
| Error path = main path | Book 1 Ch.6 + Xiao Tan §2.2 | P6 |
| Recovery means continuation | Book 1 Ch.6 + Book 2 Ch.3 | P7 |
| Multi-agent = role separation | Book 1 Ch.7 + Xiao Tan §4 | P8 |
| Verification must be independent | Book 1 Ch.7 + Xiao Tan §4.3 | P9 |
| Institution > individual skill | Book 1 Ch.8 + Book 2 Ch.5 | P10 |

## Practical Validation

These principles were validated by restructuring a real methodology repository (ai-assistant-hub, v0.3.0) and designing an AI workflow system for a production TypeScript monorepo (saas-sdk, 13 packages, 44K LOC).
