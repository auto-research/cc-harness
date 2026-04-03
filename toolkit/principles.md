---
title: Harness Engineering 设计原则 — 从 Claude Code 和 Codex 源码提炼
domain: tech
type: decision
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, claude-code, codex, agent-architecture, design-principles]
sources:
  - docs/知识/ai-agent-deep-dive-v2.pdf (Xiao Tan AI, Claude Code 源码架构深度解析 V2.0)
  - docs/知识/book1-claude-code.pdf (@wquguru, Harness Engineering — Claude Code 设计指南)
  - docs/知识/book2-comparing.pdf (@wquguru, Claude Code 和 Codex 的 Harness 设计哲学)
---

# Harness Engineering 设计原则

本文综合三份来源，提炼 AI coding agent 的 harness 设计原则。这些原则直接指导了 ai-assistant-hub v0.3.0 的四层架构重构。

## 核心立场

> Prompt 决定它怎么说话，Harness 决定它怎么做事。

Harness 不是附属工具，是模型进入工程环境的前提。缺少这层约束，风险最终转移给用户、团队和维护者。

## 十条原则

### 1. 把模型当不稳定部件，不要当同事

模型会犯错、会忘记上下文、会把语气里的自信和结论里的正确性混为一谈。系统必须围绕这个事实设计。

**落地映射**: `governance/dont.md` — 把教训写成制度，不靠模型临场发挥。

### 2. Prompt 是控制面的一部分，不是人格装饰

Prompt 在 agent 里不是人设文案，而是分层拼装的行为区块。真正起作用的是优先级链：override > coordinator > agent > custom > default。

**落地映射**: `CLAUDE.md` 精简为 26 行入口，指向 governance/ 和 knowledge/，不堆砌描述。

### 3. Query loop 才是代理系统的心跳

一个代理系统是否成熟，先看它有没有循环。状态属于主业务：预算概念、恢复概念、上下文膨胀后的自救机制、工具调用失败后继续推进的能力。

**落地映射**: `workflows/` 每个工作流有步骤编号 + quality gate + progress.md 中断恢复。

### 4. 工具是受管执行接口

工具调用不是"模型说调就调"。中间要经过输入校验、权限检查、风险预判、执行、后处理。能力越强，约束越细。Bash 最危险。

**落地映射**: `.claude/settings.json` hooks — PreToolUse 拦截敏感命令，PostToolUse 即时检查。

### 5. 上下文是工作内存，不是垃圾桶

每个 token 都有成本。能缓存的要缓存，能按需加载的不要一开始就塞进去，能压缩的要压缩。CLAUDE.md 是长期指令，memory 是短期缓冲，不能混在一起。

**落地映射**: `knowledge/` 按域分层，只加载当前任务需要的域。memory 定位为短期缓冲，长期知识由 librarian 迁移到 knowledge/。

### 6. 错误路径就是主路径

代理系统的失败不是偶发的，它是稳定存在的：prompt too long、max_output_tokens、工具拒绝、用户打断、hook 阻塞、API 重试。这些都要按主路径来处理。

**落地映射**: `governance/verification.md` — 反合理化规则，不让"看起来没问题"冒充验证。

### 7. 恢复的目标是继续工作

恢复不是回滚到初始状态，而是以续写为主。中断后的下一个 session 应该能从 progress.md 接着跑。

**落地映射**: `templates/workflow-progress.md` — 标准进度文件，每个多步骤工作流自动维护。

### 8. 多代理要靠角色分离，不靠人海战术

多代理的真正价值在于职责分区和独立验证。写代码的人不应该是验代码的人。

**落地映射**: `agents/` 5 个角色各有 knowledge_access 和 tools 约束。librarian 只读。

### 9. 验证必须独立，不能让系统自己给自己打分

验证必须独立于实现阶段。"代码看起来对的"不是验证，"AI 已经检查过了"不是独立审查。

**落地映射**: `governance/verification.md` 四条反合理化规则 + `governance/quality-gates.md` 按内容类型的强制检查。

### 10. 团队制度比个人技巧重要

个人能用不等于团队能承受。skill 是可复用的制度切片，hook 把制度挂到生命周期，approval 用来划责任边界。

**落地映射**: 整个 governance/ 层 — 规则、禁令、门禁、hooks 都是制度而非个人偏好。

## Claude Code vs Codex：两种驯化路线

| 维度 | Claude Code | Codex |
|------|-------------|-------|
| 气质 | 运行时纪律先落地（runtime discipline） | 制度层先设防（policy and local rules） |
| 控制面 | 动态 prompt 装配线 | 带编号的 instruction fragment 公文系统 |
| 连续性 | 压进 query loop 主循环 | 拆进 thread/rollout/state bridge |
| 工具治理 | 运行时编排 + 危险动作约束 | schema + approval policy + sandbox |
| 本地规则 | CLAUDE.md 让现场规则进入会话 | AGENTS.md 让现场规则进入制度 |
| 多代理 | 运行时职责分区，验证独立于实现 | 显式委派 + 持久状态 + 工具化协作 |

**殊途同归之处**: 都知道模型不可信，真正可信的只能是约束结构。

**各表一枝之处**: Claude Code 从运行时事故经验长出来，优先解决连续性和现场治理；Codex 从显式结构设计长出来，优先解决控制层命名、策略表达和可组合性。

## 对 ai-assistant-hub 的指导意义

我们的重构选择了**混合路线**：

- **知识分层加载**（原则 5）→ knowledge/ 按域组织，按需加载
- **行为写成制度**（原则 1、10）→ governance/ 独立于 knowledge/
- **角色分离**（原则 8、9）→ agents/ 各有约束，librarian 只读
- **中断恢复**（原则 7）→ workflows/ + progress.md
- **工具治理**（原则 4）→ hooks 自动检查
- **验证独立**（原则 9）→ verification.md 反合理化规则

后来者不该照抄产品，而该识别自己的主要不确定性在哪，然后决定秩序安放的位置。
