# Changelog: Claude Code Toolkit

All notable changes to this module are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the module uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-10

### Added

- Skills: `conventional-commit` (model-invocable) and `changelog-entry`
  (manual `/changelog-entry` only).
- Subagents: `security-reviewer` (read-only) and `docs-writer`.
- Hooks: `block-dangerous-bash` and `protect-secret-files` (PreToolUse),
  `notify-macos` (Notification, local only).
- `settings.example.json` hook wiring and a `CLAUDE.md` project template.
