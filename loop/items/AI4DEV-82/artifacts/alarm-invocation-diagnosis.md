# Diagnosis — how `window-alarm.cmd` behaves when invoked the way the hook entry spells it

Run by the FIX AND GOAL executor under ADDENDUM 2, step 1: cheap local diagnosis, no model calls.

**Outcome: the addendum's hypothesis is DISPROVEN, and the fix it proposed would have made things
worse.** Nothing was changed in `.claude/settings.json`. Reported to the orchestrator instead, per
bound 4.

## The claim under test

The addendum reasoned that every entry naming an interpreter fired and the only two naming none did
not, because "a hook command runs through a shell, and on Windows that shell is a POSIX `sh`, in
which backslashes are escape characters and a `.cmd` file is not an executable format at all." The
orchestrator has since marked that mechanism as a HYPOTHESIS rather than a fact, because it could
not verify it.

The prediction that follows: the bare quoted path fails under `sh`, and `cmd /c "<path>"` fixes it.

**WHICH SHELL THE HOOK RUNNER USES IS NOT ESTABLISHED HERE, and nothing below claims otherwise.**
Two shells were tested because they are the two that exist on this machine and can be positively
identified. The `bash` on `PATH` is
`C:\Users\nirdr\AppData\Local\Microsoft\WindowsApps\bash.exe`, a WSL stub that mangles Windows
paths; it was NOT used for anything, precisely because whatever it reports would be noise. The
`sh` used below is Git Bash's own, at `C:\Program Files\Git\bin\sh.exe`. **It is a real POSIX
shell and it is NOT the WSL stub — but it is not proven to be the hook runner's shell either.**
The findings are therefore stated as "under every shell that could actually be tested", never as
"under the hook runner".

## First measurement — which was WRONG, and is recorded because it was believed for a minute

Passing the command to `sh -c` through PowerShell's `Start-Process -ArgumentList` produced:

```
/usr/bin/bash: line 1: C:UsersnirdrDownloadsai4good.claude...window-alarm.cmd: command not found
exit 127
```

Every backslash is gone. That looks exactly like the predicted failure, and it is not one. **The
backslashes were eaten by PowerShell's native-argument re-quoting before `sh` ever saw the
string** — the identical hazard this item already recorded twice (the hook measurement's mangled
JSON payload, and the note in the drill's header that hook input arrives by file and never as a
quoted argument). The instrument was broken, and a broken instrument and a true absence produce
identical output.

## Second measurement — the command written to a file, so no re-quoting can touch it

Each line below was written to a `.sh` file and run as `sh <file>`, with `AI4GOOD_WINDOW_DIR`
pointing at a temporary directory holding an over-the-line verdict line.

| form | what it is | exit | what came back |
|---|---|---|---|
| **A** | `"<path>"` — the CURRENT entry, verbatim | **2** | `ALARM WINDOW five_hour at 95% ...` on **stderr** |
| **B** | `cmd /c "<path>"` — the PROPOSED fix | **0** | the cmd banner on stdout, **no alarm line, silent** |
| **B2** | `cmd //c "<path>"` | 2 | `ALARM WINDOW five_hour at 95% ...` on stderr |
| **C** | `cmd /c "<path>"` direct from PowerShell (control) | 2 | `ALARM WINDOW five_hour at 95% ...` on stderr |

## What this establishes

**A. The bare quoted path WORKS under every shell that could actually be tested.** Git Bash's `sh`
resolves and runs the `.cmd` file, exits 2, and puts the line on stderr — the exact contract the
entry needs. `cmd` runs it too (control C). No shell was found in which the current entry string
fails; the one apparent failure was this file's own broken instrument. So the command string is not
a demonstrated cause of the alarm not delivering, and **ADDENDUM 2's bound 4 applies: if the bare
form works when properly invoked, stop, fix nothing, report.**

**B. The proposed fix is silently broken under one of the two shells, and that is the dangerous
direction.** Under Git Bash `sh`, `cmd /c "<path>"` exits **0 with no output**: MSYS path-mangling
rewrites the `/c` switch into a Windows path, so `cmd` never receives `/c`, starts interactively,
reads EOF and exits clean. An alarm hook that exits 0 silently is indistinguishable from
`verdict OK`. That is precisely the "looks like a clear window when it is not" failure this whole
item exists to remove, and it would have passed a re-measured overhead check at about 35 ms,
because a `cmd` that does nothing is fast.

This does not prove the fix would break in production — the hook runner's shell is unidentified. It
proves the fix is **conditional on a shell nobody has established**, and that one of its two
outcomes is invisible. Swapping a checkpoint that demonstrably does not deliver for one that might
exit 0 silently is not an improvement that can be verified by looking.

`cmd //c` survives the mangling under `sh`, but only by depending on which shell runs it — the same
unproven dependency, pointing the other way.

## What is still unexplained, and is NOT investigated further here

The alarm entries still delivered nothing in the probe re-run while every other entry fired. Since
the command string works under both shells, the cause lies elsewhere — whether `PostToolUse` and
`PostToolUseFailure` are dispatched at all in a headless `-p` run, or whether an exit-2 stderr is
surfaced to the model there. ADDENDUM 2 bound 4 forbids characterizing the runtime without a
ruling, so that stops here and goes back to the orchestrator.

## Method note, because it is the whole lesson

The first measurement agreed with a plausible hypothesis and was false. The second used a different
instrument — the command on disk instead of through an argument array — and reversed it. Had the
first been believed, the fix would have shipped, the probe might well have stayed red, and the
record would have carried a confident and wrong causal story.
