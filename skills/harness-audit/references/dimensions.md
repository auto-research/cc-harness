# Audit Dimensions

10 dimensions, 5 LLM semantic criteria each = 50 semantic evaluation points.

Each criterion is scored as **PASS(1)** or **FAIL(0)**. Provide a one-line justification for each.

---

## P1 Constraint Codification

**Principle**: Model is an unstable component — Don't trust model self-discipline

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Specific trigger scenarios**: Each rule specifies a concrete trigger scenario (e.g., "before publishing financial content" or "when modifying database schema"), not vague directives like "be careful" or "be safe"
2. **Traceable lessons**: Each rule traces to a real incident or lesson learned — contains specific context like dates, failure descriptions, or references to actual events. Not invented or generic boilerplate
3. **Actionable prohibitions**: Forbidden behaviors are actionable and verifiable (e.g., "don't publish without running the data verification checklist") rather than abstract ("be safe", "avoid errors")
4. **No overlapping rules**: Rules don't overlap significantly; each covers a distinct failure mode. No two rules say essentially the same thing with different words
5. **Covers high-frequency incidents**: Rules cover the most common failure types for this project type (e.g., data staleness for content projects, secret leaks for code projects, hallucination for AI-generated output)

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P1 (Constraint Codification).
> The core question: Do these constraint rules actually prevent the failures they claim to prevent?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P2 Control Plane Layering

**Principle**: Prompt is the control plane — The prompt/config IS the control plane

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Clear layering intent**: The entry file has a clear layering intent — distinguishes between repo-level instructions and directory-level instructions, or between always-load and on-demand content
2. **Stable content first**: Stable, rarely-changing content (project identity, tech stack, conventions) appears first or in the main entry. Volatile content (current tasks, sprint goals) is separated or absent
3. **No redundancy**: No significant content duplication between the entry file and directory-level files. Each file adds unique value
4. **On-demand loading guidance**: The entry file provides guidance on when and how to load additional context (e.g., "Read X when working on Y", "Load domain knowledge for Z tasks")
5. **No contradictions**: No contradictions between layers — directory-level instructions don't contradict repo-level instructions

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P2 (Control Plane Layering).
> The core question: Is the prompt control plane well-structured for efficient context loading?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P3 Workflow Continuity

**Principle**: Query loop is the heartbeat — The query loop is the heartbeat

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Steps have dependency logic**: Steps follow a logical dependency order — later steps depend on earlier steps' output, not arbitrary sequencing
2. **Quality gates placed correctly**: Quality gates (verification, review, testing) are placed at meaningful boundaries — after risky operations, before irreversible steps, at handoff points
3. **Role assignment present**: Workflow assigns roles or agents to steps where appropriate (e.g., "use code-reviewer agent", "run security scan"), not a monolithic "do everything" list
4. **Appropriate granularity**: Steps are neither too coarse ("implement the feature") nor too granular ("open the file, move cursor to line 5"). Each step produces a meaningful intermediate artifact
5. **Failure branches accounted for**: Workflow accounts for failure paths — what to do if a step fails, how to retry, when to escalate or rollback

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P3 (Workflow Continuity).
> The core question: Can an AI agent follow this workflow without getting stuck or losing track?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P4 Tool Governance

**Principle**: Tools are managed interfaces — Tools are managed interfaces

**LLM Evaluation Criteria** (5 points, 1 each):

1. **High-risk operations covered**: Hooks or rules cover the highest-risk tool operations for this project — at minimum file writes (Bash, Write) and destructive operations (git reset, rm -rf, database drops)
2. **Matches the tech stack**: Hook configurations match the project's actual technology stack — a Python project hooks into Python-relevant tools, a TypeScript project checks TypeScript-relevant operations
3. **No over-blocking**: Hooks don't block safe, routine operations unnecessarily. There is a reasonable balance between safety and developer velocity
4. **Understandable error messages**: Error messages or warnings from hooks are clear and actionable — they tell the user what went wrong and what to do, not just "operation blocked"
5. **Severity levels distinguished**: Hooks distinguish between severity levels — some violations warn (allow override), others block (hard stop). Not everything is treated as equally critical

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P4 (Tool Governance).
> The core question: Do tool hooks effectively prevent dangerous operations while allowing productive work?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P5 Context Budget

**Principle**: Context is working memory — Context is working memory

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Entry files are focused**: Each directory-level entry file is focused on its local scope — only contains instructions relevant to that directory's code, not general project-wide information
2. **No cross-domain leakage**: Directory entries don't leak cross-domain information — a frontend directory's CLAUDE.md doesn't contain backend implementation details and vice versa
3. **No contradictions**: No contradictions between directory-level entries or between directory entries and the root entry
4. **Token-friendly**: Files are concise and information-dense. No verbose boilerplate, excessive examples, or repeated disclaimers that waste context tokens
5. **Degradation strategy present**: There is a strategy for when context gets large — explicit guidance on what to skip, summarize, or defer when approaching token limits

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P5 (Context Budget).
> The core question: Will this context structure keep the agent effective as the project scales?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P6 Error Path

