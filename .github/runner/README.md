# The self-hosted runner

The required `verify` check executes in about ten seconds. On 2026-08-06 it spent eleven to
fifteen minutes queueing for GitHub-hosted capacity, and **twice the job's own timeout expired
before a single step ran** — reported as `cancelled`, which reads as though a human stopped it.
This directory is the fix: a Linux container on the developer's machine that picks the job up in
seconds.

## Start it

```powershell
pwsh .github/runner/start.ps1
```

That builds the image if needed, mints a short-lived registration token, starts the container, and
**waits to confirm the runner is actually online** rather than assuming. It is idempotent.

Then route the check to it:

```powershell
gh variable set CI_RUNNER_LABEL --body 'ai4good-linux' --repo nirdrang/ai4good
```

## Fall back to hosted, with no code change

```powershell
gh variable delete CI_RUNNER_LABEL --repo nirdrang/ai4good
```

**This is the most important property here.** `runs-on` reads a repository variable instead of a
literal label, because `verify` is the only licence to merge. If it were hardcoded, recovering
from a broken runner would require editing the workflow, which requires a pull request, which
requires the check — the runner that just broke. One variable breaks that loop.

## The decisions, and what they cost

**Linux, not the Windows host.** The check's value is that it judges the code on Linux. This
project has already produced a green Windows run on a head whose Linux CI failed, and that is the
evidence that ended interim mode. A runner on the developer's own OS would discard that while
still looking like a check. The base image tracks what `ubuntu-latest` resolves to.

**This repository is PUBLIC, so the approval policy is what keeps the runner safe.** Anyone can
fork a public repository and open a pull request, and GitHub runs the workflow *as that pull
request defines it* — so without a gate, a stranger's code would execute on the developer's
machine. The gate is the repository's fork-PR approval policy, set to **`all_external_contributors`**:
every pull request from every fork waits for a human to approve the run, no matter how often that
person has contributed before. GitHub's own default is only `first_time_contributors`, which lets a
returning outsider run workflows unapproved; that gap is why the policy is set explicitly.

**`start.ps1` refuses to register the runner unless that policy is in place.** It is a precondition
checked at start, not a line in this document, because a setting nobody re-verifies is exactly the
kind of guarantee that decays without anyone noticing.

**What this does and does not protect.** Nothing from outside runs here without a deliberate
approval click. It does *not* protect against approving a hostile pull request without reading it —
that click is the whole boundary. And it does not gate branches inside this repository: anything
with write access runs immediately, which is correct, because write access is already full trust.
The honest description of the boundary is therefore *everything with write access to this
repository can run code on this machine*, and that means the owner plus any agent acting with the
owner's credential.

**Why not just make it private, where fork pull requests cannot exist at all?** Because on a free
personal plan, a private repository **loses branch protection entirely** — both classic protection
and rulesets answer `Upgrade to GitHub Pro or make this repository public to enable this feature`.
That would delete the required `verify` check, which is this project's only merge licence. Measured
on 2026-08-06 by doing it: protection was not merely hidden but **deleted**, and had to be restored
from a config captured beforehand. Private plus an enforced gate plus a self-hosted runner needs
GitHub Pro; the free path is public plus this approval policy.

**If this repository is ever made private again:** the runner is fine — safer, in fact — but the
merge gate will vanish. Restore protection first or accept that nothing enforces the check.

**Every tool is listed, because a bare runner has none.** A hosted image ships hundreds of
preinstalled tools; the runner tarball ships none. That gap is the usual reason a self-hosted
migration fails in a confusing way, so the Dockerfile traces each package to the step that needs
it — `git` for checkout, `curl`/`unzip` for the bun setup action, and `gh` for the two guard steps
that call `gh api`. **If a future workflow step reaches for a tool that isn't there, the fix is a
line in the Dockerfile, not a `sudo apt-get install` inside the workflow** — a step that installs
its own dependencies is a check whose environment nobody can reproduce.

**No Docker socket is mounted.** Nothing in `ci.yml` builds or runs a container, and mounting the
socket would hand every workflow root on the host. That is the usual way a self-hosted runner
becomes the weakest thing in a system.

**Pinned by version and by hash.** The runner tarball's SHA256 is verified at build time against
the value published in its release notes.

**One long-lived runner, not one per job — a deliberate simplification.** An ephemeral runner
(`--ephemeral`, a fresh container per job) is the stronger isolation, because a job cannot leave
anything behind for the next one. It needs a credential living inside the container so it can
re-register itself after every job, and that is a real secret-handling decision rather than a
detail. For a single-developer private repository the residual risk is one workspace shared
between this repository's own jobs. Recorded here rather than hidden, and this is the upgrade path
if the repository ever gains collaborators.

**State lives in a named volume** (`ai4good-runner-state`). Registration tokens expire in about an
hour, so if the registration were not persisted, every restart would need a fresh token minted by
someone present. With the volume, `docker start` is enough.

## When something is wrong

```powershell
docker logs ai4good-runner            # what the runner itself says
docker ps -a --filter name=ai4good-runner
gh api repos/nirdrang/ai4good/actions/runners   # does GitHub think it is online?
```

**A job that queues forever means no runner matches the label.** Either the container is down or
`CI_RUNNER_LABEL` names a label nothing carries. Clear the variable to get moving again, then
diagnose without a merge blocked behind it.

**To rebuild from nothing:**

```powershell
docker rm -f ai4good-runner; docker volume rm ai4good-runner-state
pwsh .github/runner/start.ps1 -Rebuild
```

Removing the volume discards the registration, so the next start mints a new token and registers
again under the same name (`--replace` handles the stale entry).
