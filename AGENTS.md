# Instructions for AI coding agents

This file is for AI agents (Claude Code, Codex, others) working in this
repository. Humans should start with [README.md](README.md).

## What this repository is

A modular monorepo. Each directory in `modules/` is an independent module with
`module.json`, `README.md` and `CHANGELOG.md`. Modules never import each other.
The central CLI is `scripts/setup.sh` (implemented in
`scripts/lib/toolkit.mjs`).

## Commands

```bash
npm run validate                       # all checks; run before finishing any task
npm test                               # unit tests only
./scripts/setup.sh validate <module>   # one module's manifest and README sections
./scripts/setup.sh test <module>       # one module's tests
```

## Rules

- Node 22+, ES modules, standard library only. bash 3.2 compatible shell.
- Keep logic in pure, exported functions with tests in `modules/<id>/tests/`.
- Exit codes: 0 success, 1 check failed, 2 usage or I/O error.
- Every module README must keep the required `##` sections listed in
  [ARCHITECTURE.md](ARCHITECTURE.md#module-contract).
- Update the module `CHANGELOG.md` under `[Unreleased]` for behaviour changes.
- Documentation describes what is implemented. Planned work goes in
  `ROADMAP.md`.
- Do not add network calls, notifications, schedulers or writes to external
  systems without an explicit, documented opt-in.
- Never commit secrets or real customer data; use synthetic fixtures.
- Do not edit files under `tests/fixtures/` unless you are changing installer
  tests; they are intentionally invalid in places.
- Do not push, tag, publish or change GitHub settings unless asked.