**Principle**: Error path = main path — The error path IS the main path

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Checks trigger promptly**: Error checks trigger on write operations (file save, code generation) rather than waiting until the end of a long workflow
2. **Results are understandable**: Error check results are understandable to both the AI agent and the human — they explain what's wrong, not just that something failed
3. **Covers main file types**: Error checks cover the project's main file types — TypeScript for TS projects, Python for Python projects, etc. Not limited to a single file type
4. **Doesn't affect non-code files**: Error checks don't trigger on non-code files (documentation, config, images) where they would produce false positives or noise
5. **Escalation path exists**: There is an escalation path from warning to blocking — repeated warnings can escalate, or certain error types trigger harder stops

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P6 (Error Path).
> The core question: Will errors be caught early enough and communicated clearly enough to prevent compounding failures?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P7 Interruption Recovery

**Principle**: Recovery goal is seamless continuation — The recovery goal is seamless continuation

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Sufficient recovery context**: The progress file contains enough context for a new session to understand the current state — what was done, what's pending, what decisions were made
2. **No dependency on prior conversation**: A new session can continue work without access to the previous conversation history. All essential information is persisted in files, not in chat memory
3. **Next action is explicit**: The progress or workflow file clearly indicates the next action to take, not just the current status
4. **Key artifact paths recorded**: The progress file records paths to key intermediate artifacts (generated files, test results, build outputs) so they can be found without searching
5. **Status transitions are clear**: Status transitions are well-defined (e.g., NOT_STARTED -> IN_PROGRESS -> BLOCKED -> DONE) and the current status is always unambiguous

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P7 (Interruption Recovery).
> The core question: If this session crashes right now, can the next session pick up without losing progress?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P8 Role Separation

**Principle**: Multi-agent systems depend on role separation — Multi-agent systems depend on role separation

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Non-overlapping responsibilities**: Roles have non-overlapping responsibilities — each agent owns a distinct domain or task type. No two agents do the same thing
2. **Read-only roles are truly read-only**: Read-only roles (reviewers, auditors) truly have no write tools in their allowed-tools list. They cannot modify files, only read and report
3. **Knowledge access matches responsibility**: Each role's `knowledge_access` or context scope matches its responsibility — a security reviewer has access to security-relevant files, not everything
4. **Constraints include "what NOT to do"**: Each role's constraints section includes explicit "what NOT to do" rules, not just positive instructions
5. **Number of roles is proportional**: The number of roles is proportional to the project's complexity. Not too many (bureaucratic overhead) nor too few (one agent does everything)

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P8 (Role Separation).
> The core question: Do the role definitions create meaningful separation of concerns, or is it just cosmetic?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P9 Independent Verification

**Principle**: Verification must be independent — Verification must be independent from implementation

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Anti-rationalization rules are specific**: Anti-rationalization rules are specific to the project's failure modes (e.g., "reject 'the data looks approximately correct'"), not vague ("be thorough")
2. **Verification perspective differs from implementation**: Verification uses a different perspective, method, or agent than implementation — not the same agent reviewing its own work with the same approach
3. **Mandatory evidence format**: There is a mandatory evidence format for verification results — structured output (PASS/FAIL with justification), not free-form prose
4. **"Looks fine" is explicitly rejected**: The verification process explicitly rejects "looks fine" or "seems correct" as passing criteria. Requires specific evidence
5. **Covers critical output types**: Verification covers the project's critical output types — code for code projects, content for content projects, data for data projects

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P9 (Independent Verification).
> The core question: Would this verification process actually catch a confident-but-wrong AI output?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.

---

## P10 Team Institution

**Principle**: Institution over individual skill — Institution over individual skill

**LLM Evaluation Criteria** (5 points, 1 each):

1. **Rules are executable by newcomers**: Rules are executable by a newcomer (human or AI) who has never worked on this project before. They don't assume prior context or tribal knowledge
2. **No implicit oral knowledge dependency**: The governance system doesn't depend on implicit oral knowledge — everything needed to follow the rules is written down and accessible
3. **Governance has a maintenance mechanism**: There is a mechanism for maintaining and updating governance rules — a review cycle, an owner, or a process for proposing changes
4. **Rule format is consistent and predictable**: Rule files follow a consistent, predictable format — same structure, same sections, same level of detail. Not a mix of styles
5. **Priority or remediation order indicated**: Rules or quality gates indicate priority or remediation order — what to fix first when multiple things are broken

**Evaluation prompt**:
> You are a Harness Engineering auditor. Evaluate the following file(s) for dimension P10 (Team Institution).
> The core question: Could a brand-new team member (or AI agent) follow these rules without asking anyone for clarification?
> Score each criterion as PASS(1) or FAIL(0) with one-line justification citing specific content.
