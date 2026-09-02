$root = (Get-Location).Path
$srcPath = Join-Path $root 'tests\at\harness\runner.ts'
$src = [System.IO.File]::ReadAllLines($srcPath)

function Slice([string[]]$lines, [int]$start, [int]$end) {
  return ($lines[($start - 1)..($end - 1)] -join "`r`n")
}

$localHeader = @"
/**
 * THE ONE STACK. The ``integration`` tier needs a real database, and that database is THE ONE
 * STACK: the project this tree's own ``supabase/config.toml`` declares (``project_id``, ``[api] port``),
 * running at this tree's root — never a shared hosted project, because every run wipes and rebuilds
 * it. There is no pool and no slot. It runs only from the real checkout: ``AT_REPO_ROOT`` redirects
 * the data root for the runner's own tests, and a data root must not choose which database is reset.
 * It refuses before the lock, from two files on disk, when ``[auth] jwt_expiry`` and the registry's
 * ``accessTokenLifetimeSeconds`` differ. THE DATA COST IS STATED: every integration run resets this
 * database, and the evidence line says so on every run. The sequence is deliberately paranoid:
 *
 *   1. take the machine-wide lock keyed by that project id + api port, so two runs cannot reset
 *      under each other — a lock that only a dead holder's process id can free;
 *   2. PROVE the stack that answers is that project — from the CLI's own container names, never
 *      from ports alone — and that it is local: loopback host, the configured ports, keys issued
 *      by the local development issuer. The proof is a branded value only that verdict can mint,
 *      and the reset demands it, so the reset cannot run without it;
 *   3. re-read ``supabase/config.toml`` and refuse if it changed under the lock, prove the identity
 *      again immediately before the reset, reset on that second proof, and prove the migration set
 *      replayed;
 *   5. run the suite with an ALLOWLISTED environment — the child gets the platform minimum plus
 *      the proven coordinates, and nothing else, so a secret sitting in a developer's
 *      ``.env.local`` can never reach a test (and a test can never reach the hosted project).
 *
 * Secrets are never printed: raw CLI output is redacted, and validation reports which check
 * failed, never the value that failed it.
 */

import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

import { AT_CONFIG } from './atconfig.ts';
import { INSTALL_ROOT, REPO_ROOT } from './check.ts';
"@

# The listed contents, in the runner's current order, with helpers the lifecycle needs
# inserted after the constants (they sat after parseArgs in the runner).
$constants = Slice $src 64 79
$helpers = Slice $src 120 221
$lifecycle = Slice $src 223 1335

$localBody = ($localHeader.TrimEnd() + "`r`n`r`n" + $constants + "`r`n`r`n" + $helpers + "`r`n`r`n" + $lifecycle + "`r`n")

$localPath = Join-Path $root 'tests\at\harness\local-stack.ts'
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($localPath, $localBody, $utf8)

$runnerHeader = @"
/**
 * The AT runner — ``bun run at:verify req-0NN --tier <loop|integration|drill>``.
 *
 * The command shape is fixed: all 30 decomposition manifests cite it verbatim in their done
 * contracts, and the skills (``/dev-start``'s inner loop, ``/dev-end``, ``/pm-done``'s gate) call it.
 * It resolves the requirement's suite, runs it under vitest with the tier passed through
 * ``AT_TIER``, and reports PER AT ID — green / red / missing — because "3 failed" tells a gate
 * nothing about which acceptance criterion is unmet.
 *
 * The ``integration`` tier's one stack — lock, identity proof, reset, migration proof, evidence
 * line, allowlisted child environment — lives in ``./local-stack.ts``.
 *
 * The ``drill`` tier resolves no database at all until an item decides which stack it should use.
 *
 * Any failure in that sequence is an INFRASTRUCTURE failure: non-zero exit, no tests run, a
 * message naming what failed. The runner never falls back to the loop tier's stubs and never
 * runs against a database whose state it could not establish — a gate grading a stand-in, or an
 * unknown database, is worse than a gate that refuses to run. Secrets are never printed: raw CLI
 * output is redacted, and validation reports which check failed, never the value that failed it.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { INSTALL_ROOT, inspectBijection, normalizeRequirement, REPO_ROOT, suiteDir } from './check.ts';
import {
  expectationDeviations,
  expectedManifestPath,
  loadTierExpectation,
  reportAccountingDeviations,
  type TierExpectation,
} from './expected.ts';
import {
  acquireStackLock,
  bunExecutable,
  childCoordinates,
  childEnv,
  diagnostic,
  evidenceLine,
  lifetimePinProblem,
  prepareLocalStack,
  readLocalConfig,
  redact,
  type CliTarget,
  type LocalConfig,
  type StackLock,
} from './local-stack.ts';

export { bunExecutable, childEnv };
"@

$tiers = Slice $src 59 62
$parseArgs = Slice $src 81 118
$tail = Slice $src 1337 1770

$runnerBody = ($runnerHeader.TrimEnd() + "`r`n`r`n" + $tiers + "`r`n`r`n" + $parseArgs + "`r`n`r`n" + $tail + "`r`n")

$runnerPath = Join-Path $root 'tests\at\harness\runner.ts'
[System.IO.File]::WriteAllText($runnerPath, $runnerBody, $utf8)

Write-Output ("local-stack.ts lines=" + ([regex]::Matches($localBody, "`n")).Count)
Write-Output ("runner.ts lines=" + ([regex]::Matches($runnerBody, "`n")).Count)
