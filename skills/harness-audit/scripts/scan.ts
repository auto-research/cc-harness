/**
 * scan.ts — Deterministic scanner for cc-harness
 *
 * Evaluates a project directory against 10 Harness Engineering dimensions.
 * Each dimension has 5 boolean checks = 50 total deterministic checks.
 *
 * ZERO external dependencies — only Node built-ins (fs, path, child_process).
 *
 * Usage:
 *   npx tsx audit/scripts/scan.ts --root /path/to/project
 *   npx tsx audit/scripts/scan.ts                          # defaults to cwd
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Check {
  readonly name: string;
  readonly name_en: string;
  readonly pass: boolean;
  readonly path?: string;
  readonly detail?: string;
}

interface Dimension {
  readonly id: string;
  readonly name: string;
  readonly name_en: string;
  readonly principle: string;
  readonly score: number;
  readonly max: 5;
  readonly checks: readonly Check[];
  readonly files_found: readonly string[];
  readonly files_for_llm: readonly string[];
}

interface Summary {
  readonly script_score: number;
  readonly script_max: 50;
  readonly dimensions_found: number;
  readonly dimensions_missing: readonly string[];
}

interface ScanResult {
  readonly version: "1.0.0";
  readonly root: string;
  readonly timestamp: string;
  readonly commit: string | null;
  readonly dimensions: readonly Dimension[];
  readonly summary: Summary;
}

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: readonly string[]): { root: string } {
  const args = argv.slice(2);
  let root = ".";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--root" && i + 1 < args.length) {
      root = args[i + 1];
      i++;
    }
  }
  return { root: path.resolve(root) };
}

// ---------------------------------------------------------------------------
// File System Helpers (zero deps)
// ---------------------------------------------------------------------------

/** Read file contents, returning empty string if missing or unreadable. */
function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

