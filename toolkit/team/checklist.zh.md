---
title: 10 分钟 AI 工作流审计清单
domain: tech
type: template
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, checklist, audit, template, team]
---

# 10 分钟 AI 工作流审计清单

这份清单按 10 条 Harness Engineering 原则组织。每题只回答 `Yes` 或 `No`。
目标不是拿高分，而是快速定位团队现在最脆弱的控制面。

## 审计问题

### 原则 1：把模型当不稳定部件

1. 你是否把历史事故写进了 `dont.md`，而不是指望模型“下次记住”？

### 原则 2：Prompt 是控制面的一部分

2. 你的 repo-level `CLAUDE.md` 是否控制在约 5 KB 内，并以稳定规则优先、动态状态后置？

### 原则 3：Query loop 才是系统心跳

3. 你的关键工作是否有显式 workflow，而不是靠一次长 prompt 临场推进？

### 原则 4：工具是受管执行接口

4. 你是否至少有一个 `PreToolUse` Bash guard 来拦截 publish、force-push 或 `rm -rf`？

### 原则 5：上下文是工作内存

5. 你是否把 package-specific 约束放在目录级入口，而不是把所有细节都塞进根级 `CLAUDE.md`？

### 原则 6：错误路径就是主路径

6. 你是否有 `PostToolUse` hook 在写入后自动运行 lint，尽早暴露失败？

### 原则 7：恢复的目标是继续工作

7. 新 session 是否能仅凭 `progress.md` 恢复被中断的工作，而不依赖上一次对话上下文？

### 原则 8：多代理依赖角色分离

8. 你的实现、评审、架构职责是否由不同角色文件或不同步骤明确区分？

### 原则 9：验证必须独立

9. 你是否有独立于 Implementer 的 verification step，并使用 PASS/FAIL 证据格式？

### 原则 10：团队制度比个人技巧重要

10. `dont.md` 里的每一条规则是否都能追溯到一个 source lesson，而不是个人偏好？

## 计分方式

- `Yes` 计 1 分
- `No` 计 0 分
- 总分范围：0 到 10

## 结果解释

- `8-10`：基础结构 solid。你的 harness 已有明显制度化，不容易因单次会话波动失控。
- `5-7`：存在可预见缺口。通常是 hooks、progress 恢复、独立验证三者里至少缺一项。
- `<5`：significant risk。当前更像“会用模型的人在硬撑”，还不是“团队可承受的系统”。

## 优先修补顺序

如果分数不足 8，建议按以下顺序补：

1. 先补 `dont.md` 和 `verification.md`
2. 再补 `PreToolUse` / `PostToolUse` hooks
3. 再补 workflow + `progress.md`
4. 最后优化 `CLAUDE.md` / `AGENTS.md` 分层

这样做的原因很简单：先堵事故，再建流程，最后再打磨入口文件。
