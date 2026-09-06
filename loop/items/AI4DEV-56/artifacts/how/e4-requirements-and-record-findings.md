### Components Found

- **REQ-001 isolate** — `.taskmaster/docs/requirements/req-001.md`. Verbatim extract of the authentication requirement. Owns two-layer authz, single-seat NGO plus four guards (attestation, shared-credential ban, audited contact-transfer/recovery, one non-login escalation contact), single-dev projects, visibility, sessions, and lifecycle state that gates every write.
- **Pure section (editable source)** — `loop/out/pure-s3-req-001-006.md` lines 1–12. Same REQ-001 text as the isolate. Doc-sync forbids editing `prd-mvp.md` or the isolate to change meaning; meaning is edited here, then assembled.
- **AT-REQ-001** — `.taskmaster/docs/acceptance/at-req-001.md`. 37 P0 ids. Sections F (AT-001.25–.28, .35), G (AT-001.29–.32), H (AT-001.33–.34). Coverage map at lines 73–87. AT-001.08/11/15 are retired.
- **Decomposition manifest** — `loop/decomp/req-001.md`. Deliverable D6 has three leaves (L1 transfer/recovery/escalation, L2 lifecycle gate + AUP key revocation + re-enable, L3 append-only audit + sign-in rate limit). Header `cross-contracts` line (line 4) and `Coverage check` (line 47) are the human bijection; `check-tree.ps1` parses `verify:` lists, not the coverage-check prose.
- **NFR Security audit list** — `loop/out/pure-s7-nfr-tech-roadmap-scope.md` lines 9–14. Append-only, cannot be altered or deleted, covering: fuel transactions, project status transitions, role changes, volunteer AI-credential issuance/revocation, work-tracking webhook-ingest provenance. Rate limits on auth, Discovery, and match-consent.
- **Architecture sketch for transfer** — `.taskmaster/docs/architecture-notes.md` lines 123–126: out-of-band verification → move ownership → deactivate old → preserve history. Schema retains two-layer roles even though v1 is single-seat.
- **Roadmap deferrals** — RM-12 (teammate invites, v1.5, `roadmap.md` 55–58), RM-13 (multi-volunteer, v2, lines 212–215), RM-14 (distinct `suspended` state + staged teardown, v1.5; v1 is only active/deactivated, lines 60–63).
- **Cross-requirement isolates/ATs** — REQ-002 concierge/vetting (`req-002.md`, `at-req-002.md` AT-002.11, AT-002.28); REQ-007 AUP (`req-007.md` line 12, `at-req-007.md` AT-007.22/23); REQ-009 virtual keys (`req-009.md`, `at-req-009.md` AT-009.01/22); REQ-030 documented recovery (`req-030.md` line 10, `at-req-030.md` AT-030.11).
- **Pending declaration machinery** — `tests/at/suites/req-001/_pending.ts` (`LEAF`, `notLanded`); `tests/at/harness/pending.ts` (`AtPending`, `CapabilityPending`); `tests/at/harness/expected.ts` (shape match); `tests/at/expected/req-001.json` (current ledger).
- **Operator Givens** — `tests/at/suites/req-001/_contract.ts` `AccountsSut` operator members (`createOrganizationAsOperator`, `grantMembershipAsOperator`, `provisionPlatformAdmin`, `createProjectAsOperator`, `assignVolunteerAsOperator`, `retypeAccountAsOperator`). Loop impl `_fixture.ts`; live impl `_live.ts` (SQL as operator).
- **Doc-sync chain** — `.claude/skills/doc-sync/SKILL.md`; `loop/assemble-pure.ps1`; `loop/extract-isolates.ps1`; `loop/decomp/check-tree.ps1`; `loop/state/decisions.jsonl`.
- **AT bijection checker** — `tests/at/harness/check.ts` (`bun run at:check`).
- **CI guards** — `.github/workflows/ci.yml` ownership guard (lines 213–278) and reference guard (lines 280–366).
- **Verify skill** — `.claude/skills/verify-ai4good/SKILL.md`, `features/*.md`, `scripts/drive-ngo-signup.ts`.
- **Record convention** — `loop/items/AI4DEV-65/pending-ledger.txt`, `loop/items/AI4DEV-62/pending-ledger.txt`; PR body shape `loop/items/AI4DEV-55/artifacts/pr/body-draft.md`.

