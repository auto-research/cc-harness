# Audit Dimensions

10 dimensions, 5 LLM semantic criteria each = 50 semantic evaluation points.

Each criterion is scored as **PASS(1)** or **FAIL(0)**. Provide a one-line justification for each.

---

## P1 约束制度化 (Constraint Codification)

**Principle**: 模型是不稳定部件 — Don't trust model self-discipline

**LLM Evaluation Criteria** (5 points, 1 each):

1. **触发场景具体**: Each rule specifies a concrete trigger scenario (e.g., "before publishing financial content" or "when modifying database schema"), not vague directives like "be careful" or "be safe"
2. **来源教训真实**: Each rule traces to a real incident or lesson learned — contains specific context like dates, failure descriptions, or references to actual events. Not invented or generic boilerplate
3. **禁止行为可操作**: Forbidden behaviors are actionable and verifiable (e.g., "don't publish without running the data verification checklist") rather than abstract ("be safe", "avoid errors")
4. **规则无重复**: Rules don't overlap significantly; each covers a distinct failure mode. No two rules say essentially the same thing with different words
5. **覆盖高频事故**: Rules cover the most common failure types for this project type (e.g., data staleness for content projects, secret leaks for code projects, hallucination for AI-generated output)

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P1 (Constraint Codification).
> The core question: Do these constraint rules actually prevent the failures they claim to prevent?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P2 控制面分层 (Control Plane Layering)

**Principle**: Prompt 是控制面 — The prompt/config IS the control plane

**LLM Evaluation Criteria** (5 points, 1 each):

1. **分层意图清晰**: The entry file has a clear layering intent — distinguishes between repo-level instructions and directory-level instructions, or between always-load and on-demand content
2. **稳定优先**: Stable, rarely-changing content (project identity, tech stack, conventions) appears first or in the main entry. Volatile content (current tasks, sprint goals) is separated or absent
3. **无冗余**: No significant content duplication between the entry file and directory-level files. Each file adds unique value
4. **有按需加载指引**: The entry file provides guidance on when and how to load additional context (e.g., "Read X when working on Y", "Load domain knowledge for Z tasks")
5. **无冲突**: No contradictions between layers — directory-level instructions don't contradict repo-level instructions

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P2 (Control Plane Layering).
> The core question: Is the prompt control plane well-structured for efficient context loading?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P3 工作流连续性 (Workflow Continuity)

**Principle**: Query loop 是心跳 — The query loop is the heartbeat

**LLM Evaluation Criteria** (5 points, 1 each):

1. **步骤有依赖逻辑**: Steps follow a logical dependency order — later steps depend on earlier steps' output, not arbitrary sequencing
2. **Quality gate 位置合理**: Quality gates (verification, review, testing) are placed at meaningful boundaries — after risky operations, before irreversible steps, at handoff points
3. **有角色分工**: Workflow assigns roles or agents to steps where appropriate (e.g., "use code-reviewer agent", "run security scan"), not a monolithic "do everything" list
4. **粒度适中**: Steps are neither too coarse ("implement the feature") nor too granular ("open the file, move cursor to line 5"). Each step produces a meaningful intermediate artifact
5. **有异常分支**: Workflow accounts for failure paths — what to do if a step fails, how to retry, when to escalate or rollback

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P3 (Workflow Continuity).
> The core question: Can an AI agent follow this workflow without getting stuck or losing track?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P4 工具治理 (Tool Governance)

**Principle**: 工具是受管接口 — Tools are managed interfaces

**LLM Evaluation Criteria** (5 points, 1 each):

1. **覆盖高危操作**: Hooks or rules cover the highest-risk tool operations for this project — at minimum file writes (Bash, Write) and destructive operations (git reset, rm -rf, database drops)
2. **匹配技术栈**: Hook configurations match the project's actual technology stack — a Python project hooks into Python-relevant tools, a TypeScript project checks TypeScript-relevant operations
3. **无过度拦截**: Hooks don't block safe, routine operations unnecessarily. There is a reasonable balance between safety and developer velocity
4. **提示信息可理解**: Error messages or warnings from hooks are clear and actionable — they tell the user what went wrong and what to do, not just "operation blocked"
5. **有严重级别分层**: Hooks distinguish between severity levels — some violations warn (allow override), others block (hard stop). Not everything is treated as equally critical

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P4 (Tool Governance).
> The core question: Do tool hooks effectively prevent dangerous operations while allowing productive work?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P5 上下文预算 (Context Budget)

**Principle**: 上下文是工作内存 — Context is working memory

**LLM Evaluation Criteria** (5 points, 1 each):

1. **入口聚焦**: Each directory-level entry file is focused on its local scope — only contains instructions relevant to that directory's code, not general project-wide information
2. **无跨域泄露**: Directory entries don't leak cross-domain information — a frontend directory's CLAUDE.md doesn't contain backend implementation details and vice versa
3. **无矛盾**: No contradictions between directory-level entries or between directory entries and the root entry
4. **Token 友好**: Files are concise and information-dense. No verbose boilerplate, excessive examples, or repeated disclaimers that waste context tokens
5. **有降级策略**: There is a strategy for when context gets large — explicit guidance on what to skip, summarize, or defer when approaching token limits

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P5 (Context Budget).
> The core question: Will this context structure keep the agent effective as the project scales?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P6 错误路径 (Error Path)

