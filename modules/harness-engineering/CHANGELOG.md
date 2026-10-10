# Changelog: Harness Engineering

All notable changes to this module are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the module uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-10

### Added

- `ticket` gate: required sections, checklist acceptance criteria, vague
  wording warnings, unresolved placeholder detection.
- `contract` gate: OpenAPI 3.x (JSON) breaking-change detection.
- `requirements-analyst` and `independent-reviewer` Claude Code subagents.
- `harness-workflow` skill with human checkpoints and a 3-attempt fix loop.
- Ticket and completion checklist templates.