### Flow

Requirement text → acceptance ids → decomp leaves → pending stubs → land + declare green. A new id for volunteer unlink walks the same chain.

**1. Source of meaning**

REQ-001 lives in `loop/out/pure-s3-req-001-006.md` lines 1–12. `assemble-pure.ps1` concatenates the nine pure sections into `.taskmaster/docs/prd-mvp.md` and gates: 30 REQ headings, 0 `decision-NN` refs, banned-word list, 0 U+FFFD, RM bijection with `roadmap.md`. `extract-isolates.ps1 -Reqs 001` rewrites `.taskmaster/docs/requirements/req-001.md`. Isolates and `prd-mvp.md` are build products.

**2. What sections F, G, H actually require**

Section F (`at-req-001.md` 53–59):
- AT-001.25: platform admin contact-transfer moves ownership to a new account, deactivates the old, preserves history (projects, ledger, acknowledgments, audit) still attributed to original acting humans.
- AT-001.26: audit of who / when / reason.
- AT-001.27: lost-access recovery is the same audited flow as .25.
- AT-001.28: concierge onboarding stores one non-login escalation contact for the NGO.
- AT-001.35: NGO, volunteer, unauthenticated callers are refused; platform admin only.

Section G (61–66):
- AT-001.29: enumerated write endpoints; active control of matching type succeeds; deactivated account of that type is rejected; all three global types.
- AT-001.30: AUP-deactivated volunteer → writes rejected immediately and project virtual keys revoked `[cross: REQ-007]` `[cross: REQ-009]`.
- AT-001.31: platform admin re-enables; otherwise-authorized writes work again; keys re-issued per documented recovery `[cross: REQ-030]`; independent gates stay enforced.
- AT-001.32: single-dev (already green; not this run).

Section H (68–71):
- AT-001.33: append-only audit for role changes and contact transfer that cannot be altered or deleted `[NFR Security]`. Other NFR events belong to other REQs.
- AT-001.34: sign-in attempts past configured rate limit throttled; legitimate use within limit still works.

Coverage map (73–87) maps transfer/recovery/escalation to 17–20, 25–28, 35; lifecycle to 29–31; audit to 26, 33; rate limits to 34.

**3. Cross-requirement contracts (what each phrase means elsewhere)**

*Escalation contact vs “contact’s name, title, authority attestation” — two different people.*

- REQ-001 / AT-001.28: one **non-login** escalation contact stored for the NGO at concierge onboarding. Architecture notes (`architecture-notes.md` 125–126) do not specify fields for this contact.
- REQ-002 vetting audit (`req-002.md` 12; AT-002.11): the **vetting** record captures “the contact’s name + title + authority attestation”. That is the NGO person being vetted, the same three fields acknowledgments capture (AT-001.19/39). Architecture notes line 128 list those fields on the vetting record, not on an escalation contact.
- AT-002.28: concierge onboarding of an admitted pilot NGO runs the audited vet action and leaves the NGO founder-vetted at 30 credits. No REQ-002 id stores an escalation contact. AT-001.28 is the only id for that field; the **moment** is REQ-002’s concierge flow.
- Brief fact 8: no concierge onboarding surface exists; `create-organization` is today’s org-creation path.

*AUP deactivation, keys, re-enable*

- REQ-007 line 12: AUP enforcement deactivates the account (lifecycle gates every platform write), immediately revokes account writes and the project’s virtual keys; residual repo/Linear/org access then promptly removed and audited; reversal is **manual re-enable + key re-issue** (→ RM-14).
- AT-007.22: writes rejected immediately, keys revoked immediately; residual access removed within a provisional 15-minute bound; NGO prompted to remove Lovable access. `[cross: REQ-001/009]`
- AT-007.23: re-enable + re-issue restores platform writes and the new virtual key authenticates; restoration of repo/Linear/org/Lovable memberships is **not** asserted. `[cross: REQ-001.31/REQ-009]`
- REQ-009: one virtual key per (volunteer, project), minted at kickoff from a reserve of pre-created workspace+key pairs (provider mints no keys by API), shown once, never logged. AT-009.01 is minting. AT-009.22 is AUP revocation with the same immediacy as NGO “revoke now”.
- REQ-030 line 10 / AT-030.11: “the documented recovery” = manually re-enable and re-issue keys; re-issued keys work; pre-deactivation keys stay dead.
- Decomp edges: REQ-007 D5.L3 `blocked-by: … REQ-001 D6.L2 (lifecycle gate) + REQ-009 D2.L3 (key revocation)`. REQ-030 D4.L1 `blocked-by: REQ-001 D6.L2, REQ-007 D5.L3, REQ-009 D2.L3`. REQ-001 D6.L2 itself `+ AUP-deactivation key revocation [cross: REQ-009]`. Brief fact 7: nothing under `supabase/` mentions virtual keys; last merge used `capability-pending` on a named capability for a missing surface.