**Principle**: 错误路径 = 主路径 — The error path IS the main path

**LLM Evaluation Criteria** (5 points, 1 each):

1. **检查及时**: Error checks trigger on write operations (file save, code generation) rather than waiting until the end of a long workflow
2. **结果可理解**: Error check results are understandable to both the AI agent and the human — they explain what's wrong, not just that something failed
3. **覆盖主要文件类型**: Error checks cover the project's main file types — TypeScript for TS projects, Python for Python projects, etc. Not limited to a single file type
4. **不影响非代码**: Error checks don't trigger on non-code files (documentation, config, images) where they would produce false positives or noise
5. **有升级路径**: There is an escalation path from warning to blocking — repeated warnings can escalate, or certain error types trigger harder stops

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P6 (Error Path).
> The core question: Will errors be caught early enough and communicated clearly enough to prevent compounding failures?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P7 中断恢复 (Interruption Recovery)

**Principle**: 恢复目标是续写 — The recovery goal is seamless continuation

**LLM Evaluation Criteria** (5 points, 1 each):

1. **恢复上下文充足**: The progress file contains enough context for a new session to understand the current state — what was done, what's pending, what decisions were made
2. **无需前次对话**: A new session can continue work without access to the previous conversation history. All essential information is persisted in files, not in chat memory
3. **有 Next Action 指引**: The progress or workflow file clearly indicates the next action to take, not just the current status
4. **记录关键中间产物路径**: The progress file records paths to key intermediate artifacts (generated files, test results, build outputs) so they can be found without searching
5. **状态转换清晰**: Status transitions are well-defined (e.g., NOT_STARTED -> IN_PROGRESS -> BLOCKED -> DONE) and the current status is always unambiguous

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P7 (Interruption Recovery).
> The core question: If this session crashes right now, can the next session pick up without losing progress?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P8 角色分离 (Role Separation)

**Principle**: 多代理靠角色分离 — Multi-agent systems depend on role separation

**LLM Evaluation Criteria** (5 points, 1 each):

1. **职责无重叠**: Roles have non-overlapping responsibilities — each agent owns a distinct domain or task type. No two agents do the same thing
2. **只读角色真只读**: Read-only roles (reviewers, auditors) truly have no write tools in their allowed-tools list. They cannot modify files, only read and report
3. **Knowledge access 匹配职责**: Each role's `knowledge_access` or context scope matches its responsibility — a security reviewer has access to security-relevant files, not everything
4. **约束有"不做什么"**: Each role's constraints section includes explicit "what NOT to do" rules, not just positive instructions
5. **角色数量合理**: The number of roles is proportional to the project's complexity. Not too many (bureaucratic overhead) nor too few (one agent does everything)

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P8 (Role Separation).
> The core question: Do the role definitions create meaningful separation of concerns, or is it just cosmetic?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P9 验证独立 (Independent Verification)

**Principle**: 验证必须独立 — Verification must be independent from implementation

**LLM Evaluation Criteria** (5 points, 1 each):

1. **反合理化规则具体**: Anti-rationalization rules are specific to the project's failure modes (e.g., "reject 'the data looks approximately correct'"), not vague ("be thorough")
2. **验证视角不同于实现**: Verification uses a different perspective, method, or agent than implementation — not the same agent reviewing its own work with the same approach
3. **有强制证据格式**: There is a mandatory evidence format for verification results — structured output (PASS/FAIL with justification), not free-form prose
4. **不接受"看起来没问题"**: The verification process explicitly rejects "looks fine" or "seems correct" as passing criteria. Requires specific evidence
5. **覆盖项目关键产出类型**: Verification covers the project's critical output types — code for code projects, content for content projects, data for data projects

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P9 (Independent Verification).
> The core question: Would this verification process actually catch a confident-but-wrong AI output?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P10 团队制度 (Team Institution)

**Principle**: 制度 > 技巧 — Institution over individual skill

**LLM Evaluation Criteria** (5 points, 1 each):

1. **规则新人可执行**: Rules are executable by a newcomer (human or AI) who has never worked on this project before. They don't assume prior context or tribal knowledge
2. **无隐含口头知识依赖**: The governance system doesn't depend on implicit oral knowledge — everything needed to follow the rules is written down and accessible
3. **治理有维护机制**: There is a mechanism for maintaining and updating governance rules — a review cycle, an owner, or a process for proposing changes
4. **规则格式统一可预期**: Rule files follow a consistent, predictable format — same structure, same sections, same level of detail. Not a mix of styles
5. **有优先级或修复顺序**: Rules or quality gates indicate priority or remediation order — what to fix first when multiple things are broken

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P10 (Team Institution).
> The core question: Could a brand-new team member (or AI agent) follow these rules without asking anyone for clarification?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.
