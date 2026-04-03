# Contributing to cc-harness

Thanks for your interest! There are three main ways to contribute.

## 1. Add probe paths for new AI tools

If you use an AI coding tool that cc-harness doesn't detect yet, you can add its config paths.

Edit `audit/scripts/scan.ts`, find the probe path definitions for the relevant dimension, and add your tool's path patterns. For example, to add support for a new tool called "AICoder":

```typescript
// In the P2 dimension evaluator, add:
primary: [...existing, '.aicoder/config.md']
directory_level: [...existing, 'packages/*/.aicoder.md']
```

### Guidelines
- Add to the most specific dimension(s) only
- Primary paths should be exact; fallback paths can use glob patterns
- Test against a real project that uses the tool
- Include the tool name in your PR description

## 2. Add new check items

Each dimension has exactly 5 deterministic checks. To improve a check:

1. Open an issue describing what the current check misses
2. Propose a replacement check that is still **deterministic** (same input = same output)
3. The check must work across different project structures

To add LLM semantic criteria, edit `audit/references/dimensions.md`. Criteria should be:
- Observable (can be judged from file content)
- Non-overlapping with other criteria in the same dimension
- Applicable across project types

## 3. Contribute toolkit templates

The `toolkit/` directory contains templates for teams and enterprise builders. Contributions welcome:

- **team/**: Practical, copy-pasteable templates for real team workflows
- **enterprise/**: Design patterns and decision frameworks for agent system builders

### Template guidelines
- Write in English (Chinese annotations welcome for bilingual content)
- Include concrete examples, not just abstract descriptions
- Link to the principle(s) the template implements
- Test against a real project before submitting

## PR process

1. Fork the repo
2. Create a branch: `feat/add-aicoder-support` or `docs/improve-p3-checks`
3. Make your changes
4. Run `npx tsx audit/scripts/scan.ts --root .` to make sure the scanner still works
5. Open a PR with a clear description of what and why

## Code of Conduct

Be constructive. This project exists to help teams build better AI workflows. Contributions that improve clarity, coverage, or correctness are valued.