*NFR audit list vs AT-001.33*

NFR (`pure-s7` line 14) names five event classes. REQ-001 owns **role changes** from that list, plus **contact transfer** from REQ-001’s own audited-path clause (not a fifth NFR bullet). AT-001.33’s note says so. Password-reset audit was dropped (AT-001.14) because resets are not in the NFR list. Fuel, transitions, credentials, webhook provenance stay with their owning REQs.

*GitHub unlink vs signup-time mandate*

- REQ-001: GitHub link mandatory **at volunteer signup**.
- REQ-007: “no unlinked volunteer accounts”.
- AT-001.04/05: signup-time gate and onboarding fire. Coverage map: “GitHub link mandatory at volunteer signup → REQ-007 onboarding” = 04, 05.
- AT-001.08 retired (`at-req-001.md` line 16): “the PRD defines no identity-collision/linking policy; re-add if the PRD ever specifies one”.
- GitHub-signin leaf (`loop/items/AI4DEV-58/plan.md` 373–380 and `gate1-rulings.md` 98–117, F3 REJECT): no AT id addresses post-signup identity lifecycle; guarding unlink would be shipped behaviour no ratified text asked for. Filed, not built.
- Unit 5 of this run ratifies the 2026-08-09 ruling as a **new** P0, not a revival of AT-001.08. Acceptance README: “IDs are stable — never renumber; retire with `[retired]`.”

**4. Current pending state (what this run must flip)**

`tests/at/expected/req-001.json`:
- Loop: 25 green, 12 red. The ten D6 ids plus AT-001.18 are `pending / sut-missing`. AT-001.24 is `capability-pending` on `ui.authenticated-surface-rendering`.
- Integration: 20 green, 17 red. Same ten D6 ids plus .18 as `sut-missing`; plus five capability-pending (GitHub/Google/Discovery) and .24.

Call sites today are stubs: `e-admin-operations.test.ts` 12–20 (`notLanded(LEAF.D6_L1)`); `f-lifecycle-and-audit.test.ts` 44–48 and 127–129 (`D6_L2`, `D6_L3`). AT-001.32 in the same file is already written.

`_pending.ts` `LEAF` still has `D3_L3`, `D6_L1`, `D6_L2`, `D6_L3`. Brief fact 11: after this run, remaining pending are AT-001.18 (cross-surface single-seat, not this run) and AT-001.24 (auth-screens wiring, not this run). Landed D6 leaves remove their `LEAF` entries in the same change that moves ids to `green`.

**5. How a leaf declares red by shape**

`expected.ts` 13–23, 286–296: two kinds only.
- `pending` + phase: rebuilt prefix `AtPending: <id> PENDING [<phase>] — ` matched from position 0. Tail after the em dash is free (`_pending.ts` 21–36).
- `capability-pending` + capabilities array: whole first line `CapabilityPending: CAPABILITY PENDING — <names joined by ", ">`.

A declared red that turns green is a failure (same change must update the declaration). A red of any other cause fails the declaration. `--expect` also requires report arithmetic: failed = declared reds, passed = declared greens, no skip/todo (`expected.ts` 378–451; `tests/at/expected/README.md`).

`at:check` (`check.ts`): every P0 in the AT file has exactly one `atTest('AT-…'` call site under `tests/at/suites/req-001/*.test.ts`. Missing / extra / duplicate → exit 1. Zero P0 parsed → exit 1. Unreadable requirement → exit 2. It does **not** read the expected JSON.

