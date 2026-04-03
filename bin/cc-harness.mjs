#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scanScript = resolve(__dirname, '..', 'skills', 'cc-audit', 'scripts', 'scan.ts');

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help') {
  console.log(`
  cc-harness — Harness Engineering Compliance Audit

  Usage:
    cc-harness scan [--root <path>]    Run deterministic scan (50 points)
    cc-harness help                    Show this help

  Examples:
    cc-harness scan                    Scan current directory
    cc-harness scan --root ../my-app   Scan a specific project

  For full audit (100 points), use the Claude Code skill:
    /cc-audit
`);
  process.exit(0);
}

if (command === 'scan') {
  const restArgs = args.slice(1).join(' ');
  try {
    execSync(`npx tsx "${scanScript}" ${restArgs}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (e) {
    process.exit(e.status || 1);
  }
} else {
  console.error(`Unknown command: ${command}\nRun "cc-harness help" for usage.`);
  process.exit(1);
}
