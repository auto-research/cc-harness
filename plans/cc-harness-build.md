# Blueprint: cc-harness 项目构建

> 基于 Claude Code 源码提炼的 Harness Engineering 审计工具 + 模板包，开源项目。

**Design Doc**: `/Users/max/ai-assistant-hub/docs/plans/2026-04-03-cc-harness-design.md`  
**Repo**: `git@github.com:auto-research/cc-harness.git`  
**Local**: `/Users/max/workspace/lab/cc-harness`  
**Mode**: Direct (no gh CLI)  
**Total Steps**: 6  
**Estimated Sessions**: 2-3

## Dependency Graph

```
Step 1 (仓库骨架 + toolkit 搬运) ──→ Step 2 (scan.ts 核心脚本)
                                          │
                                    Step 3 (SKILL.md + dimensions + report template)
                                          │
                                    Step 4 (README + 开源文件)
                                          │
                                    Step 5 (测试验证)
                                          │
                                    Step 6 (push + 发布)
```

**Phase 1**: Step 1（骨架 + toolkit）  
**Phase 2**: Step 2 + Step 3（可并行：脚本和 skill 无文件冲突）  
**Phase 3**: Step 4（README 需要 Step 2-3 完成后才能写完整示例）  
**Phase 4**: Step 5（测试）  
**Phase 5**: Step 6（发布）

## Invariants

1. `/Users/max/workspace/lab/cc-harness` 是唯一工作目录
2. toolkit/ 内容从 ai-assistant-hub 复制，不是 symlink
3. scan.ts 零外部依赖（只用 Node 内置模块）
4. 每步完成后提交一次
5. 不修改 ai-assistant-hub 仓库的任何文件

---

## Step 1: 仓库骨架 + toolkit 搬运

**依赖**: 无  
**模型**: default

### Context Brief

cc-harness 仓库已 clone 到 `/Users/max/workspace/lab/cc-harness`，有 `.git` 但无文件。需要创建项目骨架并将 ai-assistant-hub 中已有的 harness-toolkit 内容搬运过来。

toolkit 源路径：`/Users/max/ai-assistant-hub/knowledge/tech/expertise/harness-toolkit/`  
principles 源路径：`/Users/max/ai-assistant-hub/knowledge/tech/decisions/harness-engineering-principles.md`

### Task List

- [ ] 创建目录结构：
  ```
  audit/scripts/
  audit/references/
  toolkit/team/
  toolkit/enterprise/
  docs/
  ```
- [ ] 复制 toolkit 文件（cp，不是 git mv）：
  - `harness-toolkit/team/*` → `toolkit/team/`
  - `harness-toolkit/enterprise/*` → `toolkit/enterprise/`
  - `harness-toolkit/README.md` → `toolkit/README.md`
  - `harness-engineering-principles.md` → `toolkit/principles.md`
- [ ] 清理复制过来的文件中的 YAML frontmatter domain/type 字段（这些是 ai-assistant-hub 特有的）
- [ ] 创建 `package.json`：
  ```json
  {
    "name": "cc-harness",
    "version": "0.1.0",
    "description": "Harness Engineering audit tool + toolkit for AI coding agents",
    "license": "MIT",
    "repository": "auto-research/cc-harness",
    "type": "module",
    "engines": { "node": ">=20" },
    "scripts": {
      "scan": "tsx audit/scripts/scan.ts"
    },
    "devDependencies": {
      "tsx": "^4.0.0",
      "typescript": "^5.8.0"
    }
  }
  ```
- [ ] 运行 `npm install` 生成 lock 文件
- [ ] 创建 `tsconfig.json`（strict, ESNext, NodeNext）
- [ ] 创建 `LICENSE`（MIT，Copyright 2026 auto-research）
- [ ] 创建 `.gitignore`（node_modules, dist, *.tgz, .DS_Store）
- [ ] 提交：`chore: initialize cc-harness with toolkit content`

### Verification

