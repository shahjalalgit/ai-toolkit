---
name: changelog-entry
description: Add an entry to CHANGELOG.md under the Unreleased section in Keep a Changelog format, based on the current branch's changes.
disable-model-invocation: true
---

# Changelog entry

Add an entry for the change described in `$ARGUMENTS` (or, if empty, for the
current branch's commits relative to the default branch).

1. Find the nearest `CHANGELOG.md` (module-level first if the change is inside
   `modules/<name>/`, otherwise the repository root). If none exists, ask
   before creating one.
2. Read it and keep its existing format. Entries go under
   `## [Unreleased]`, grouped as `### Added`, `### Changed`, `### Deprecated`,
   `### Removed`, `### Fixed` or `### Security`. Create the heading if missing.
3. Write user-facing entries: what changed for the user, not how the code
   changed. One line per change, imperative or past tense to match the file.
4. Show the diff of `CHANGELOG.md` and stop. Do not bump versions or create
   release headings unless asked.
