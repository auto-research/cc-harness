---
title: Harness Engineering Toolkit
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, codex, toolkit]
---

# Harness Engineering Toolkit

> 基于 Claude Code 和 Codex 源码分析，提炼的 AI coding agent 工程化工具包。

## 这是什么

一套可直接复用的模板、配置和设计参考，帮助开发团队和 agent 系统构建者把 AI coding agent 从"能用"推向"可控"。

核心理念来自三份源码分析材料：
- Xiao Tan AI《Claude Code 源码架构深度解析 V2.0》
- @wquguru《Harness Engineering — Claude Code 设计指南》
- @wquguru《Claude Code 和 Codex 的 Harness 设计哲学》

## 谁该读什么

| 你是 | 读什么 | 产出 |
|------|--------|------|
| **小团队（3-10 人）** 共享仓库用 Claude Code / Codex | `team/` 目录 | 可直接复制的 CLAUDE.md、hooks、agent 角色、governance 模板 |
| **企业 agent 系统构建者** 自己造类似系统 | `enterprise/` 目录 | 架构设计模式、query loop 参考、工具治理 pipeline、多 agent 调度 |
| **两者都想了解** | 先读 `principles.md`，再按需进入对应目录 | 十条原则建立共识，再看具体落地 |

## 目录结构

```
harness-toolkit/
├── README.md                    # 你在这里
├── principles.md                # → ../../../decisions/harness-engineering-principles.md
│
├── team/                        # 团队版（可直接复制使用）
│   ├── claude-md-template.md    # 三层 CLAUDE.md 分层模板
│   ├── agents-md-template.md    # AGENTS.md 模板（Codex 侧）
│   ├── hooks-starter.md         # 四个开箱即用的 Hook 配置
│   ├── agent-roles-template.md  # Agent 角色定义模板 × 3
│   ├── governance-starter.md    # rules + dont + quality-gates + verification 骨架
│   ├── workflow-template.md     # 工作流定义 + 进度追踪模板
│   └── checklist.md             # 10 分钟团队自检清单
│
└── enterprise/                  # 企业参考架构（设计模式 + 决策框架）
    ├── architecture.md          # Harness 架构六组件总览
    ├── query-loop-design.md     # Query loop 设计参考（最核心）
    ├── tool-governance.md       # 工具治理 pipeline 设计
    ├── context-management.md    # 上下文预算与压缩策略
    ├── multi-agent-patterns.md  # 多 agent 调度与验证分离
    ├── error-recovery.md        # 错误路径与恢复机制设计
    └── checklist.md             # 企业级 agent 设计自检清单（~25 项）
```

## 十条原则速查

| # | 原则 | 一句话 |
|---|------|------|
| 1 | 模型是不稳定部件 | 不要当同事，要当需要约束的执行器 |
| 2 | Prompt 是控制面 | 不是人格描述，是行为区块的优先级链 |
| 3 | Query loop 是心跳 | 代理的核心不在单次回答，在连续执行 |
| 4 | 工具是受管接口 | 能力越强约束越细，Bash 最危险 |
| 5 | 上下文是工作内存 | 不是垃圾桶，是有预算的资源 |
| 6 | 错误路径 = 主路径 | prompt too long 是必然，不是异常 |
| 7 | 恢复目标是续写 | 不是回滚，是接着干 |
| 8 | 多代理靠角色分离 | 不是分身术，是职责分区 |
| 9 | 验证必须独立 | 不能让写的人验，不能让系统自评 |
| 10 | 制度 > 技巧 | skill 是制度切片，hook 挂到生命周期 |

详细说明见 [harness-engineering-principles.md](../../decisions/harness-engineering-principles.md)

## 使用方式

### 团队版：直接复制

1. 读 `team/checklist.md`，花 10 分钟审计你当前的配置
2. 从 `team/claude-md-template.md` 开始，重写你的 CLAUDE.md
3. 从 `team/hooks-starter.md` 复制 hook 配置到 `.claude/settings.json`
4. 按需使用 `team/agent-roles-template.md` 和 `team/governance-starter.md`

### 企业版：设计参考

1. 读 `enterprise/architecture.md` 建立六组件的全局视图
2. 重点读 `enterprise/query-loop-design.md`（最核心的设计决策）
3. 按你的系统瓶颈，深入对应章节
4. 用 `enterprise/checklist.md` 做设计审计

## 来源与致谢

- 源码分析：[Xiao Tan AI](https://x.com/tvytlx) / [@wquguru](https://agentway.dev)
- 实践验证：多个真实项目的工作流重构与设计