```bash
cd /Users/max/workspace/lab/cc-harness
# toolkit 文件完整
ls toolkit/team/ | wc -l  # 应 == 7
ls toolkit/enterprise/ | wc -l  # 应 == 7
test -f toolkit/principles.md && echo "OK"
test -f toolkit/README.md && echo "OK"
# 项目文件
test -f package.json && echo "OK"
test -f LICENSE && echo "OK"
# JSON 合法
node -e "JSON.parse(require('fs').readFileSync('package.json'))" && echo "OK"
```

### Exit Criteria

- toolkit/ 下 16 个文件完整搬运
- package.json、tsconfig.json、LICENSE、.gitignore 创建
- 首次提交成功

### Rollback

```bash
git reset HEAD~1 --hard
```

---

## Step 2: scan.ts — 确定性扫描脚本

**依赖**: Step 1  
**模型**: strongest（核心逻辑，需要精确实现 50 个检查项）  
**可并行**: 与 Step 3

### Context Brief

scan.ts 是整个审计工具的确定性基础。它扫描项目目录，按 10 维度的探测路径找文件，对每个维度做 5 个 boolean 检查，输出结构化 JSON。

关键设计约束：
- 零外部依赖（只用 Node 内置 fs、path、child_process）
- 同一个 commit 跑多少次结果都一样
- 支持 `--root <path>` 指定扫描目录
- 输出是标准 JSON，可被 SKILL.md 和 CI 消费

需要实现的核心模块：
1. **probe** — 文件探测器，按优先级扫描多种 AI 工具的配置路径
2. **rules** — 10 维度 × 5 检查项 = 50 个确定性检查
3. **output** — JSON 格式化输出

完整文件探测路径定义（每维度 primary → fallback → keywords）：

```
P1 约束制度化:
  primary: governance/dont.md, .claude/rules/dont.md, docs/dont.md
  fallback: CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, copilot-instructions.md
  keywords: 禁止, 不要, don't, forbidden, never, must not

P2 控制面分层:
  primary: CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, copilot-instructions.md, .github/copilot-instructions.md
  directory_level: packages/*/CLAUDE.md, apps/*/CLAUDE.md, src/*/CLAUDE.md, modules/*/CLAUDE.md

P3 工作流连续性:
  primary: workflows/*.md, .claude/commands/*.md, docs/workflows/*.md
  progress: **/progress.md, templates/workflow-progress.md, templates/progress*.md

P4 工具治理:
  hooks: .claude/settings.json (hooks field), .codex/hooks/, .husky/, .git/hooks/, lint-staged.config.*
  
P5 上下文预算:
  directory_level: packages/*/CLAUDE.md, apps/*/CLAUDE.md, src/*/CLAUDE.md
  entry_files: CLAUDE.md, AGENTS.md, .cursorrules (measure total size)

P6 错误路径:
  hooks: .claude/settings.json (PostToolUse), .husky/pre-commit
  ci: .gitlab-ci.yml, .github/workflows/*.yml, Jenkinsfile, .circleci/config.yml
  docs: **/error-recovery.md, **/error-handling.md

P7 中断恢复:
  progress: templates/workflow-progress.md, **/progress.md
  hooks: .claude/settings.json (UserPromptSubmit), .claude/settings.json (Stop)

P8 角色分离:
  agents: agents/*/AGENT.md, .claude/agents/*.md, .codex/agents/, docs/agents/
  
P9 验证独立:
  primary: governance/verification.md, .claude/rules/verification.md, docs/verification.md
  agents: agents/*reviewer*, agents/*verif*

P10 团队制度:
  governance: governance/, .claude/rules/, docs/governance/
  quality: governance/quality-gates.md, **/quality-gates.md
```

### Task List

- [ ] 创建 `audit/scripts/scan.ts`，实现：
  - CLI 参数解析（`--root`，默认 `.`）
  - `probe()` 函数：对每个维度，按 primary → fallback → keywords 优先级扫描文件
  - glob 匹配用 `fs.readdirSync` + 递归实现（不依赖外部 glob 库）
  - git 状态检查用 `child_process.execSync('git ...')`
  - 10 个维度的检查函数，每个返回 5 个 check 结果
  - JSON 输出到 stdout
