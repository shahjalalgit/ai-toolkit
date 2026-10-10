# 0003: Checksum-based ownership for installed files

- Status: Accepted
- Date: 2026-10-10

## Context

Updates and uninstalls must not destroy local edits or files the toolkit did
not create. Without a record, the installer cannot tell its own files from the
user's.

## Decision

After installing, write `<target>/.ai-toolkit/state/<module>.json` containing
the module version and a SHA-256 checksum per installed file. A file may be
replaced or deleted without `--force` only if its current checksum matches the
recorded one.

## Consequences

- Repeated installs are idempotent; updates are safe by default.
- Uninstall can be implemented safely and never deletes edited files.
- If the state file is deleted, files become unowned: updates skip them and
  uninstall is unavailable until reinstalled. This is the safe failure mode.
- Files dropped from a newer module version are reported as `orphaned` and
  left in place rather than deleted.
