The design does not yet justify “never lost” or “never applied twice.” Its largest gaps are between publishing a GitHub commit and recording its effects in SQL.

These are counterexamples to the written design, not reproduced implementation bugs. I checked the API claims against official documentation; I made no live GitHub calls and edited no files. Line references below refer to [design.md](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-166/loop/items/AI4DEV-166/design.md).

1. **High — A repository writer can forge recovery authority.** Lines 84–89.

   **Sequence:** A legitimate turn stages text and state effects. Someone with repository access pushes different text with `PRD-Turn: <that turn id>`. Recovery matches the trailer and treats the push as the AI’s successful commit. It can apply the legitimate turn’s state effects to text that turn never prepared.

   This contradicts the ruling that repository files never enforce platform rules. A commit message is equally untrusted.

   **Smallest fix:** Extend `prd_tool_commits` to persist an immutable prepared operation: project, turn, attempt, base, exact files/tree and state effects. With the REST approach, register the created commit SHA **before** publishing its ref. Recovery accepts only that registered commit; the trailer is a lookup hint.

2. **High — Lease expiry permits a late worker to move the database backward.** Lines 79–84.

   **Sequence:** Chat A publishes commit A, then pauses before SQL recording. Its lease expires. Chat B recovers A, publishes B on top, and records B. Chat A resumes and calls `prd_commit_record(A)`. Nothing specified prevents it from replacing the database head with A or releasing B’s lease.

   One branch having one head does not imply one request is in flight.

   **Smallest fix:** Give every lease acquisition a generation and owner. Recording and releasing must compare that generation and the expected database head. A stale worker may report its outcome, but cannot change current state. Lease expiry must trigger recovery of the outstanding operation, not erase it.

3. **High — The AI’s own webhook can consume its commit before recovery does.** Lines 82–89.

   **Sequence:** GitHub accepts an AI commit. Its webhook arrives before `prd_commit_record`. The webhook imports it as `repository` and advances the database head. The edge then crashes. The next prepare finds equal GitHub and database heads, so the stated “head ahead” recovery never runs. The text exists, but the turn’s staged questions, transitions or other effects remain unapplied.

   A retry can also create another physical commit if the turn still appears uncommitted.

   **Smallest fix:** Make the webhook, normal response and crash recovery use the same idempotent finalizer. Recognize registered platform commits before generic repository imports. Enforce uniqueness for both the successful turn and the imported repository commit.