- [ ] P1 检查实现：禁令文件存在、条目数 >= 3、内容 > 200 字、有结构化格式（`## ` 标题）、git 追踪
- [ ] P2 检查实现：入口文件存在、大小 < 8KB、有目录级入口、无重复全量加载指令、git 追踪
- [ ] P3 检查实现：workflow 文件存在、有步骤编号、有 quality gate 引用、progress 模板存在、>= 2 个 workflow
- [ ] P4 检查实现：hooks 配置存在、有 PreToolUse、有 PostToolUse、hook 脚本可执行、覆盖 Bash
- [ ] P5 检查实现：目录级入口 >= 3、入口总大小 < 15KB、无单文件 > 8KB、有按需加载指引、有静态/动态分区
- [ ] P6 检查实现：PostToolUse 写入检查、lint/typecheck hook、Stop hook、错误处理文档、CI 配置存在
- [ ] P7 检查实现：progress 模板存在、UserPromptSubmit hook、session start 健康检查、progress 有 frontmatter、恢复指引在 workflow 中
- [ ] P8 检查实现：agent 定义 >= 2、有只读角色、角色有 frontmatter、tools 字段有差异、knowledge_access 有差异
- [ ] P9 检查实现：verification 文件存在、有反合理化规则、reviewer 角色存在、reviewer 只读、有 PASS/FAIL 格式
- [ ] P10 检查实现：governance 目录存在、规则文件 >= 2、有 quality-gates、规则有格式规范、不依赖口头传递（有文档）
- [ ] 在 ai-assistant-hub 上测试：`npx tsx audit/scripts/scan.ts --root /Users/max/ai-assistant-hub`
- [ ] 提交：`feat: implement scan.ts with 10-dimension deterministic checks`

### Verification

```bash
cd /Users/max/workspace/lab/cc-harness
# 脚本可执行
npx tsx audit/scripts/scan.ts --root /Users/max/ai-assistant-hub > /tmp/scan-result.json
# 输出是合法 JSON
node -e "const d = JSON.parse(require('fs').readFileSync('/tmp/scan-result.json')); console.log('dims:', d.dimensions.length, 'score:', d.summary.script_score + '/' + d.summary.script_max)"
# 应输出 dims: 10 score: XX/50
# ai-assistant-hub 应该得分较高（>= 35/50）因为我们刚重构过
```

### Exit Criteria

- scan.ts 零外部依赖，只用 Node 内置模块
- 10 维度 × 5 检查 = 50 个检查项全部实现
- 对 ai-assistant-hub 的扫描结果合理（>= 35/50）
- 输出 JSON 格式符合设计文档 Section 3.3

### Rollback

```bash
git reset HEAD~1 --hard
```

---

## Step 3: SKILL.md + dimensions + report template

**依赖**: Step 1  
**模型**: strongest（skill 编排和 LLM prompt 设计需要精确）  
**可并行**: 与 Step 2

### Context Brief

SKILL.md 是 Claude Code 用户的主入口。它编排两层检查：先调 scan.ts 拿确定性结果，再用 Claude 自身能力做语义评估。

需要创建 3 个文件：
1. `audit/SKILL.md` — skill 入口，定义编排流程
2. `audit/references/dimensions.md` — 10 维度的 LLM 语义评估标准
3. `audit/references/report-template.md` — 终端 + Markdown 报告模板

### Task List

- [ ] 创建 `audit/references/dimensions.md`：
  - 10 个维度，每个包含：id、name、principle、5 个语义评估标准
  - 语义标准来自设计文档 Section 3.1 的 LLM 层列（每维度 5 个语义判断）
  - 完整的 50 个语义标准定义在设计文档的十维评分体系表中，逐条实现
  - 每个标准是一个 yes/no 判断，附评判指引