/** Check if a path exists. */
function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/** Get file size in bytes, 0 if missing. */
function fileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/** Check if a file is executable (has any execute bit set). */
function isExecutable(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    // eslint-disable-next-line no-bitwise
    return (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

/** Check if a path is a directory. */
function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Simple glob expansion for patterns like `packages/* /CLAUDE.md`.
 * Supports a single `*` wildcard in one path segment.
 * Returns relative paths from root.
 */
function simpleGlob(root: string, pattern: string): readonly string[] {
  const segments = pattern.split("/");
  return expandSegments(root, segments, 0).map((p) =>
    path.relative(root, p),
  );
}

function expandSegments(
  base: string,
  segments: readonly string[],
  index: number,
): readonly string[] {
  if (index >= segments.length) {
    return exists(base) ? [base] : [];
  }

  const segment = segments[index];

  if (segment === "**") {
    // Recursive descent: match zero or more directories
    const results: string[] = [];
    // Try skipping ** (zero directories)
    results.push(...expandSegments(base, segments, index + 1));
    // Try each subdirectory
    if (isDirectory(base)) {
      try {
        for (const entry of fs.readdirSync(base)) {
          const full = path.join(base, entry);
          if (isDirectory(full) && !entry.startsWith(".git")) {
            // Keep ** active for deeper recursion
            results.push(...expandSegments(full, segments, index));
          }
        }
      } catch {
        // permission denied, etc.
      }
    }
    return results;
  }

  if (segment.includes("*")) {
    // Single-level wildcard
    if (!isDirectory(base)) return [];
    const regex = new RegExp(
      "^" + segment.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
    );
    const results: string[] = [];
    try {
      for (const entry of fs.readdirSync(base)) {
        if (regex.test(entry)) {
          results.push(
            ...expandSegments(path.join(base, entry), segments, index + 1),
          );
        }
      }
    } catch {
      // permission denied, etc.
    }
    return results;
  }

  // Literal segment
  return expandSegments(path.join(base, segment), segments, index + 1);
}

/**
 * Find all files matching a pattern relative to root.
 * Returns relative paths.
 */
function findFiles(root: string, pattern: string): readonly string[] {
  return simpleGlob(root, pattern);
}

/**
 * Find the first existing file from a list of relative paths.
 * Returns the relative path or null.
 */
function findFirst(
  root: string,
  paths: readonly string[],
): string | null {
  for (const p of paths) {
    if (p.includes("*")) {
      const matches = findFiles(root, p);
      if (matches.length > 0) return matches[0];
    } else if (exists(path.join(root, p))) {
      return p;
    }
  }
  return null;
}

/**
 * Find all existing files from a list of path patterns.
 * Returns relative paths.
 */
function findAll(
  root: string,
  paths: readonly string[],
): readonly string[] {
  const results: string[] = [];
  for (const p of paths) {
    if (p.includes("*")) {
      results.push(...findFiles(root, p));
    } else if (exists(path.join(root, p))) {
      results.push(p);
    }
  }
  // Deduplicate
  return [...new Set(results)];
}

// ---------------------------------------------------------------------------
// Git Helpers
// ---------------------------------------------------------------------------

function gitShortHash(root: string): string | null {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: root,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function isGitTracked(root: string, relativePath: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch "${relativePath}"`, {
      cwd: root,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Content Analysis Helpers
// ---------------------------------------------------------------------------

/** Count items: ## headings or top-level `- ` list items. */
function countEntries(content: string): number {
  const headings = (content.match(/^## .+/gm) ?? []).length;
  const listItems = (content.match(/^- .+/gm) ?? []).length;
  return Math.max(headings, listItems);
}

/** Check if content has structured format (## headings). */
function hasStructuredFormat(content: string): boolean {
  return (content.match(/^## .+/gm) ?? []).length >= 2;
}

/** Check if content has YAML frontmatter. */
function hasYamlFrontmatter(content: string): boolean {
  return content.startsWith("---\n") && content.indexOf("\n---", 4) > 0;
}

/** Check if content has step numbering. */
function hasStepNumbering(content: string): boolean {
  // Match "Step 1", "Step 2", etc. or "1. ", "2. " style
  const stepPattern = /step\s+[1-9]/i.test(content);
  const numberedList =
    /^1\.\s/m.test(content) && /^2\.\s/m.test(content);
  return stepPattern || numberedList;
}

/** Check if content contains any of the given keywords (case-insensitive). */
function containsAny(
  content: string,
  keywords: readonly string[],
): boolean {
  const lower = content.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Dimension Evaluators
// ---------------------------------------------------------------------------

function evaluateP1(root: string): Dimension {
  const id = "P1";
  const primaryPaths = [
    "governance/dont.md",
    ".claude/rules/dont.md",
    "docs/dont.md",
  ];
  const fallbackPaths = [
    "CLAUDE.md",
    "AGENTS.md",
    ".cursorrules",
    ".windsurfrules",
    "copilot-instructions.md",
    ".github/copilot-instructions.md",
  ];
  const keywords = ["禁止", "不要", "don't", "forbidden", "never", "must not"];

  const filesFound: string[] = [];
  let constraintFile: string | null = null;
  let constraintContent = "";

  // Try primary paths first
  const primary = findFirst(root, primaryPaths);
  if (primary !== null) {
    constraintFile = primary;
    constraintContent = safeReadFile(path.join(root, primary));
    filesFound.push(primary);
  }

  // Try fallback: look for keywords in fallback files
  if (constraintFile === null) {
    for (const fb of fallbackPaths) {
      if (exists(path.join(root, fb))) {
        const content = safeReadFile(path.join(root, fb));
        if (containsAny(content, keywords)) {
          constraintFile = fb;
          constraintContent = content;
          filesFound.push(fb);
          break;
        }
      }
    }
  }

  // Also collect all found files for LLM review
  const allFound = findAll(root, [...primaryPaths, ...fallbackPaths]);
  for (const f of allFound) {
    if (!filesFound.includes(f)) filesFound.push(f);
  }

  const checks: Check[] = [
    {
      name: "禁令文件存在",
      name_en: "Constraint file exists",
      pass: constraintFile !== null,
      ...(constraintFile !== null ? { path: constraintFile } : {}),
    },
    {
      name: "条目数 >= 3",
      name_en: "Entries >= 3",
      pass: countEntries(constraintContent) >= 3,
      detail: `${countEntries(constraintContent)} entries`,
    },
    {
      name: "内容 > 200 字符",
      name_en: "Content > 200 chars",
      pass: constraintContent.length > 200,
      detail: `${constraintContent.length} chars`,
    },
    {
      name: "有结构化格式",
      name_en: "Has structured format (## headings)",
      pass: hasStructuredFormat(constraintContent),
    },
    {
      name: "文件被 git 追踪",
      name_en: "File is git tracked",
      pass:
        constraintFile !== null && isGitTracked(root, constraintFile),
    },
  ];

  const score = checks.filter((c) => c.pass).length;
  const filesForLlm =
    constraintFile !== null ? [constraintFile] : filesFound.slice(0, 3);

  return {
    id,
    name: "约束制度化",
    name_en: "Constraint Codification",
    principle: "模型是不稳定部件",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: filesForLlm,
  };
}

function evaluateP2(root: string): Dimension {
  const id = "P2";
  const entryPaths = [
    "CLAUDE.md",
    "AGENTS.md",
    ".cursorrules",
    ".windsurfrules",
    "copilot-instructions.md",
    ".github/copilot-instructions.md",
  ];
  const directoryLevelPatterns = [
    "packages/*/CLAUDE.md",
    "apps/*/CLAUDE.md",
    "src/*/CLAUDE.md",
    "modules/*/CLAUDE.md",
  ];

  const entryFilesFound = findAll(root, entryPaths);
  const directoryLevelFiles = findAll(root, directoryLevelPatterns);
  const filesFound = [...entryFilesFound, ...directoryLevelFiles];

  const entryFile = findFirst(root, entryPaths);
  const entrySize = entryFile !== null ? fileSize(path.join(root, entryFile)) : 0;

  // Check for "read all" / "load everything" patterns indicating duplicate full-load
  let hasDuplicateFullLoad = false;
  for (const f of entryFilesFound) {
    const content = safeReadFile(path.join(root, f)).toLowerCase();
    if (
      content.includes("read all") ||
      content.includes("load everything") ||
      content.includes("load all") ||
      content.includes("读取全部") ||
      content.includes("加载所有")
    ) {
      hasDuplicateFullLoad = true;
      break;
    }
  }

  const checks: Check[] = [
    {
      name: "入口文件存在",
      name_en: "Entry file exists",
      pass: entryFile !== null,
      ...(entryFile !== null ? { path: entryFile } : {}),
    },
    {
      name: "入口文件 < 8KB",
      name_en: "Entry file size < 8KB",
      pass: entryFile !== null && entrySize < 8192,
      detail: entryFile !== null ? `${entrySize} bytes` : "no file",
    },
    {
      name: "有目录级入口",
      name_en: "Has directory-level entries (>= 1)",
      pass: directoryLevelFiles.length >= 1,
      detail: `${directoryLevelFiles.length} directory-level files`,
    },
    {
      name: "无重复全量加载指令",
      name_en: "No duplicate full-load instructions",
      pass: !hasDuplicateFullLoad,
    },
    {
      name: "文件被 git 追踪",
      name_en: "File is git tracked",
      pass: entryFile !== null && isGitTracked(root, entryFile),
    },
  ];

  const score = checks.filter((c) => c.pass).length;
  const filesForLlm = entryFilesFound.slice(0, 3);

  return {
    id,
    name: "控制面分层",
    name_en: "Control Plane Layering",
    principle: "Prompt 是控制面",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: filesForLlm,
  };
}

function evaluateP3(root: string): Dimension {
  const id = "P3";
  const workflowPatterns = [
    "workflows/*.md",
    ".claude/commands/*.md",
    "docs/workflows/*.md",
  ];
  const progressPatterns = [
    "**/progress.md",
    "templates/workflow-progress.md",
    "templates/progress*.md",
  ];

  const workflowFiles = findAll(root, workflowPatterns);
  const progressFiles = findAll(root, progressPatterns);
  const filesFound = [...workflowFiles, ...progressFiles];

  // Check step numbering and quality gate references in workflow files
  let hasSteps = false;
  let hasQualityGate = false;
  for (const wf of workflowFiles) {
    const content = safeReadFile(path.join(root, wf));
    if (hasStepNumbering(content)) hasSteps = true;
    if (
      containsAny(content, [
        "quality_gate",
        "quality-gate",
        "quality gate",
        "gate",
      ])
    ) {
      hasQualityGate = true;
    }
  }

  const checks: Check[] = [
    {
      name: "工作流文件存在",
      name_en: "Workflow file exists",
      pass: workflowFiles.length > 0,
      detail: `${workflowFiles.length} workflow files`,
    },
    {
      name: "有步骤编号",
      name_en: "Has step numbering",
      pass: hasSteps,
    },
    {
      name: "有 quality gate 引用",
      name_en: "Has quality gate reference",
      pass: hasQualityGate,
    },
    {
      name: "进度模板存在",
      name_en: "Progress template exists",
      pass: progressFiles.length > 0,
      ...(progressFiles.length > 0 ? { path: progressFiles[0] } : {}),
    },
    {
      name: ">= 2 个工作流文件",
      name_en: ">= 2 workflow files",
      pass: workflowFiles.length >= 2,
      detail: `${workflowFiles.length} files`,
    },
  ];

  const score = checks.filter((c) => c.pass).length;
  const filesForLlm = [...workflowFiles.slice(0, 2), ...progressFiles.slice(0, 1)];

  return {
    id,
    name: "工作流连续性",
    name_en: "Workflow Continuity",
    principle: "Query loop 是心跳",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: filesForLlm,
  };
}

function evaluateP4(root: string): Dimension {
  const id = "P4";
  const hookPaths = [
    ".claude/settings.json",
    ".codex/hooks/",
    ".husky/",
    ".git/hooks/",
    "lint-staged.config.*",
    "lint-staged.config.js",
    "lint-staged.config.mjs",
    "lint-staged.config.cjs",
    ".lintstagedrc",
    ".lintstagedrc.json",
  ];

  const filesFound: string[] = [];
  let hooksConfigExists = false;
  let hasPreToolUse = false;
  let hasPostToolUse = false;
  let hooksExecutable = false;
  let coversBash = false;

  // Check .claude/settings.json for hooks
  const claudeSettingsPath = path.join(root, ".claude/settings.json");
  if (exists(claudeSettingsPath)) {
    filesFound.push(".claude/settings.json");
    const content = safeReadFile(claudeSettingsPath);
    try {
      const settings = JSON.parse(content);
      if (settings.hooks) {
        hooksConfigExists = true;
        const hooksStr = JSON.stringify(settings.hooks);
        if (hooksStr.includes("PreToolUse")) hasPreToolUse = true;
        if (hooksStr.includes("PostToolUse")) hasPostToolUse = true;
        if (
          containsAny(hooksStr, [
            "Bash",
            "bash",
            "shell",
            "commit",
          ])
        ) {
          coversBash = true;
        }
        // Claude hooks are config-based, consider them "executable"
        hooksExecutable = true;
      }
    } catch {
      // malformed JSON
    }
  }

  // Check .husky/
  const huskyDir = path.join(root, ".husky");
  if (isDirectory(huskyDir)) {
    hooksConfigExists = true;
    try {
      for (const entry of fs.readdirSync(huskyDir)) {
        const fullPath = path.join(huskyDir, entry);
        if (!isDirectory(fullPath) && !entry.startsWith("_") && !entry.startsWith(".")) {
          filesFound.push(`.husky/${entry}`);
          if (entry === "pre-commit") hasPreToolUse = true;
          if (entry === "post-commit") hasPostToolUse = true;
          if (isExecutable(fullPath)) hooksExecutable = true;
          const content = safeReadFile(fullPath);
          if (containsAny(content, ["bash", "shell", "commit"])) {
            coversBash = true;
          }
        }
      }
    } catch {
      // permission denied
    }
  }

  // Check .codex/hooks/
  const codexHooksDir = path.join(root, ".codex/hooks");
  if (isDirectory(codexHooksDir)) {
    hooksConfigExists = true;
    filesFound.push(".codex/hooks/");
    try {
      for (const entry of fs.readdirSync(codexHooksDir)) {
        const fullPath = path.join(codexHooksDir, entry);
        if (!isDirectory(fullPath)) {
          if (entry.includes("pre")) hasPreToolUse = true;
          if (entry.includes("post")) hasPostToolUse = true;
          if (isExecutable(fullPath)) hooksExecutable = true;
        }
      }
    } catch {
      // permission denied
    }
  }

  // Check .git/hooks/ for non-sample files
  const gitHooksDir = path.join(root, ".git/hooks");
  if (isDirectory(gitHooksDir)) {
    try {
      for (const entry of fs.readdirSync(gitHooksDir)) {
        if (!entry.endsWith(".sample")) {
          const fullPath = path.join(gitHooksDir, entry);
          if (!isDirectory(fullPath)) {
            hooksConfigExists = true;
            filesFound.push(`.git/hooks/${entry}`);
            if (entry === "pre-commit") hasPreToolUse = true;
            if (entry === "post-commit") hasPostToolUse = true;
            if (isExecutable(fullPath)) hooksExecutable = true;
          }
        }
      }
    } catch {
      // permission denied
    }
  }

  // Check lint-staged config
  const lintStagedPatterns = [
    "lint-staged.config.js",
    "lint-staged.config.mjs",
    "lint-staged.config.cjs",
    ".lintstagedrc",
    ".lintstagedrc.json",
  ];
  for (const p of lintStagedPatterns) {
    if (exists(path.join(root, p))) {
      hooksConfigExists = true;
      filesFound.push(p);
      hasPreToolUse = true; // lint-staged implies pre-commit
    }
  }

  const checks: Check[] = [
    {
      name: "hooks 配置存在",
      name_en: "Hooks config exists",
      pass: hooksConfigExists,
    },
    {
      name: "有 PreToolUse 或等效",
      name_en: "Has PreToolUse or pre-commit equivalent",
      pass: hasPreToolUse,
    },
    {
      name: "有 PostToolUse 或等效",
      name_en: "Has PostToolUse or post-commit equivalent",
      pass: hasPostToolUse,
    },
    {
      name: "hook 脚本可执行",
      name_en: "Hook scripts are executable",
      pass: hooksExecutable,
    },
    {
      name: "覆盖 Bash/shell 工具",
      name_en: "Covers Bash/shell tools",
      pass: coversBash,
    },
  ];

  const score = checks.filter((c) => c.pass).length;

  return {
    id,
    name: "工具治理",
    name_en: "Tool Governance",
    principle: "工具是受管接口",
    score,
    max: 5,
    checks,
    files_found: [...new Set(filesFound)],
    files_for_llm: filesFound.slice(0, 3),
  };
}

function evaluateP5(root: string): Dimension {
  const id = "P5";
  const directoryLevelPatterns = [
    "packages/*/CLAUDE.md",
    "apps/*/CLAUDE.md",
    "src/*/CLAUDE.md",
    "modules/*/CLAUDE.md",
  ];
  const entryPaths = ["CLAUDE.md", "AGENTS.md", ".cursorrules"];

  const directoryLevelFiles = findAll(root, directoryLevelPatterns);
  const entryFilesFound = findAll(root, entryPaths);
  const filesFound = [...entryFilesFound, ...directoryLevelFiles];

  // Measure total entry file size
  let totalEntrySize = 0;
  let maxSingleFileSize = 0;
  for (const f of entryFilesFound) {
    const size = fileSize(path.join(root, f));
    totalEntrySize += size;
    if (size > maxSingleFileSize) maxSingleFileSize = size;
  }

  // Check for on-demand loading instructions
  let hasOnDemandLoading = false;
  let hasStaticDynamicSeparation = false;
  for (const f of entryFilesFound) {
    const content = safeReadFile(path.join(root, f));
    if (
      containsAny(content, [
        "按需",
        "on-demand",
        "when needed",
        "load only",
        "only load",
        "需要时",
        "仅加载",
      ])
    ) {
      hasOnDemandLoading = true;
    }
    if (
      containsAny(content, [
        "static",
        "dynamic",
        "静态",
        "动态",
        "always load",
        "on demand",
        "preload",
        "lazy",
      ])
    ) {
      hasStaticDynamicSeparation = true;
    }
  }

  const checks: Check[] = [
    {
      name: "目录级入口 >= 3",
      name_en: "Directory-level entries >= 3",
      pass: directoryLevelFiles.length >= 3,
      detail: `${directoryLevelFiles.length} directory-level files`,
    },
    {
      name: "入口总大小 < 15KB",
      name_en: "Total entry file size < 15KB",
      pass: totalEntrySize < 15360,
      detail: `${totalEntrySize} bytes total`,
    },
    {
      name: "无单文件 > 8KB",
      name_en: "No single entry file > 8KB",
      pass: maxSingleFileSize <= 8192,
      detail: `max ${maxSingleFileSize} bytes`,
    },
    {
      name: "有按需加载指引",
      name_en: "Has on-demand loading instruction",
      pass: hasOnDemandLoading,
    },
    {
      name: "有静态/动态分区概念",
      name_en: "Has static/dynamic separation concept",
      pass: hasStaticDynamicSeparation,
    },
  ];

  const score = checks.filter((c) => c.pass).length;

  return {
    id,
    name: "上下文预算",
    name_en: "Context Budget",
    principle: "上下文是工作内存",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: entryFilesFound.slice(0, 3),
  };
}

function evaluateP6(root: string): Dimension {
  const id = "P6";

  const filesFound: string[] = [];

  // Check for PostToolUse or post-write hook
  let hasPostToolUse = false;
  let hasLintHook = false;
  let hasStopHook = false;

  const claudeSettingsPath = path.join(root, ".claude/settings.json");
  if (exists(claudeSettingsPath)) {
    filesFound.push(".claude/settings.json");
    const content = safeReadFile(claudeSettingsPath);
    try {
      const settings = JSON.parse(content);
      if (settings.hooks) {
        const hooksStr = JSON.stringify(settings.hooks);
        if (hooksStr.includes("PostToolUse")) hasPostToolUse = true;
        if (containsAny(hooksStr, ["lint", "typecheck", "tsc", "eslint"])) {
          hasLintHook = true;
        }
        if (hooksStr.includes("Stop")) hasStopHook = true;
      }
    } catch {
      // malformed JSON
    }
  }

  // Check husky pre-commit for lint
  const huskyPreCommit = path.join(root, ".husky/pre-commit");
  if (exists(huskyPreCommit)) {
    filesFound.push(".husky/pre-commit");
    const content = safeReadFile(huskyPreCommit);
    if (containsAny(content, ["lint", "typecheck", "tsc", "eslint"])) {
      hasLintHook = true;
    }
    hasPostToolUse = true; // pre-commit is a form of post-write check
  }

  // Check for error handling docs
  const errorDocPatterns = [
    "**/error-recovery.md",
    "**/error-handling.md",
  ];
  const errorDocs = findAll(root, errorDocPatterns);
  for (const f of errorDocs) {
    if (!filesFound.includes(f)) filesFound.push(f);
  }

  // Check for CI config
  const ciPaths = [
    ".gitlab-ci.yml",
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
    "Jenkinsfile",
    ".circleci/config.yml",
  ];
  const ciFiles = findAll(root, ciPaths);
  for (const f of ciFiles) {
    if (!filesFound.includes(f)) filesFound.push(f);
  }

  const checks: Check[] = [
    {
      name: "PostToolUse 或写入后检查存在",
      name_en: "PostToolUse or post-write hook exists",
      pass: hasPostToolUse,
    },
    {
      name: "有 lint/typecheck hook",
      name_en: "Has lint/typecheck in hooks",
      pass: hasLintHook,
    },
    {
      name: "有 Stop/session-end hook",
      name_en: "Has Stop/session-end hook",
      pass: hasStopHook,
    },
    {
      name: "错误处理文档存在",
      name_en: "Error handling doc exists",
      pass: errorDocs.length > 0,
      ...(errorDocs.length > 0 ? { path: errorDocs[0] } : {}),
    },
    {
      name: "CI 配置存在",
      name_en: "CI config exists",
      pass: ciFiles.length > 0,
      ...(ciFiles.length > 0 ? { path: ciFiles[0] } : {}),
    },
  ];

  const score = checks.filter((c) => c.pass).length;

  return {
    id,
    name: "错误路径",
    name_en: "Error Path",
    principle: "错误路径 = 主路径",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: filesFound.slice(0, 3),
  };
}

function evaluateP7(root: string): Dimension {
  const id = "P7";

  const filesFound: string[] = [];

  // Check for progress template
  const progressPatterns = [
    "templates/workflow-progress.md",
    "**/progress.md",
  ];
  const progressFiles = findAll(root, progressPatterns);
  for (const f of progressFiles) filesFound.push(f);

  // Check .claude/settings.json for UserPromptSubmit and Stop hooks
  let hasSessionStartHook = false;
  let hasHealthCheck = false;

  const claudeSettingsPath = path.join(root, ".claude/settings.json");
  if (exists(claudeSettingsPath)) {
    if (!filesFound.includes(".claude/settings.json")) {
      filesFound.push(".claude/settings.json");
    }
    const content = safeReadFile(claudeSettingsPath);
    try {
      const settings = JSON.parse(content);
      if (settings.hooks) {
        const hooksStr = JSON.stringify(settings.hooks);
        if (hooksStr.includes("UserPromptSubmit")) {
          hasSessionStartHook = true;
          // Check if health check is in the hook command
          if (
            containsAny(hooksStr, [
              "git status",
              "typecheck",
              "tsc",
              "health",
              "check",
            ])
          ) {
            hasHealthCheck = true;
          }
        }
        // Also check for Stop hook as an alternative session boundary hook
        if (hooksStr.includes("Stop") && !hasSessionStartHook) {
          hasSessionStartHook = true;
        }
      }
    } catch {
      // malformed JSON
    }
  }

  // Check if progress template has YAML frontmatter
  let progressHasFrontmatter = false;
  if (progressFiles.length > 0) {
    const content = safeReadFile(path.join(root, progressFiles[0]));
    progressHasFrontmatter = hasYamlFrontmatter(content);
  }

  // Check if workflow files reference recovery/resume
  const workflowPatterns = [
    "workflows/*.md",
    ".claude/commands/*.md",
    "docs/workflows/*.md",
  ];
  const workflowFiles = findAll(root, workflowPatterns);
  let workflowReferencesRecovery = false;
  for (const wf of workflowFiles) {
    const content = safeReadFile(path.join(root, wf));
    if (
      containsAny(content, [
        "recover",
        "resume",
        "恢复",
        "续写",
        "中断",
        "interrupt",
        "progress",
      ])
    ) {
      workflowReferencesRecovery = true;
      break;
    }
  }

  const checks: Check[] = [
    {
      name: "进度模板存在",
      name_en: "Progress template exists",
      pass: progressFiles.length > 0,
      ...(progressFiles.length > 0 ? { path: progressFiles[0] } : {}),
    },
    {
      name: "有 session-start hook",
      name_en: "Session-start hook exists (UserPromptSubmit)",
      pass: hasSessionStartHook,
    },
    {
      name: "session-start 有健康检查",
      name_en: "Session-start does health check",
      pass: hasHealthCheck,
    },
    {
      name: "进度模板有 YAML frontmatter",
      name_en: "Progress template has YAML frontmatter",
      pass: progressHasFrontmatter,
    },
    {
      name: "工作流引用恢复/续写",
      name_en: "Workflow files reference recovery/resume",
      pass: workflowReferencesRecovery,
    },
  ];

  const score = checks.filter((c) => c.pass).length;

  return {
    id,
    name: "中断恢复",
    name_en: "Interrupt Recovery",
    principle: "恢复目标是续写",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: [...progressFiles.slice(0, 1), ...workflowFiles.slice(0, 2)],
  };
}

function evaluateP8(root: string): Dimension {
  const id = "P8";
  const agentPatterns = [
    "agents/*/AGENT.md",
    ".claude/agents/*.md",
    ".codex/agents/*",
    "docs/agents/*",
  ];

  const agentFiles = findAll(root, agentPatterns);
  const filesFound = [...agentFiles];

  // Parse agent definitions for analysis
  interface AgentInfo {
    readonly file: string;
    readonly content: string;
    readonly hasFrontmatter: boolean;
    readonly tools: string;
    readonly knowledgeAccess: string;
    readonly isReadOnly: boolean;
  }

  const agents: AgentInfo[] = [];
  for (const af of agentFiles) {
    const content = safeReadFile(path.join(root, af));
    const hasFm = hasYamlFrontmatter(content);

    // Extract tools field from frontmatter
    let tools = "";
    let knowledgeAccess = "";
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const toolsMatch = fm.match(/(?:tools|allowed.?tools)\s*:\s*(.+)/i);
      if (toolsMatch) tools = toolsMatch[1];
      const kaMatch = fm.match(/knowledge.?access\s*:\s*(.+)/i);
      if (kaMatch) knowledgeAccess = kaMatch[1];
    }

    // Also check body for tools/allowed-tools
    if (!tools) {
      const bodyToolsMatch = content.match(
        /(?:tools|allowed.?tools)\s*:\s*\[([^\]]+)\]/i,
      );
      if (bodyToolsMatch) tools = bodyToolsMatch[1];
    }

    const isReadOnly =
      tools.length > 0 &&
      !containsAny(tools, ["Write", "Edit", "Bash", "bash", "write", "edit"]) &&
      containsAny(tools, ["Read", "Grep", "Glob", "read", "grep", "glob"]);

    agents.push({
      file: af,
      content,
      hasFrontmatter: hasFm,
      tools,
      knowledgeAccess,
      isReadOnly,
    });
  }

  // Check tools field differs
  const uniqueTools = new Set(agents.map((a) => a.tools).filter(Boolean));
  const toolsDiffer = uniqueTools.size >= 2;

  // Check knowledge_access differs
  const uniqueKa = new Set(
    agents.map((a) => a.knowledgeAccess).filter(Boolean),
  );
  const kaDiffers = uniqueKa.size >= 2;

  const checks: Check[] = [
    {
      name: "角色定义 >= 2",
      name_en: "Agent definitions >= 2",
      pass: agents.length >= 2,
      detail: `${agents.length} agents`,
    },
    {
      name: "有只读角色",
      name_en: "Has read-only agent",
      pass: agents.some((a) => a.isReadOnly),
    },
    {
      name: "角色有 YAML frontmatter",
      name_en: "Agents have YAML frontmatter",
      pass: agents.length > 0 && agents.some((a) => a.hasFrontmatter),
    },
    {
      name: "tools 字段有差异",
      name_en: "Tools field differs between agents",
      pass: toolsDiffer,
    },
    {
      name: "knowledge_access 有差异",
      name_en: "Knowledge access differs between agents",
      pass: kaDiffers,
    },
  ];

  const score = checks.filter((c) => c.pass).length;

  return {
    id,
    name: "角色分离",
    name_en: "Role Separation",
    principle: "多代理靠角色分离",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: agentFiles.slice(0, 3),
  };
}

function evaluateP9(root: string): Dimension {
  const id = "P9";
  const verificationPaths = [
    "governance/verification.md",
    ".claude/rules/verification.md",
    "docs/verification.md",
  ];
  const reviewerPatterns = [
    "agents/*reviewer*",
    "agents/*review*",
    "agents/*verif*",
  ];

  const verificationFiles = findAll(root, verificationPaths);
  const reviewerFiles = findAll(root, reviewerPatterns);
  const filesFound = [...verificationFiles, ...reviewerFiles];

  const verificationFile =
    verificationFiles.length > 0 ? verificationFiles[0] : null;
  const verificationContent =
    verificationFile !== null
      ? safeReadFile(path.join(root, verificationFile))
      : "";

  // Check for anti-rationalization rules
  const hasAntiRationalization = containsAny(verificationContent, [
    "不是验证",
    "not verification",
    "rationali",
    "不接受",
    "不能接受",
    "must not accept",
    "do not accept",
    "看起来没问题",
    "looks fine",
    "反合理化",
  ]);

  // Check if reviewer is read-only
  let reviewerIsReadOnly = false;
  for (const rf of reviewerFiles) {
    const content = safeReadFile(path.join(root, rf));
    const toolsMatch = content.match(
      /(?:tools|allowed.?tools)\s*:\s*\[([^\]]+)\]/i,
    );
    if (toolsMatch) {
      const tools = toolsMatch[1];
      if (
        !containsAny(tools, ["Write", "Edit", "Bash", "write", "edit"]) &&
        containsAny(tools, ["Read", "Grep", "Glob", "read", "grep", "glob"])
      ) {
        reviewerIsReadOnly = true;
        break;
      }
    }
  }

  // Check for PASS/FAIL output format
  const hasPassFailFormat = containsAny(verificationContent, [
    "PASS",
    "FAIL",
    "pass/fail",
    "通过/不通过",
  ]);

  const checks: Check[] = [
    {
      name: "验证文件存在",
      name_en: "Verification file exists",
      pass: verificationFile !== null,
      ...(verificationFile !== null ? { path: verificationFile } : {}),
    },
    {
      name: "有反合理化规则",
      name_en: "Has anti-rationalization rules",
      pass: hasAntiRationalization,
    },
    {
      name: "reviewer 角色存在",
      name_en: "Reviewer/verifier role exists",
      pass: reviewerFiles.length > 0,
      ...(reviewerFiles.length > 0 ? { path: reviewerFiles[0] } : {}),
    },
    {
      name: "reviewer 是只读角色",
      name_en: "Reviewer is read-only",
      pass: reviewerIsReadOnly,
    },
    {
      name: "有 PASS/FAIL 输出格式",
      name_en: "Has PASS/FAIL output format",
      pass: hasPassFailFormat,
    },
  ];

  const score = checks.filter((c) => c.pass).length;

  return {
    id,
    name: "验证独立",
    name_en: "Independent Verification",
    principle: "验证必须独立",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: [
      ...verificationFiles.slice(0, 1),
      ...reviewerFiles.slice(0, 2),
    ],
  };
}

function evaluateP10(root: string): Dimension {
  const id = "P10";
  const governanceDirs = ["governance/", ".claude/rules/", "docs/governance/"];
  const qualityPaths = [
    "governance/quality-gates.md",
    "**/quality-gates.md",
  ];

  const filesFound: string[] = [];

  // Check governance directory exists
  let governanceDirExists = false;
  let governanceDirPath: string | null = null;
  for (const dir of governanceDirs) {
    if (isDirectory(path.join(root, dir))) {
      governanceDirExists = true;
      governanceDirPath = dir;
      filesFound.push(dir);
      break;
    }
  }

  // Count rule files in governance directory
  let ruleFileCount = 0;
  const ruleFiles: string[] = [];
  if (governanceDirPath !== null) {
    const governanceFullPath = path.join(root, governanceDirPath);
    try {
      for (const entry of fs.readdirSync(governanceFullPath)) {
        const fullPath = path.join(governanceFullPath, entry);
        if (
          !isDirectory(fullPath) &&
          (entry.endsWith(".md") || entry.endsWith(".yml") || entry.endsWith(".yaml"))
        ) {
          ruleFileCount++;
          ruleFiles.push(path.join(governanceDirPath, entry));
        }
      }
    } catch {
      // permission denied
    }
  }
  for (const rf of ruleFiles) {
    if (!filesFound.includes(rf)) filesFound.push(rf);
  }

  // Check for quality-gates file
  const qualityFiles = findAll(root, qualityPaths);
  for (const f of qualityFiles) {
    if (!filesFound.includes(f)) filesFound.push(f);
  }

  // Check if rules have consistent format (## headings)
  let rulesHaveConsistentFormat = false;
  let formattedCount = 0;
  for (const rf of ruleFiles) {
    const content = safeReadFile(path.join(root, rf));
    if (hasStructuredFormat(content)) formattedCount++;
  }
  if (ruleFileCount >= 2 && formattedCount >= ruleFileCount * 0.5) {
    rulesHaveConsistentFormat = true;
  }

  // Check that documentation doesn't rely on oral knowledge
  // Heuristic: governance dir exists AND has >= 2 files AND files have content
  let hasExplicitWrittenRules = false;
  if (ruleFileCount >= 2) {
    let totalContent = 0;
    for (const rf of ruleFiles) {
      totalContent += safeReadFile(path.join(root, rf)).length;
    }
    hasExplicitWrittenRules = totalContent > 500;
  }

  const checks: Check[] = [
    {
      name: "governance 目录存在",
      name_en: "Governance directory exists",
      pass: governanceDirExists,
      ...(governanceDirPath !== null ? { path: governanceDirPath } : {}),
    },
    {
      name: "规则文件 >= 2",
      name_en: "Rule files >= 2",
      pass: ruleFileCount >= 2,
      detail: `${ruleFileCount} rule files`,
    },
    {
      name: "有 quality-gates 文件",
      name_en: "Has quality-gates file",
      pass: qualityFiles.length > 0,
      ...(qualityFiles.length > 0 ? { path: qualityFiles[0] } : {}),
    },
    {
      name: "规则有格式规范",
      name_en: "Rules have consistent format (## headings)",
      pass: rulesHaveConsistentFormat,
    },
    {
      name: "不依赖口头传递",
      name_en: "Has explicit written rules (not oral knowledge)",
      pass: hasExplicitWrittenRules,
    },
  ];

  const score = checks.filter((c) => c.pass).length;

  return {
    id,
    name: "团队制度",
    name_en: "Team Institution",
    principle: "制度 > 技巧",
    score,
    max: 5,
    checks,
    files_found: filesFound,
    files_for_llm: [
      ...qualityFiles.slice(0, 1),
      ...ruleFiles.slice(0, 2),
    ],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function scan(root: string): ScanResult {
  const dimensions: Dimension[] = [
    evaluateP1(root),
    evaluateP2(root),
    evaluateP3(root),
    evaluateP4(root),
    evaluateP5(root),
    evaluateP6(root),
    evaluateP7(root),
    evaluateP8(root),
    evaluateP9(root),
    evaluateP10(root),
  ];

  const scriptScore = dimensions.reduce((sum, d) => sum + d.score, 0);
  const dimensionsMissing = dimensions
    .filter((d) => d.score === 0)
    .map((d) => d.id);

  return {
    version: "1.0.0",
    root,
    timestamp: new Date().toISOString(),
    commit: gitShortHash(root),
    dimensions,
    summary: {
      script_score: scriptScore,
      script_max: 50,
      dimensions_found: 10 - dimensionsMissing.length,
      dimensions_missing: dimensionsMissing,
    },
  };
}

// Entry point
const { root } = parseArgs(process.argv);

if (!exists(root)) {
  process.stderr.write(`Error: root directory does not exist: ${root}\n`);
  process.exit(1);
}

if (!isDirectory(root)) {
  process.stderr.write(`Error: root is not a directory: ${root}\n`);
  process.exit(1);
}

const result = scan(root);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