4. **High — A timeout is neither `committed` nor `moved`.** Lines 69–84.

   **Sequence:** GitHub accepts the ref update, but the response is lost. The caller reports failure and permits retry. Retry creates a new commit on top of the accepted one, producing two commits for one reply. Alternatively, recording is abandoned and the accepted commit’s SQL effects never happen.

   The two-result `commitFiles` contract cannot represent this outcome.

   **Smallest fix:** Add an explicit uncertain outcome backed by the prepared operation. Reconcile its known candidate SHA before rebuilding, retrying or declaring failure. Separately represent authentication, rate-limit and validation failures; a `422` does not necessarily mean another writer moved the branch. [GitHub reference API](https://docs.github.com/en/rest/git/refs#update-a-reference).

5. **High — Concurrent imports can permanently restore an older read copy.** Lines 86–89.

   **Sequence:** Importer A reads database head H and GitHub head A, then pauses. Another push creates B. Importer B reads H, imports B and records it. Importer A resumes and records A. GitHub remains at B, while the database remains at A until another repair trigger occurs.

   Replayed deliveries can also repeat state effects and sequence increments unless import identity is constrained. GitHub explicitly allows out-of-order webhook delivery. [GitHub webhook troubleshooting](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks).

   **Smallest fix:** Import with an expected database head, checked transactionally. On mismatch, discard the prepared import and reconcile again. Treat deliveries as reconciliation requests, not instructions to install their historical `after` SHA. Reimporting an already applied commit must do nothing.

6. **High — External imports omit the PRD revision and manifest update.** Lines 46, 53 and 89.

   **Sequence:** Revision 7 has a completion check. A human changes a topic. Import writes a new section version, changes its state, increments the snapshot sequence and advances the GitHub head—the listed operations—but leaves `current_revision` and its manifest unchanged.

   The existing snapshot reads section documents through that manifest. It can therefore continue showing the old text. The revision-7 completion check also remains reusable against changed content. See the [existing snapshot join](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-166/supabase/migrations/20261023120000_prd_record.sql:520).

   **Smallest fix:** Specify that a content-changing import atomically creates a complete new manifest and PRD revision, advances `current_revision`, and performs the normal dependent-topic and recommendation invalidation. Merely changing confirmations is insufficient.

7. **High — A missed webhook can leave GitHub and the workspace different indefinitely.** Lines 84–95.

   **Sequence:** Someone pushes to `prd/`. The webhook fails. Nobody subsequently commits through the tools. Both humans keep reading the workspace; reconnect and focus fetch only SQL snapshots. GitHub contains the new text, but the workspace never imports it.

   GitHub does not automatically redeliver failed webhooks. [GitHub failed-delivery documentation](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries).

   **Smallest fix:** Add reconciliation independent of an AI commit: a background reconciliation request on load, plus scheduled recovery for missed deliveries. Reads can still return the cached snapshot immediately.

8. **High — `force: false` is not an expected-head comparison.** Lines 69 and 79–84.

   **Sequence:** The AI prepares on B, whose parent is A. An administrator resets `main` to A. The AI publishes C, whose parent is B. Moving A to C is a fast-forward, so `force: false` permits it. The AI silently restores B and lands a reply prepared against a history the administrator removed.

   The REST claim is correct for ordinary competing forward pushes, but it does not provide the compare-and-swap claimed in the investigation. [GitHub reference API](https://docs.github.com/en/rest/git/refs#update-a-reference).

   **Smallest fix:** Use publication with an explicit expected old head, such as GraphQL `createCommitOnBranch(expectedHeadOid: ...)`, or make enforced prevention of rewrites a precondition. Separately handle an observed rewrite by rebuilding from the actual target tree.

9. **High — Missing `main` has no recovery state.** Lines 67–89.

   **Sequence:** An administrator changes the default branch, then deletes `main`. This avoids GitHub’s usual protection against deleting the current default branch. The next `head` or ref update fails. There is no valid `to` commit for import, and repeatedly preparing cannot repair it.

   **Smallest fix:** Define a repository-unavailable state that blocks publication and reports the missing branch. Require an explicit restoration target; do not automatically recreate `main` from a stale database head.

10. **High — Opening is not idempotent once the first commit is followed by another push.** Lines 71–76.

    **Sequence:** The opening commit succeeds. The edge crashes before `finish`. A person pushes an edit. The retry now finds `main` holding different files. The stated no-op condition is false. It either writes the opening files again, destroying the edit, or cannot finish the pending open.

    **Smallest fix:** Persist an opening operation and its registered initial commit SHA. Recover that commit even when it is an ancestor of the current head. Finish opening once, then reconcile later pushes. Freeze the opening payload across retries.

11. **High — Repository names do not establish repository ownership.** Lines 73–76.

    **Sequence:** Two project identifiers share the chosen short prefix and have the same slug. The first repository already exists. `ensureRepo` reuses it for the second project. The second project’s PRD can be written into a repository whose collaborators belong to the first.

    A slug change between repository creation and retry can instead create two repositories for one project.

    **Smallest fix:** Persist the chosen name when opening begins, use the full project identifier, and bind the project to GitHub’s immutable repository ID. Reuse only a repository whose project binding and owner have been verified.

12. **High — The documented Git-data path does not bootstrap an empty repository.** Lines 29 and 69–76.

    **Sequence:** `ensureRepo` creates an empty repository. The edge creates Git objects, then tries to establish `main`. GitHub’s documentation says creating a reference in an empty repository is unsupported, even if the commit object exists. Opening remains pending. [GitHub reference creation](https://docs.github.com/en/rest/git/refs#create-a-reference).

    **Smallest fix:** Specify and prove the bootstrap path before building the remaining units. `auto_init: true` establishes a branch, but introduces a bootstrap commit before the PRD commit, which conflicts with the literal first-commit acceptance criterion. Preserving that criterion needs an explicit initialization procedure, such as a controlled replacement with the registered PRD root commit while the repository is still pending and unexposed.

    I have not tested whether GitHub behaves more permissively than its documentation here.

13. **High — Closing does not freeze imports or recover tag creation.** Unit 8 and lines 86–89.

    **Sequence:** SQL freezes revision 7. Before or after its tag is created, a delayed webhook imports another push, advances the current revision and changes topic states. The supposedly frozen workspace changes. Separately, a crash after SQL close but before tag creation leaves a closed PRD without its required tag.

    **Smallest fix:** Pin closed reads and downstream consumers to the frozen manifest and commit. Imports after close must not mutate that view. Persist tag creation as a retryable close operation; an existing tag succeeds only if it points to the exact frozen commit.

14. **Medium — Renames and deletions have no defined representation.** Lines 46 and 87–91.

    **Sequence:** Someone renames `prd/users.md` to `prd/current-users.md`. The old path disappears and the new path is “unknown” and shown on no topic. Reading the old path can abort import; ignoring its deletion leaves the old text visible. A later AI write can recreate the old file, leaving two copies.

    **Smallest fix:** Reconcile both removed and added paths. Preserve section identity across a recognized rename. Represent deletion explicitly as a missing section version requiring review. Define deterministic handling of duplicate or changed front-matter keys; they must not reassign platform authority.

15. **Medium — “Unreadable version” cannot pass through the current schema and reader contract.** Lines 46 and 63.

    **Sequence:** A human pushes malformed front matter. There is no parsed document, but `prd_section_versions.document` requires an object and the snapshot returns it as a normal document. Import either fails, invents a placeholder, or keeps the previous text. The AI’s next typed `read_section` also has no specified way to obtain the malformed text it must repair.

    **Smallest fix:** Define readable, unreadable and missing variants explicitly. An unreadable version needs its blob identity, raw read copy and diagnostic, exposed through a bounded repair read. Import the failure marker and head atomically rather than aborting the entire import.

16. **Medium — Blob identity cannot also identify an authorship event.** Line 46.

    **Sequence:** The AI introduces blob X. A human replaces it with Y, then restores the exact bytes of X. The existing X row still names the AI and the earlier introducing commit. Reusing it misattributes the human restoration; changing it violates immutability.

    **Smallest fix:** Keep immutable content keyed by section and blob, but put commit, actor and author kind on the revision occurrence. Alternatively, keep section-version rows per occurrence and let their blob SHA repeat.

17. **Medium — A diff API limit can make an incomplete import look complete.** Lines 67 and 87–89.

    **Sequence:** An outside push changes more than 300 files, including a topic omitted from the returned comparison. If `changedPaths` uses GitHub’s compare endpoint, it can miss that topic, then advance the database head anyway. Later comparisons start after the missed change.

    GitHub limits comparison results to 300 changed files; commit pagination does not remove that file limit. [GitHub comparison API](https://docs.github.com/en/rest/commits/commits#compare-two-commits).

    **Smallest fix:** Define completeness for `changedPaths`. For this small document set, compare the actual `prd/` trees at the two commits. Detect tree truncation and fetch subtrees when necessary.

18. **Medium — A removed member can keep receiving sequence numbers.** Line 93.

    **Sequence:** An NGO member joins while authorized. Their membership is removed. Another person changes the PRD. The removed member’s existing connection still receives the ping and sequence number.

    Supabase caches authorization until refresh or expiry; it does not evaluate membership for every broadcast. [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization#updating-rls-policies).

    **Smallest fix:** Include an access-generation value in the channel identity and rotate it transactionally whenever project access changes. Publish future signals only to the new generation; its authorization must check both membership and generation. Short JWT lifetimes alone only bound the leak.

19. **Medium — The proposed Realtime policy cannot call the existing role function.** Line 93.

    **Sequence:** A legitimate developer joins a private channel. Its policy invokes `prd_role(project, auth.uid())` as `authenticated`. The current migration grants that function only to `service_role`, so authorization fails. See the [existing grants](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-166/supabase/migrations/20261023120000_prd_record.sql:884).

    **Smallest fix:** Add a narrowly granted authorization helper that derives the caller from `auth.uid()`, validates `realtime.topic()`, and checks current membership. Specify a receive-only `SELECT` policy for broadcast and client `config.private: true`. Do not broadly grant arbitrary-account role lookup.

20. **Medium — A missed Realtime ping has no bounded catch-up.** Line 93.

    **Sequence:** Both tabs remain connected and focused. A change commits, but one broadcast is missed. No later change, reconnect or focus event occurs. That tab stays stale indefinitely. “Costs at most one fetch” describes eventual repair cost, not when repair happens.

    **Smallest fix:** Either state that delivery is best-effort with catch-up on the named events, or add periodic server reannouncement of the latest sequence. Clients ignore equal numbers, so unchanged workspaces make no extra snapshot requests.

21. **Medium — The unit plan does not exercise the failure boundaries it relies on.** Lines 95 and 136–141.

    **Sequence:** The outside-edit test makes a push and deliberately calls prepare. It passes even though an idle second viewer never receives that edit. Happy-path commit tests also pass despite the webhook-before-record and late-worker races above.

    **Smallest fix:** Make the existing acceptance bodies include explicit subcases for:

    - Two chats changing the same topic and different topics.
    - Process interruption after prepare, object creation, ref publication and SQL recording.
    - Own webhook before recording, replayed delivery and reversed import completion.
    - Lease expiry with the old worker subsequently resuming.
    - Rewrite, missing branch, rename, deletion and malformed file.
    - Membership removal while subscribed.
    - Outside push becoming visible without either human taking an action.

    Use the real GitHub repository and controlled pauses around the shipped operations. Missing credentials may remain honestly pending, but a gate must not claim these cases green until they execute. The current expected-result manifest already distinguishes pending from green; preserve that distinction.

22. **Medium — The storage rework omits the transition for existing records.** Lines 46 and 132–137.

    **Sequence:** Unit 1 has created a record, immutable revisions and section versions without GitHub identities. The git-storage migration lands. Existing-open logic returns that record, while new commit preparation expects a repository and base commit. The project cannot publish through the new path.

    **Smallest fix:** Specify a resumable conversion for populated records: retain their manifests, create the repository baseline, attach its identities, and prevent normal publication until conversion finishes. Verify against a populated pre-change database, not only a clean reset.

**Simpler approaches that remain correct:**

- **Use GraphQL `createCommitOnBranch` for ordinary publication.** It creates the commit and advances the branch with an explicit `expectedHeadOid`, replacing the blobs/tree/commit/ref sequence. It still needs crash recovery; `clientMutationId` is not a documented deduplication guarantee. [GitHub GraphQL commit API](https://docs.github.com/en/graphql/reference/commits#createcommitonbranch).
- **Reconcile the small `prd/` tree directly.** This avoids changed-path limits and makes renames, deletions and rewrites explicit. Traverse history separately only where recovery or retained authorship requires it.
- **Use one commit finalizer.** Normal completion, webhooks, retries and recovery should converge through the same SQL operation.
- **Keep ordinary immutable section-version rows.** Repeating a blob SHA is inexpensive and simpler than making a content cache double as an authorship ledger.
- **Let SQL prepare typed documents and TypeScript render Markdown.** SQL can own authorization and state rules without knowing the file format.

The remaining API choices are feasible: Git-data endpoints support installation tokens; repository creation supports an installation token with suitable permissions; token issuance requires discovering or supplying the installation ID, and tokens expire after one hour. [GitHub installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), [repository creation](https://docs.github.com/en/rest/repos/repos#create-an-organization-repository).

`realtime.send(payload, event, topic, true)` with matching private-channel configuration and authorization on `realtime.messages` is also the right mechanism. The policy must supply project isolation. [Supabase broadcast documentation](https://supabase.com/docs/guides/realtime/broadcast).

Webhook verification must use HMAC-SHA256 over the original request bytes and constant-time comparison. A valid signature authenticates the payload; it provides neither replay protection nor delivery ordering. [GitHub signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries).