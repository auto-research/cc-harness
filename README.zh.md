[English](./README.md)

# cc-harness

> 面向 AI coding agent 的 Harness Engineering 审计工具 + 工具包，从 Claude Code 源码架构中提炼而来。

扫描任意项目。按 10 条工程原则打分。获取可执行的修复建议。

## 这是什么

**cc-harness** 评估你的 AI coding agent 工作流（Claude Code、Codex、Cursor 或任意自建系统）是否遵循经过验证的 Harness Engineering 原则——这些原则从分析 Claude Code 的 4756 个 TypeScript 源文件以及 Codex 的 Rust 代码库中提炼而来。

它由两层组成：
- **确定性扫描**（50 分）— 脚本检查文件是否存在、结构是否正确、配置是否合规
- **LLM 语义分析**（50 分）— Claude 评估内容质量与设计意图

总分：**/100**，含各维度细项得分与修复链接。

## 快速上手

### 作为 Claude Code 插件使用（推荐）

在 Claude Code 配置中启用：

```jsonc
// .claude/settings.json
{
  "enabledPlugins": {
    "cc-harness@auto-research": true
  }
}
```

然后在任意项目中运行 `/cc-audit`。

### 手动安装 skill

```bash
# 克隆并安装 skill
git clone https://github.com/auto-research/cc-harness.git
cp -r cc-harness/skills/cc-audit ~/.claude/skills/cc-audit

# 在你的项目中运行 — 输入：/cc-audit
```

### 全局 npm 安装

```bash
npm i -g cc-harness

# 扫描任意项目（仅脚本层，不调用 LLM）
cc-harness scan --root /path/to/your/project
```

### 仅脚本模式（无需安装）

```bash
git clone https://github.com/auto-research/cc-harness.git
cd cc-harness && npm install

# 扫描任意项目
npm run scan -- --root /path/to/your/project
```

## 示例输出

```
  ╦ ╦╔═╗╦═╗╔╗╔╔═╗╔═╗╔═╗  ╔═╗╦ ╦╔╦╗╦╔╦╗
  ╠═╣╠═╣╠╦╝║║║║╣ ╚═╗╚═╗  ╠═╣║ ║ ║║║ ║
  ╩ ╩╩ ╩╩╚═╝╚╝╚═╝╚═╝╚═╝  ╩ ╩╚═╝═╩╝╩ ╩
  v0.1.0 · Harness Engineering Compliance Audit

  Project    my-project
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

配合 Claude Code skill（`/cc-audit`）使用时，还会加上 LLM 层，得出完整的 **/100** 得分。

## 十条原则

这些原则从 Claude Code 的源码架构中提炼，并经过 Codex 设计的交叉验证：

| # | 原则 | 含义 |
|---|------|------|
| 1 | 模型是不稳定部件 | 不要当同事信任——作为执行器来约束 |
| 2 | Prompt 是控制面 | 不是人格描述——是行为区块的优先级链 |
| 3 | Query loop 是心跳 | 核心不在单次回答——在于持续执行 |
| 4 | 工具是受管接口 | 能力越强，约束越细。Bash 最危险 |
| 5 | 上下文是工作内存 | 不是垃圾桶——是有预算的资源 |
| 6 | 错误路径 = 主路径 | `prompt too long` 是必然，不是异常 |
| 7 | 恢复目标是续写 | 不是回滚——是接着干 |
| 8 | 多代理靠角色分离 | 不是分身术——是职责分区 |
| 9 | 验证必须独立 | 不能让写的人来验——不能让系统自评 |
| 10 | 制度 > 技巧 | skill 是制度切片，hook 挂到生命周期 |

完整说明：[toolkit/principles.md](toolkit/principles.md)

## 工具包

`toolkit/` 目录包含开箱即用的模板：

### 团队版（3-10 人团队）

| 模板 | 内容 |
|------|------|
| [claude-md-template.md](toolkit/team/claude-md-template.md) | 三层 CLAUDE.md 结构 |
| [hooks-starter.md](toolkit/team/hooks-starter.md) | 4 个开箱即用 hook（健康检查、写保护、Bash 守卫、lint）|
| [agent-roles-template.md](toolkit/team/agent-roles-template.md) | 3 个预设角色（实现者、评审者、架构师）|
| [governance-starter.md](toolkit/team/governance-starter.md) | rules + dont + quality-gates + verification 模板 |
| [workflow-template.md](toolkit/team/workflow-template.md) | 工作流定义 + 进度追踪 |
| [checklist.md](toolkit/team/checklist.md) | 10 分钟团队自检（10 个是/否问题）|

### 企业版（自建 agent 系统）

| 参考文档 | 内容 |
|----------|------|
| [architecture.md](toolkit/enterprise/architecture.md) | 六组件 harness 架构 |
| [query-loop-design.md](toolkit/enterprise/query-loop-design.md) | Query loop 状态机设计（最重要的一篇）|
| [tool-governance.md](toolkit/enterprise/tool-governance.md) | 8 步工具执行 pipeline |
| [context-management.md](toolkit/enterprise/context-management.md) | 5 阶段压缩策略 |
| [multi-agent-patterns.md](toolkit/enterprise/multi-agent-patterns.md) | 多 agent 调度 + 验证分离 |
| [error-recovery.md](toolkit/enterprise/error-recovery.md) | agent 系统的错误路径设计 |
| [checklist.md](toolkit/enterprise/checklist.md) | 25 项企业级设计自检 |

## 工作原理

```
  ┌─────────────────────────────┐
  │  /cc-audit             │
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

## 工具兼容性

cc-harness **不绑定任何特定工具**。它会探测多种 AI coding 工具的配置路径：

| 工具 | 检测文件 |
|------|----------|
| Claude Code | CLAUDE.md, .claude/settings.json, .claude/agents/ |
| Codex | AGENTS.md, .codex/hooks/, .codex/agents/ |
| Cursor | .cursorrules |
| Windsurf | .windsurfrules |
| GitHub Copilot | copilot-instructions.md, .github/copilot-instructions.md |
| 通用 | governance/, workflows/, agents/, .husky/, lint-staged |

## 参与贡献

参见 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)，了解如何：
- 为新 AI 工具添加探测路径
- 添加新的检查项
- 贡献工具包模板

## 来源

十条原则提炼自三份源码分析文档：

- **Xiao Tan AI** — *Claude Code 源码架构深度解析 V2.0*（4756 个 TypeScript 文件分析）
- **@wquguru** — *Harness Engineering: Claude Code 设计指南*（从 CC 源码提炼的 10 条原则）
- **@wquguru** — *Claude Code 和 Codex 的 Harness 设计哲学*（CC 与 Codex 对比分析）

完整来源说明：[docs/sources.md](docs/sources.md)

## 许可证

MIT
