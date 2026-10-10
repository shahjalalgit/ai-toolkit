# Security model

How AI Toolkit limits risk, and what module authors and users must do. To
report a vulnerability, see [SECURITY.md](../SECURITY.md).

## Principles

1. **Least privilege.** Modules read only what they are given, write only
   where told, and declare permissions in `module.json`.
2. **Local by default.** No module makes network requests, sends messages or
   notifications to third-party services, or schedules background work.
3. **Data, not code.** Manifests, install records and module inputs are
   parsed and validated, never executed.
4. **No silent changes.** Every write is reported; existing files are
   preserved unless `--force` is given; `--dry-run` shows the plan first.
5. **Bounded and observable automation.** AI workflows have explicit
   checkpoints and attempt limits; scripts have clear exit codes and output.

## Threats and controls

| Threat | Control |
| --- | --- |
| Malicious or mistaken manifest runs code on install | No command fields; unknown fields rejected; `tests` is a directory run with a fixed `node --test` command |
| Path traversal writes outside the project | Relative, normalised paths only; `..` and absolute paths rejected; real-path check on every write; symlinks rejected |
| Installer overwrites user work | Checksum ownership records; `skip` by default; `--force` explicit; uninstall keeps edited files |
| Tampered install record deletes arbitrary files | Record paths validated; deletion only when checksum matches |
| Remote code execution via `curl \| bash` | Not used anywhere; the `block-dangerous-bash` hook blocks it in Claude Code sessions |
| Secrets committed or read by an AI agent | `.gitignore` excludes `.env*`, keys; `protect-secret-files` hook; no real credentials in samples |
| Customer data in logs | Sample data is synthetic; e-commerce reports contain SKUs and titles only |
| Prompt injection through files an agent reads | Read-only reviewer agents; side-effecting skills are manual-only and have human checkpoints |

## Limits you should know about

- The Claude Code hooks are pattern-based guardrails, not a sandbox. Use
  Claude Code permission rules and its sandbox for hard isolation.
- Hooks fail open if `jq` is missing (they report a non-blocking error).
- `permissions` in a manifest are declarations for review, not runtime
  enforcement.
- Modules you install are copied as-is. Review them (or run `--dry-run` and
  read the files) before committing them to a shared repository.

## Secret management

- Never put real secrets in the repository, examples, tests or issue reports.
- If a future module needs a secret, read it from an environment variable
  declared in `module.json` `env`, document the minimum scopes, and provide a
  `.env.example` with obviously fake values (for example
  `EXAMPLE_API_TOKEN=replace-me`).
- Keep real values in `.env` (git-ignored), your shell profile, or the macOS
  Keychain (`security find-generic-password -w -s <name>`).
- Rotate any secret that was committed, even briefly; removing it from git
  history is not enough.

## Rules for module authors

- Externally visible actions (messages, notifications, writes to SaaS tools,
  store updates) require explicit configuration **and** confirmation at run
  time.
- Do not download and execute code. Pin dependencies when you must add them.
- Never print secrets or personal data; redact in error messages.
- Default to `--dry-run`-style previews for anything that modifies state.
