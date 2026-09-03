$root = (Get-Location).Path
$srcPath = Join-Path $root 'tests\at\harness\runner.selftest.ts'
$src = [System.IO.File]::ReadAllLines($srcPath)

function Slice([string[]]$lines, [int]$start, [int]$end) {
  return ($lines[($start - 1)..($end - 1)] -join "`r`n")
}

$header = @"
/**
 * Tests OF the one-stack lifecycle, not tests run BY the runner.
 *
 * These deliberately live outside ``tests/at/suites/`` and depend on nothing that AI4DEV-3 has not
 * built yet. They import the lifecycle's pure pieces and spawn a real child process, so they run
 * today, on a machine with no stack and no Docker. Run them with ``bun run at:selftest``.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { lifetimeProblem } from '../suites/req-001/_live.ts';
import { AT_CONFIG } from './atconfig.ts';
import { REPO_ROOT } from './check.ts';
import {
  acquireStackLock,
  bunExecutable,
  childCoordinates,
  childEnv,
  configDriftProblems,
  containerNames,
  evidenceLine,
  expectedMigrations,
  identityVerdict,
  lifetimePinProblem,
  localStackProblems,
  migrationSetProblems,
  readLocalConfig,
  redact,
  resetLocalDatabase,
  stackLockPath,
  treeState,
  type CliResult,
  type CliTarget,
  type LocalConfig,
  type StackStatus,
} from './local-stack.ts';
"@

$helpers = Slice $src 129 161
$block1 = Slice $src 163 404
$preflight = Slice $src 438 472
$redactBlock = Slice $src 474 481
$lock = (Slice $src 483 610).Replace("new URL('./runner.ts', import.meta.url)", "new URL('./local-stack.ts', import.meta.url)")
$migrations = Slice $src 621 663

$body = ($header.TrimEnd() + "`r`n`r`n" + $helpers + "`r`n`r`n" + $block1 + "`r`n`r`n" + $preflight + "`r`n`r`n" + $redactBlock + "`r`n`r`n" + $lock + "`r`n`r`n" + $migrations + "`r`n")

$outPath = Join-Path $root 'tests\at\harness\local-stack.selftest.ts'
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outPath, $body, $utf8)

$keptImports = @"
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './check.ts';
import {
  bunExecutable,
  childEnv,
  cleanupRun,
  runVerdict,
  type IdRow,
} from './runner.ts';
"@

$keptHeader = Slice $src 1 13
$sentinels = Slice $src 52 62
$childEnvBlock = Slice $src 64 105
$nonzero = Slice $src 107 127
$checkout = Slice $src 406 436
$released = Slice $src 612 619

$kept = ($keptHeader + "`r`n`r`n" + $keptImports.TrimEnd() + "`r`n`r`n" + $sentinels + "`r`n`r`n" + $childEnvBlock + "`r`n`r`n" + $nonzero + "`r`n`r`n" + $checkout + "`r`n`r`n" + $released + "`r`n")

$keptPath = Join-Path $root 'tests\at\harness\runner.selftest.ts'
[System.IO.File]::WriteAllText($keptPath, $kept, $utf8)

$newLines = ([regex]::Matches($body, "`n")).Count
$keptLines = ([regex]::Matches($kept, "`n")).Count
Write-Output "wrote local-stack.selftest.ts lines=$newLines"
Write-Output "wrote runner.selftest.ts lines=$keptLines"
Write-Output ("lock url now: " + ([regex]::Match($lock, "new URL\([^)]+\)")).Value)