- [ ] 创建 `audit/references/report-template.md`：
  - 终端输出模板（ASCII art logo + 评分表 + top 3 actions + grade scale）
  - Markdown 报告模板（终端内容 + 逐维度展开 + 修复建议链接）
  - 修复建议到 toolkit 模板的映射表
- [ ] 创建 `audit/SKILL.md`：
  ```yaml
  ---
  name: harness-audit
  description: 扫描项目，评估 AI coding agent 工作流是否符合 Harness Engineering 十条原则
  user_invocable: true
  allowed-tools: [Read, Grep, Glob, Bash, Write]
  ---
  ```
  编排逻辑：
  1. 解析参数（`--output <path>` 可选）
  2. Bash 执行 `npx tsx ${SKILL_DIR}/scripts/scan.ts --root .`
  3. 解析 JSON 结果
  4. 对每个维度：Read 找到的文件 → 按 dimensions.md 的标准做语义评估 → 给 0-5 分
  5. 合并两层评分
  6. 按 report-template.md 输出终端报告
  7. 如果有 --output，Write markdown 报告
- [ ] 提交：`feat: add SKILL.md with dual-layer audit orchestration`

### Verification

```bash
cd /Users/max/workspace/lab/cc-harness
# 三个文件存在
test -f audit/SKILL.md && echo "OK"
test -f audit/references/dimensions.md && echo "OK"
test -f audit/references/report-template.md && echo "OK"
# SKILL.md 有 frontmatter
head -1 audit/SKILL.md | grep -q "^---" && echo "OK"
# dimensions.md 覆盖 10 维度
grep -c "^## P" audit/references/dimensions.md  # 应 == 10
```

### Exit Criteria

- SKILL.md 可被 Claude Code 识别为 user_invocable skill
- dimensions.md 包含 10 × 5 = 50 个语义评估标准
- report-template.md 包含终端和 Markdown 两种输出模板
- 修复建议映射到 toolkit/ 对应模板

### Rollback

```bash
git reset HEAD~1 --hard
```

---

## Step 4: README + 开源文件

**依赖**: Step 2, Step 3（README 需要引用实际的命令和输出示例）  
**模型**: strongest（README 是项目门面）

### Context Brief

README.md 是开源项目的第一印象。需要在 30 秒内让读者理解：这是什么、为什么需要、怎么用。

### Task List

- [ ] 创建 `README.md`，结构：
  - Logo / 项目名 / 一句话描述 / badge（license、node version）
  - **What is this** — 一段话说清楚：基于 CC 源码提炼的审计工具 + 模板包
  - **Quick Start** — 3 步安装运行：clone → 装 skill → `/harness-audit`
  - **Sample Output** — 终端输出截图或 ASCII 示例（来自 ai-assistant-hub 的实际扫描结果）
  - **How it works** — 双层检查的图示（脚本层 + LLM 层）
  - **10 Principles** — 十条原则速查表（一行一条）
  - **Toolkit** — toolkit/ 目录说明 + 使用方式
  - **Contributing** — 指向 docs/CONTRIBUTING.md
  - **Sources** — 三份 PDF 来源致谢
  - **License** — MIT
- [ ] 创建 `docs/CONTRIBUTING.md`：
  - 如何添加新的探测路径（支持更多 AI 工具）
  - 如何添加新的检查项
  - 如何贡献 toolkit 模板
  - PR 规范
- [ ] 创建 `docs/sources.md`：
  - 三份 PDF 来源详细信息
  - 十条原则的出处说明
  - ai-assistant-hub 实践验证说明
- [ ] 提交：`docs: add README, CONTRIBUTING, and sources`

### Verification

```bash
cd /Users/max/workspace/lab/cc-harness
# 文件存在
test -f README.md && test -f docs/CONTRIBUTING.md && test -f docs/sources.md && echo "OK"
# README 包含关键章节
grep -c "Quick Start\|How it works\|10 Principles\|Toolkit\|License" README.md  # 应 >= 5
```

### Exit Criteria

- README.md 包含 Quick Start（3 步可跑）
- README.md 包含示例输出
- CONTRIBUTING.md 覆盖三种贡献路径
- sources.md 完整致谢

