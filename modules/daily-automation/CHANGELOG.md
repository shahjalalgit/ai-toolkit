# Changelog: Daily Automation

All notable changes to this module are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the module uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-10

### Added

- `daily-summary` CLI: Markdown summary (done today, in progress, blocked,
  overdue, due today, next up, notes) from a JSON task file.
- `run-daily-summary.sh` wrapper for schedulers; writes one dated file and
  never overwrites.
- launchd example plist (documentation only; never installed).
