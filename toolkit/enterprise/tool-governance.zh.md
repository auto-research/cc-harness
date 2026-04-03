---
title: Tool governance 设计参考
domain: tech
type: reference
created: 2026-04-02
updated: 2026-04-02
tags: [harness-engineering, enterprise-agent]
---

# Tool governance 设计参考

企业 harness 的工具治理结论很明确：工具不是模型的“手”，而是受管执行接口。
一条完整的 tool pipeline 至少要有 8 步，从 find 到 process，每一步都在
减少错误自由度。真正危险的不是工具很强，而是强工具绕过了中间层。

## 八步 tool pipeline

下面这条 8 步流水线是最小企业版本。缺任何一步都不一定马上出事故，但会让
系统在权限、恢复、审计或可解释性上出现结构性漏洞。

| 步骤 | 目标 | 默认输出 | 关键设计决策 |
|------|------|----------|--------------|
| 1. find | 从注册表里找到候选工具 | candidate set | 工具发现是按名称、schema 还是 capability 搜索 |
| 2. validate | 校验参数、schema、上下文适配性 | valid / invalid | 校验失败是否允许模型自动修参重试 |
| 3. risk assess | 判断危险等级、写权限、并发安全性 | risk profile | 风险是静态元数据还是动态评估 |
| 4. pre-hook | 执行前钩子 | allow / deny / mutate | hook 能否改写输入，还是只能 deny |
| 5. permission | 做 settings / policy / approval 裁决 | allow / ask / deny | deny 来源如何解释给模型和用户 |
| 6. execute | 真正运行工具 | raw result | 超时、隔离、重试、资源配额怎样定义 |
| 7. post-hook | 执行后检查和补充治理 | pass / block / enrich | 写后验证失败是否回滚、是否标记脏状态 |
| 8. process | 结构化结果并送回 query loop | normalized result | 返回摘要、完整输出还是外部引用 |

## 每一步应该问什么

流水线的价值在于每一步只问一个主问题。不要让一个步骤同时负责“检查权限”
和“格式化结果”，否则后面会越来越难 debug。

### 1. find

find 只解决一个问题：当前意图在系统里有哪些合法工具候选。设计上最关键的
决策，是把工具当“名字”还是当“能力”。企业系统更推荐 capability-first，
因为这样更容易统一限制“所有会写磁盘的工具”或“所有会出网的工具”。

### 2. validate

validate 负责 schema、参数范围、运行前提、上下文适配性。这里建议
fail-closed，任何未知字段、缺失必填、上下文不满足，都直接返回 invalid，
而不是让执行层帮忙猜测。

### 3. risk assess

risk assess 决定工具是不是危险、是否可并发、是否可在无人工确认下运行。
这个阶段最值得显式建模的元数据包括 `is_read_only`、`writes_external_state`、
`is_concurrency_safe`、`requires_human_confirmation`。

### 4. pre-hook

pre-hook 负责把制度接到生命周期上。它可以做 deny、记录审计、补充上下文，
但不建议承担复杂业务逻辑。hook 太聪明，会让主 pipeline 的因果关系变模糊。

### 5. permission

permission 是裁决层，不是提示层。settings deny、sandbox deny、
approval deny、policy deny 都应该保留原始原因，并以结构化形式返回给 loop。
不能让模型只看到一个模糊的“permission denied”。

### 6. execute

execute 只负责运行，不负责解释“该不该运行”。执行层应当尽可能薄，
包括 timeout、stdout/stderr 截断、资源限制、沙箱、网络隔离等。

### 7. post-hook

post-hook 把“写完之后要不要立刻检查”提升为默认能力。典型动作包括：
运行 lint、做 secret scan、写审计日志、更新 progress checkpoint、
标记输出需要独立 verification。

### 8. process

process 负责把原始结果变成 query loop 能消费的结构。这里建议区分三类：
短文本内联返回、大结果转 external artifact、失败结果带 recovery hint。
否则下一轮模型只会看到一大团日志。

## Fail-closed 默认值模式

fail-closed 不是口号，而是默认值策略。新工具没声明某项安全属性时，系统
应该向更严格的一侧坍缩，而不是向更宽松的一侧坍缩。

| 元数据 | 建议默认值 | 原因 |
|--------|------------|------|
| `is_read_only` | `false` | 忘记标记只读时，宁可当成会写 |
| `is_concurrency_safe` | `false` | 并发误判的破坏性通常大于串行保守 |
| `network_access` | `deny` | 出网属于企业级审计面，不该默认打开 |
| `writes_external_state` | `true` | 未声明时假设它会留下副作用 |
| `requires_post_verification` | `true` | 写操作完成后默认需要检查 |

## Permission layering

permission layering 的硬规则是：上层 allow 不能绕过下层 deny。也就是说，
hook allow 不能覆盖 settings deny，policy allow 也不能绕过 sandbox deny。

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

这条规则的意义，不在“更严格”，而在系统可解释性。用户和 operator
必须知道最终 deny 是哪一层做出的，而不是只看到一个被上层覆盖过的模糊结果。

## 企业实现建议

如果你的系统已经有 tool calling，但还没有完整治理链，优先补下面三件事。

1. 给每个工具补风险元数据，而不是只写 schema。
2. 把 permission 结果结构化，保留 deny 来源和 recovery hint。
3. 把 post-hook 视为默认能力，尤其对写文件、执行命令、调用外部系统的工具。