### Rollback

```bash
git reset HEAD~1 --hard
```

---

## Step 5: 测试验证

**依赖**: Step 2, Step 3, Step 4  
**模型**: default

### Context Brief

在三个不同类型的项目上跑审计，验证工具的正确性和鲁棒性：
1. ai-assistant-hub — 刚重构过，应该得分较高
2. saas-sdk — 有完善的 AI 配置，但结构不同
3. 一个空项目 — 没有任何 AI 配置，应该得分很低

### Task List

- [ ] 在 ai-assistant-hub 上运行 scan.ts：
  ```bash
  npx tsx audit/scripts/scan.ts --root /Users/max/ai-assistant-hub
  ```
  预期：>= 35/50（我们刚按十条原则重构过）
- [ ] 在 saas-sdk 上运行 scan.ts：
  ```bash
  npx tsx audit/scripts/scan.ts --root /Users/max/workspace/infra/saas-sdk
  ```
  预期：>= 20/50（有 CLAUDE.md + hooks 但缺少 governance/agents 结构）
- [ ] 创建临时空项目测试：
  ```bash
  mkdir /tmp/empty-project && cd /tmp/empty-project && git init
  npx tsx /Users/max/workspace/lab/cc-harness/audit/scripts/scan.ts --root .
  ```
  预期：0-5/50（几乎所有检查项都 FAIL）
- [ ] 修复 scan.ts 中发现的 bug（如果有）
- [ ] 将 ai-assistant-hub 的扫描结果保存为示例：`docs/example-report.json`
- [ ] 提交：`test: validate scan.ts against three project types`

### Verification

```bash
# 三种项目都能跑通（不报错）
npx tsx audit/scripts/scan.ts --root /Users/max/ai-assistant-hub > /dev/null && echo "hub: OK"
npx tsx audit/scripts/scan.ts --root /Users/max/workspace/infra/saas-sdk > /dev/null && echo "sdk: OK"
mkdir -p /tmp/empty-proj && cd /tmp/empty-proj && git init -q
npx tsx /Users/max/workspace/lab/cc-harness/audit/scripts/scan.ts --root . > /dev/null && echo "empty: OK"
```

### Exit Criteria

- 三种项目类型都能正常扫描，不报错
- 评分结果符合预期（hub > sdk > empty）
- 示例报告保存在 docs/

### Rollback

```bash
git reset HEAD~1 --hard
```

---

## Step 6: Push + 发布

**依赖**: Step 5  
**模型**: default

### Context Brief

所有内容就绪，推送到 GitHub 并确认仓库公开可访问。

### Task List

- [ ] 最终检查：
  - `git log --oneline` 确认所有 commit 信息清晰
  - `ls -R` 确认没有遗漏的文件或多余的文件
  - 确认没有敏感信息（API key、内部路径等）
  - 确认 LICENSE 和 README 正确
- [ ] 清理内部路径引用：
  - scan.ts 中不应有 `/Users/max/` 硬编码路径
  - README 中的示例路径应该是通用的
- [ ] Push：`git push -u origin main`
- [ ] 确认 GitHub 仓库页面可访问
- [ ] 可选：创建 v0.1.0 tag
  ```bash
  git tag v0.1.0
  git push origin v0.1.0
  ```

### Verification

```bash
# 无敏感信息
grep -r '/Users/max' audit/scripts/ && echo "FOUND HARDCODED PATH" || echo "OK: no hardcoded paths"
grep -rE 'AIza|sk-|ghp_' . --include='*.ts' --include='*.md' && echo "FOUND SECRET" || echo "OK: no secrets"
# 远程同步
git log --oneline origin/main..HEAD  # 应为空（已推送）
```

### Exit Criteria

- GitHub 仓库包含完整代码和文档
- 无硬编码路径或敏感信息
- v0.1.0 tag 已创建
- README 在 GitHub 页面正确渲染

### Rollback

不适用（已公开发布）。如有问题，创建修复 commit。
