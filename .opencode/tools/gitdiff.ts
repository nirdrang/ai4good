// gitdiff — the ONE thing a caged reviewer cannot do for itself.
//
// WHY THIS EXISTS. The reviewer cage removes every write- and execute-capable tool and keeps
// read, grep and glob (see ../agent/reviewer-flash.md). Those three answer "what does this file
// say"; they cannot answer "what did this change touch", because a diff is not a file — it is a
// computation over two commits, and the worktree's `.git` is a pointer into a directory outside
// the launch root, which the runtime refuses to read. So every scope-shaped claim an item makes
// about itself ("the source change is exactly these files") was ungradeable by this seat, twice
// measured, and the audit panel silently degraded to one sighted reader on exactly the claims the
// re-run exists to check.
//
// WHAT IT DOES NOT GRANT. The model gets no shell. It supplies a mode, a commit range, and at
// most one path; git runs from THIS process with an argv array — never a command line — so a
// hostile string is an argument, not a command. Measured 2026-08-12: range "HEAD; rm -rf ."
// returned git's "unknown revision" error and deleted nothing.
//
// The pathspec magic that would let the model escape (`:(exclude)`, `:!`) is rejected on input.
// The only `:` git ever sees is in SCOPES below, written here by hand, which is why those are
// safe and a model-supplied one is not.
import { tool } from "@opencode-ai/plugin"
import path from "path"

// A range is hashes only. Branch names are deliberately unsupported: a review is graded against a
// PINNED commit, and a name can move under the reviewer mid-run.
const RANGE = /^[0-9a-fA-F]{7,64}(\.{2,3}[0-9a-fA-F]{7,64})?$/
const MAX = 200 * 1024

// AUTHOR-WRITTEN PATHSPECS, never model input. `:(top)` anchors each one at the worktree root, so
// containment holds by construction. "source" is the question an audit actually asks; the repo
// also carries the item's own evidence under loop/, which swamped a real measurement at 71 files
// of which about 55 were evidence.
// An exclude-only pathspec already means "everything except this" - git needs no positive
// partner. Measured 2026-08-12 on a real range: `:(top,exclude)loop` alone gives the 16 non-record
// files, while pairing it with a `:(top).` positive gives an EMPTY diff, because `.` matches
// nothing under top anchoring. The empty answer is the dangerous one - it reads as "no source
// changed" - so this form is pinned by measurement, not by taste.
const SCOPES = {
  source: [":(top)src", ":(top)supabase", ":(top)tests"],
  "no-evidence": [":(top,exclude)loop"],
}

export default tool({
  description: [
    "Read-only pinned git diff. Three output shapes:",
    '  { mode: "stat", range }         -> git diff --stat <range>',
    '  { mode: "name-status", range }  -> git diff --name-status <range>',
    '  { mode: "path", range, path }   -> the full diff of ONE path',
    "<range> is a commit hash, or hash..hash / hash...hash. Branch names are not accepted.",
    'Narrow with EITHER scope OR path, never both:',
    '  scope "source"      -> only src/, supabase/, tests/',
    '  scope "no-evidence" -> everything except loop/ (the item records)',
    '  path <relative path> -> that path only; plain paths only, no pathspec magic',
    "Output is truncated at 200 KB and says so.",
  ].join("\n"),
  args: {
    mode: tool.schema.enum(["stat", "name-status", "path"]),
    range: tool.schema.string().regex(RANGE, "commit hash or hash range"),
    path: tool.schema.string().optional(),
    scope: tool.schema.enum(["all", "source", "no-evidence"]).optional(),
  },
  async execute(args, context) {
    if (args.mode === "path" && !args.path) return "error: path mode requires a path argument"
    if (args.path && args.scope && args.scope !== "all") {
      return "error: scope and path are mutually exclusive - narrow by one or the other"
    }

    const root = context.worktree ?? context.directory
    const argv = ["git", "--no-pager", "-c", "core.quotepath=false", "diff"]
    if (args.mode === "stat") argv.push("--stat")
    if (args.mode === "name-status") argv.push("--name-status")
    argv.push(args.range)

    if (args.path) {
      const p = args.path
      // `-` would be read as an option; `:` opens pathspec magic, which `--` does NOT disable.
      if (p.startsWith("-") || p.includes(":")) return "error: path must be a plain relative path"
      const resolved = path.resolve(root, p).toLowerCase()
      if (!resolved.startsWith(root.toLowerCase() + path.sep)) return "error: path escapes the worktree"
      argv.push("--", p)
    } else if (args.scope && args.scope !== "all") {
      argv.push("--", ...SCOPES[args.scope])
    }

    const proc = Bun.spawn(argv, { cwd: root, stdout: "pipe", stderr: "pipe" })

    // READ WITH A CAP AND KILL THE CHILD — do not buffer the whole stream and slice afterwards.
    // Buffering first is the exact shape that kills this runtime: the grep tool's own size guard
    // fires only after a record is fully in memory, and a megabyte-long line took four runs down
    // on 2026-08-11 (loop/drills/records/opencode-crash-diagnosis-2026-08-11.md). A cap that runs
    // after the damage is not a cap.
    const reader = proc.stdout.getReader()
    const decoder = new TextDecoder()
    let out = ""
    let truncated = false
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out += decoder.decode(value, { stream: true })
      if (out.length > MAX) {
        truncated = true
        proc.kill()
        break
      }
    }

    if (truncated) {
      return out.slice(0, MAX) + "\n...[TRUNCATED at 200 KB, stream aborted - narrow with scope or path]"
    }

    const exit = await proc.exited
    if (exit !== 0) {
      const err = await Bun.readableStreamToText(proc.stderr)
      return `git exited ${exit}:\n${err.slice(0, 4000)}`
    }
    return out.trim() || "(empty diff)"
  },
})