`check-tree.ps1`: P0 regex `AT-001.([0-9]+[a-z]?)\s*\(P0\)` vs every `verify: AT-001.aa,bb,cc` list in the manifest. Duplicate verify ids fail. Retired ids without `(P0)` are excluded. The coverage-check prose line is not parsed.

**6. How a NEW acceptance id for REQ-001 must be added (unit 5)**

Next free number: **AT-001.41**. Used: 01–07, 09–10, 12–40. Retired holes 08, 11, 15 must not be reused (README: never renumber). Historical pattern: cx r2 added 36–39; d65 added 40 (`decisions.jsonl` d65). Always append.

Doc-sync fold order (`.claude/skills/doc-sync/SKILL.md` steps 1–7), because unit 5 ratifies product text:

1. **Classify.** New scope / product choice → founder ruling already exists (“For 73 no unlink”); still a dNN in `loop/state/decisions.jsonl`. Step 1d: new scope needs founder acceptance before anything else — the ruling is that acceptance.
2. **Edit the pure section** `loop/out/pure-s3-req-001-006.md` if REQ-001 must say post-signup permanence. Do not edit `prd-mvp.md` or the isolate. Current REQ-001 text only says “mandatory at volunteer signup”; AT-001.08’s retirement is evidence the PRD still has no linking policy until this fold.
3. **Assemble + extract + check-tree.** `powershell -File loop/assemble-pure.ps1` then `extract-isolates.ps1 -Reqs 001` then `loop/decomp/check-tree.ps1`.
4. **Amend AT file** `.taskmaster/docs/acceptance/at-req-001.md`: add `AT-001.41 (P0)` with `[dNN]`; update coverage map (GitHub-link row currently 04, 05 only). **Update the manifest** `loop/decomp/req-001.md`:
   - add a `verify:` line that includes 41 (new leaf, likely under D1 as a GitHub-permanence leaf, **not** under D6 — unit 5 hangs under the authentication root, not D6);
   - bump header `sources: … (37 P0)` → 38;
   - bump Done contract “All 37 P0” → 38;
   - rewrite the Coverage check line (today: “Total 37 = suite's 37 P0”). `check-tree.ps1` fails until a `verify:` list contains 41.
5. Design branch only if a person-visible screen changes. Unlink refusal is server-side; skip unless copy is shown.
6. Log the decision (`loop/state/decisions.jsonl`), commit as one doc bundle.
7. Forward sync to Linear.

**In the same change as the AT id** (brief unit 5: `at:check` refuses a run when an expected id has no call site):

- `atTest('AT-001.41', …)` in a file under `tests/at/suites/req-001/`.
- `tests/at/expected/req-001.json` both tiers: green if landed, or a shape-declared red. `--expect` bijection (`declarationBijectionProblems`) fails if 41 is a P0 and is absent from green+red, or present but not a P0.
- `LEAF` map: if 41 lands green in that change, **do not** add a `LEAF` entry (same rule: a label with nothing pointing at it claims something is still pending). If declared `sut-missing`, add a new leaf key matching the new manifest line and write a new `pending-ledger.txt` under this item folder. Earlier ledgers are historical and never edited (`AI4DEV-65/pending-ledger.txt` 25–26).

Coverage-check line **must** change (P0 count 37→38). D6’s ten-id list does **not** absorb 41 unless the fold deliberately puts unlink under D6 — the board does not.

**7. Adding a system-under-test member (not a new suite)**

REQ-001 already binds `sut: 'accounts'` (`_bind.ts` 34–40). A new method is **not** a new `suite-adapters.ts` line (that file is one line per **suite**, currently `req-001` and `req-016`).

To add a member:

1. Declare it on `AccountsSut` in `_contract.ts` (type alias, not interface).
2. Implement it in `_fixture.ts` (loop; Map storage + shipped decisions).
3. Implement it in `_live.ts` (integration; Auth HTTP, deployed functions, operator SQL). If the live path cannot exist, throw `CapabilityPending(['sut.accounts.<method>'])` and declare that shape at integration — precedent: OAuth members, Discovery stand-in (`_live.ts` 24–41).
4. Loop bodies that need a capability the fixture cannot grade throw the same class (`organizationAsViewer` in `_fixture.ts` 1349+).

Operator-only Givens stay operator-only: `_contract.ts` 628–707. Product paths cannot construct “admin in A and member in B” or “project with an assigned volunteer”; those Givens go through `*AsOperator` / `provisionPlatformAdmin`. Operator methods throw on Given failure (test bug) and return outcomes when the refusal **is** the criterion. Live operator writes are direct SQL, not service-role REST (`_live.ts` 17–18, 469+; `provisionPlatformAdmin` comment `_contract.ts` 794–806: service role holds no INSERT).

**8. Record conventions a leaf followed**

Pending ledger: one new file per leaf, never edit predecessors. One line per still-pending id, checked both ways against the manifest `verify:` lines. Counts must sum to the suite’s P0 count. `_pending.ts` header and `LEAF` comment list gone labels.

PR body (`AI4DEV-55/artifacts/pr/body-draft.md`): Why, Scope (units in words), Tradeoffs, Blast Radius, Verification, Not done here. Names AT ids of **this** work; must not name **other items’** Linear ids. Brief line 13: “The pull request body must not name any id but the parent's own.” Branch `nirdrang/ai4dev-56-…` owns `AI4DEV-56` only. Units written in words (“contact transfer and lost-access recovery”), never `AI4DEV-68`. One sanctioned exception: a batch partner `Closes AI4DEV-nn` line, at most one, declared in the merge ruling (`ci.yml` 337–353; `CLAUDE.md` 173–193).

Writing (`CLAUDE.md` 120–196): ASD-STE100; item ids as `id (short title)`; never another item’s id in a PR title or body.

Mechanical evidence plan shape: `AI4DEV-55/artifacts/pr/mechanical-plan.md` — typecheck, `at:check`, `at:selftest`, loop `--expect`, integration `--expect`, verify drive.

Verify skill: drive real HTTP on the 44321 stack; no admin-API user minting for evidence-grade drives; redact transcripts. Feature map today: email signup, NGO completion, volunteer GitHub gate, create-organization, update-organization. New admin operations would need a feature file if they become user-facing API.

**9. CI**

`.github/workflows/ci.yml`:
- Loop-tier `--expect` only (not integration).
- **Ownership guard** (213–278): a PR may not change both `src/` (Lovable) and `supabase|tests|loop|.claude|.github` (Claude). This work is Claude territory; do not touch `src/`. `src/routeTree.gen.ts` is exempt.
- **Reference guard** (280–366): any `AI4(DEV|PM)-[0-9]+` in title or body that the branch name does not own fails. The id itself is the trigger.

### Files Read

- `loop/items/AI4DEV-56/brief.md` (full)
- `loop/items/AI4DEV-56/decisions.tsv`
- `loop/items/AI4DEV-56/artifacts/how/e4-requirements-and-record-prompt.md` (header)
- `.taskmaster/docs/acceptance/at-req-001.md` (full, especially F/G/H and coverage map)
- `.taskmaster/docs/acceptance/README.md`
- `.taskmaster/docs/requirements/req-001.md`, `req-002.md`, `req-007.md`, `req-009.md`, `req-030.md`
- `.taskmaster/docs/acceptance/at-req-002.md`, `at-req-007.md`, `at-req-009.md`, `at-req-030.md`
- `loop/out/pure-s3-req-001-006.md` lines 1–12
- `loop/out/pure-s7-nfr-tech-roadmap-scope.md` (NFR Security + Out of Scope)
- `.taskmaster/docs/prd-mvp.md` (header + confirmed RM-13 cite)
- `.taskmaster/docs/roadmap.md` RM-12, RM-13, RM-14
- `.taskmaster/docs/architecture-notes.md` REQ-001 / REQ-002 / REQ-007
- `loop/decomp/req-001.md`, `req-002.md`, `req-007.md`, `req-009.md`, `req-030.md`, `README.md`
- `loop/decomp/check-tree.ps1`
- `loop/assemble-pure.ps1`, `loop/extract-isolates.ps1`
- `.claude/skills/doc-sync/SKILL.md`
- `.claude/skills/verify-ai4good/SKILL.md`, `features/README.md`, `features/create-organization.md`, `features/update-organization.md`, `scripts/drive-ngo-signup.ts`
- `tests/at/suites/req-001/_pending.ts`, `_bind.ts`, `_contract.ts` (AccountsSut + operator), `_fixture.ts` (provision + operator), `_live.ts` (header + operator SQL)
- `tests/at/suites/req-001/e-admin-operations.test.ts`, `f-lifecycle-and-audit.test.ts`
- `tests/at/expected/req-001.json`, `tests/at/expected/README.md`
- `tests/at/harness/expected.ts`, `check.ts`, `pending.ts`, `registry.ts` (`bindSuite`/`atTest`), `suite-adapters.ts`
- `loop/items/AI4DEV-65/pending-ledger.txt`, `loop/items/AI4DEV-62/pending-ledger.txt`
- `loop/items/AI4DEV-55/artifacts/pr/body-draft.md`, `mechanical-plan.md`, `brief.md` (header), `artifacts/how/rulings.md`
- `loop/items/AI4DEV-58/plan.md` (unlink filed), `gate1-rulings.md` F3
- `.github/workflows/ci.yml`
- `CLAUDE.md` (writing rules, branch-deletion ruling, PR-id rule, AT registration)
- `loop/state/decisions.jsonl` (d65, d84)
- `.taskmaster/docs/requirements/req-001.md` vs isolate header comments

### Boundaries

**In (this run consumes):**
- REQ-001 D6 verify sets: 25,26,27,28,35 / 29,30,31 / 33,34.
- REQ-002 concierge moment and vetting-audit field vocabulary (do not confuse with escalation contact).
- REQ-007 AUP cause and reversal definition (re-enable + key re-issue only).
- REQ-009 key mint/revoke contract (surface absent today).
- REQ-030 recovery playbook (surface absent today).
- NFR Security audit list and auth rate-limit sentence.
- Founder ruling “For 73 no unlink” (unit 5) and “AT-001.24 stays red with a declared shape” (precedent for honest reds).
- Three write routes already on `main` (brief fact 6): `complete-signup`, `create-organization`, `update-organization` — D6.L2’s registry must cover these and fail a fourth unregistered route.

**Out:**
- AT-001.18 (D3.L3, cross-surface single-seat) and AT-001.24 (auth screens).
- REQ-002 vetting action itself (AT-002.11/28 stay REQ-002’s).
- REQ-007 residual repo/Linear/org/Lovable teardown (AT-007.22’s 15-minute residual half).
- Gateway implementation (REQ-009).
- Ops runbooks beyond the recovery sentence (REQ-030).
- Reviving AT-001.08.
- Editing `prd-mvp.md` or isolates for meaning.
- Naming any Linear id except `AI4DEV-56` in the PR (and at most one sanctioned `Closes` line).
- Deleting branches or worktrees.
- Touching `src/` in the same PR as Claude-territory files.

**Produces for later waves:**
- REQ-007 D5.L3 and REQ-030 D4.L1 are blocked on D6.L2. A lifecycle-gate boundary that later write routes must register with.

### Non-Obvious Things

1. **Escalation contact ≠ vetting contact ≠ acknowledgment signer.** Three uses of “name, title, authority”. AT-001.28 is a separate non-login person. Putting the three attestation fields on the escalation contact would be mixing REQ-002’s vetting audit into REQ-001’s recovery guard.

2. **Contact transfer is audited twice in the suite** (AT-001.26 who/when/why, AT-001.33 append-only). Role-change audit is AT-001.33 only; the org-membership migration deferred that to AT-001.33 (brief fact 5). Contact transfer is **not** one of the five NFR bullets; it is REQ-001-owned.

3. **AT-001.27 is the same flow as .25**, not a second product. Lost-access recovery is not a distinct machine.

4. **Concierge onboarding is REQ-002’s vetting step, and it does not exist.** AT-001.28’s Given is a surface this tree does not have. Same class of problem as AT-001.30’s virtual keys. Declared-red shape `capability-pending` is available (brief fact 7–8); capturing at `create-organization` would be a stand-in, not the named moment.

5. **AT-001.08’s retirement is load-bearing for unlink.** The GitHub leaf explicitly refused to guard unlink because of that line. Unit 5 must add **new** ratified text (AT-001.41), not uncomment 08.

6. **`check-tree.ps1` does not read the coverage-check sentence.** Only `verify:` lists. The sentence still has to stay true for reviewers; a fold that adds 41 and forgets the sentence leaves a lying total.

7. **`--expect` bijection is against the AT file’s P0 set, not against the decomp.** `at:check` is call-site vs P0. Three independent bijections: AT↔decomp (`check-tree`), AT↔`atTest` (`at:check`), AT↔expected JSON (`--expect`). A new id must satisfy all three in one change.

8. **LEAF map is not a fourth bijection.** It only names leaves that still have `notLanded` call sites. AT-001.24 is red without a LEAF entry because it throws `CapabilityPending`, not `AtPending`. After D6 lands, `D6_L*` must disappear even if .18 remains.

9. **AI4DEV-55 did not write a `pending-ledger.txt`.** The convention files exist for 57, 58, 59, 60, 62, 65. D5 still removed `D5_L2` from `LEAF`. This parent run should write `loop/items/AI4DEV-56/pending-ledger.txt` as a new historical record listing what remains (18, and 24 if still capability-pending). Do not edit 62 or 65.

10. **Operator Givens are the only way to seat a `member`.** `_contract.ts` 658–661: nothing in the product writes `'member'`. Transfer/recovery tests that need a second NGO account or a platform admin must use `provisionPlatformAdmin` / `register*` + `completeSignup`, not invent a product invite.

11. **RM-14 says v1 has only active/deactivated.** A third `suspended` state is v1.5. D6.L2 must not invent `suspended`.

12. **Virtual-key revocation in AT-001.30 is a cross into a requirement with no `supabase/` code.** Building a real gateway here would be landing REQ-009 early. The last merge’s declared-red precedent is `capability-pending` on a named capability. Brief fact 7: ask the founder before the design arena.

13. **Sign-in rate limit AT-001.34 is the same local-CLI problem as unit 6.** Brief fact 9 and `decisions.tsv` 2026-09-06T05:29:45Z: local GoTrue did not honour `sign_in_sign_ups`; 45 grants in 0.7 s, none 429. Unit 6’s record decides whether unit 3 can prove .34 locally at all.

14. **PR body may name AT-001.25 etc.** Those are acceptance ids, not Linear ids. The CI regex is `AI4(DEV|PM)-[0-9]+` only. Naming `AI4DEV-68` in the body **will** fail CI and move that item.

15. **Doc-sync assemble bans the word “secure”.** NFR heading is “Security”; body text avoids the banned whole word `secure`. New REQ/AT prose must not introduce banned words (`assemble-pure.ps1` 24–28).

16. **Adding a SUT member is three files, not `suite-adapters.ts`.** `_contract.ts` + `_fixture.ts` + `_live.ts`. A new **suite** would be one `AdapterModules` line plus `export const requirement`.

17. **Loop green ≠ integration green.** README of expected manifests: an id green at loop and red at integration is normal. Integration reds for missing OAuth/Discovery already exist; D6 ids are currently `sut-missing` at **both** tiers.

18. **Architecture notes still say two-layer roles stay in the schema** so v1.5 multi-member needs no migration (RM-12). Transfer that destroys `org_memberships` history would fight that.

### Open Questions

- I could not find the original Linear comment “For 73 no unlink.” in-repo. The only in-tree record of those exact words is `loop/items/AI4DEV-56/brief.md` line 155, attributed to a 2026-08-09 comment on the decision item under the authentication root. `loop/state/decisions.jsonl` has no matching row. Provenance for the quote is the brief, not `decisions.jsonl`.
- Where AT-001.41’s manifest leaf should sit (new D1.L3 vs a new deliverable vs accidentally stuffing D6) is a fold decision. The board hangs unit 5 under the authentication root, not under D6. `check-tree` only requires some `verify:` line to own it.
- Whether AT-001.28’s concierge moment and AT-001.30/31’s key clauses are built, stubbed, or declared `capability-pending` is a founder question the brief already flags (facts 7–8). I did not see a recorded founder answer in `decisions.tsv` beyond the measure rows for units 4 and 6.
- Whether REQ-001 pure text must change for unlink, or only the AT file, is unsettled until the fold classifies it. AT-001.08’s retirement argues the PRD currently has no linking policy, so a pure-section edit is the honest path if permanence is product meaning.
- I did not trace Linear MCP item descriptions or sync-stamps live; doc-sync step 7’s Linear write is a later-station act, not a current-tree fact.
- I did not re-read every earlier pending ledger (57–60) beyond 62 and 65; the convention is consistent in those two and in `_pending.ts`’s citation list.